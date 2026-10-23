/**
 * Rive-shaped motion, exported as CSS and a small Web Animations runner.
 *
 * A machine is states (timeline keyframes), transitions (event + conditions),
 * and an easing that is either a cubic bezier or a spring. Springs are sampled
 * into keyframes because CSS has no spring function. The published runner is
 * a few hundred bytes and only ships when a transition needs it.
 */

import { Type, parseValue, type Static } from '@core/utils/typeboxHelpers'

export const MOTION_FILE_PATH = 'src/keijam/motion.json'

const MotionKeyframeSchema = Type.Object({
  timeMs: Type.Number({ minimum: 0 }),
  opacity: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  x: Type.Optional(Type.Number()),
  y: Type.Optional(Type.Number()),
  scale: Type.Optional(Type.Number({ minimum: 0 })),
})

const MotionEaseSchema = Type.Object({
  kind: Type.Union([Type.Literal('cubic'), Type.Literal('spring')]),
  x1: Type.Optional(Type.Number()),
  y1: Type.Optional(Type.Number()),
  x2: Type.Optional(Type.Number()),
  y2: Type.Optional(Type.Number()),
  stiffness: Type.Optional(Type.Number({ minimum: 1 })),
  damping: Type.Optional(Type.Number({ minimum: 0 })),
  mass: Type.Optional(Type.Number({ minimum: 0.01 })),
})

const MotionConditionSchema = Type.Object({
  input: Type.String({ minLength: 1 }),
  op: Type.Union([
    Type.Literal('eq'),
    Type.Literal('gt'),
    Type.Literal('lt'),
    Type.Literal('true'),
    Type.Literal('false'),
  ]),
  value: Type.Optional(Type.Union([Type.Number(), Type.Boolean(), Type.String()])),
})

const MotionStateSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  name: Type.String({ minLength: 1 }),
  durationMs: Type.Number({ minimum: 0 }),
  keyframes: Type.Array(MotionKeyframeSchema),
})

const MotionTransitionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  from: Type.String({ minLength: 1 }),
  to: Type.String({ minLength: 1 }),
  event: Type.Union([
    Type.Literal('hover'),
    Type.Literal('press'),
    Type.Literal('click'),
    Type.Literal('load'),
  ]),
  conditions: Type.Array(MotionConditionSchema),
  durationMs: Type.Number({ minimum: 0 }),
  ease: MotionEaseSchema,
})

export const MotionMachineSchema = Type.Object({
  initial: Type.String({ minLength: 1 }),
  inputs: Type.Array(Type.Object({
    name: Type.String({ minLength: 1 }),
    type: Type.Union([Type.Literal('boolean'), Type.Literal('number')]),
  })),
  states: Type.Array(MotionStateSchema),
  transitions: Type.Array(MotionTransitionSchema),
})

export const MotionDocumentSchema = Type.Object({
  version: Type.Literal(1),
  byNodeId: Type.Record(Type.String(), MotionMachineSchema),
})

export type MotionKeyframe = Static<typeof MotionKeyframeSchema>
export type MotionEase = Static<typeof MotionEaseSchema>
export type MotionCondition = Static<typeof MotionConditionSchema>
export type MotionState = Static<typeof MotionStateSchema>
export type MotionTransition = Static<typeof MotionTransitionSchema>
export type MotionMachine = Static<typeof MotionMachineSchema>
export type MotionDocument = Static<typeof MotionDocumentSchema>

const EASE_OUT: MotionEase = { kind: 'cubic', x1: 0.2, y1: 0, x2: 0, y2: 1 }

export function emptyMachine(): MotionMachine {
  return {
    initial: 'idle',
    inputs: [],
    states: [{ id: 'idle', name: 'Idle', durationMs: 400, keyframes: [] }],
    transitions: [],
  }
}

export function parseMotionDocument(raw: string | undefined): MotionDocument {
  if (!raw) return { version: 1, byNodeId: {} }
  try {
    return parseValue(MotionDocumentSchema, JSON.parse(raw))
  } catch {
    return { version: 1, byNodeId: {} }
  }
}

export function recordKeyframe(
  machine: MotionMachine,
  stateId: string,
  timeMs: number,
  sample: Omit<MotionKeyframe, 'timeMs'>,
): MotionMachine {
  return {
    ...machine,
    states: machine.states.map((state) => {
      if (state.id !== stateId) return state
      const next = state.keyframes.filter((frame) => frame.timeMs !== timeMs)
      next.push({ timeMs, ...sample })
      next.sort((a, b) => a.timeMs - b.timeMs)
      return { ...state, keyframes: next }
    }),
  }
}

/** Unit samples of a cubic bezier or a spring, for the curve editor. */
export function sampleEase(ease: MotionEase, steps = 24): number[] {
  const count = Math.max(2, steps)
  const samples: number[] = []
  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1)
    samples.push(ease.kind === 'spring' ? sampleSpring(ease, t) : sampleCubic(ease, t))
  }
  return samples
}

export interface MotionExport {
  css: string
  json: string | null
  script: string | null
}

export function motionAttributeValue(nodeId: string): string {
  return cssIdent(nodeId)
}

export function exportMotion(nodeId: string, machine: MotionMachine): MotionExport {
  const safeId = motionAttributeValue(nodeId)
  const cssRules: string[] = []
  const waapiTransitions: Array<Record<string, unknown>> = []
  for (const transition of machine.transitions) {
    const target = machine.states.find((state) => state.id === transition.to)
    if (!target) continue
    if (needsRuntime(transition)) {
      waapiTransitions.push({
        event: transition.event,
        durationMs: transition.durationMs,
        conditions: transition.conditions,
        frames: waapiFrames(target, transition.ease),
      })
      continue
    }
    const framesName = `kj-${safeId}-${cssIdent(target.id)}`
    const frames = keyframesCss(framesName, target)
    if (!frames) continue
    const hook = transition.event === 'hover' ? ':hover' : transition.event === 'press' ? ':active' : ''
    cssRules.push(frames)
    cssRules.push(
      `[data-kj-motion="${safeId}"]${hook}{animation:${framesName} ${Math.round(transition.durationMs)}ms ${cubicBezier(transition.ease)} both}`,
    )
  }
  const initial = machine.states.find((state) => state.id === machine.initial)
  if (initial && initial.keyframes.length > 0 && !machine.transitions.some((item) => item.to === initial.id)) {
    const framesName = `kj-${safeId}-${cssIdent(initial.id)}`
    cssRules.push(keyframesCss(framesName, initial))
    cssRules.push(
      `[data-kj-motion="${safeId}"]{animation:${framesName} ${Math.round(initial.durationMs)}ms ${cubicBezier(EASE_OUT)} both}`,
    )
  }
  const css = cssRules.join('')
  if (waapiTransitions.length === 0) return { css, json: null, script: null }
  return {
    css,
    json: JSON.stringify({ nodeId: safeId, transitions: waapiTransitions }).replace(/</g, '\\u003c'),
    script: WAAPI_RUNTIME,
  }
}

function needsRuntime(transition: MotionTransition): boolean {
  return transition.ease.kind === 'spring' || transition.event === 'click' || transition.conditions.length > 0
}

function keyframesCss(name: string, state: MotionState): string {
  if (state.keyframes.length === 0) return ''
  const duration = Math.max(state.durationMs, 1)
  const body = [...state.keyframes]
    .sort((a, b) => a.timeMs - b.timeMs)
    .map((frame) => {
      const percent = Math.max(0, Math.min(100, Math.round((frame.timeMs / duration) * 100)))
      return `${percent}%{${frameDecl(frame)}}`
    })
    .join('')
  return `@keyframes ${name}{${body}}`
}

function frameDecl(frame: MotionKeyframe): string {
  const parts: string[] = []
  if (frame.opacity !== undefined) parts.push(`opacity:${frame.opacity}`)
  const transform = transformOf(frame)
  if (transform) parts.push(`transform:${transform}`)
  return parts.join(';')
}

function transformOf(frame: MotionKeyframe): string {
  const parts: string[] = []
  if (frame.x !== undefined || frame.y !== undefined) parts.push(`translate(${frame.x ?? 0}px,${frame.y ?? 0}px)`)
  if (frame.scale !== undefined) parts.push(`scale(${frame.scale})`)
  return parts.join(' ')
}

function waapiFrames(state: MotionState, ease: MotionEase): Array<Record<string, unknown>> {
  const sorted = [...state.keyframes].sort((a, b) => a.timeMs - b.timeMs)
  if (sorted.length === 0) return []
  if (ease.kind !== 'spring') {
    const duration = Math.max(state.durationMs, 1)
    return sorted.map((frame) => ({
      offset: Math.max(0, Math.min(1, frame.timeMs / duration)),
      ...waapiProps(frame),
    }))
  }
  const end = sorted[sorted.length - 1]
  return sampleEase(ease, 12).map((amount, index, all) => ({
    offset: index / (all.length - 1),
    ...waapiProps(end, amount),
  }))
}

function waapiProps(frame: MotionKeyframe, amount = 1): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  if (frame.opacity !== undefined) props.opacity = frame.opacity * amount + (1 - amount)
  const transform = transformOf({
    timeMs: frame.timeMs,
    x: frame.x !== undefined ? frame.x * amount : undefined,
    y: frame.y !== undefined ? frame.y * amount : undefined,
    scale: frame.scale !== undefined ? 1 + (frame.scale - 1) * amount : undefined,
  })
  if (transform) props.transform = transform
  return props
}

function cubicBezier(ease: MotionEase): string {
  if (ease.kind !== 'cubic') return 'linear'
  const x1 = ease.x1 ?? 0.2
  const y1 = ease.y1 ?? 0
  const x2 = ease.x2 ?? 0
  const y2 = ease.y2 ?? 1
  return `cubic-bezier(${x1},${y1},${x2},${y2})`
}

function sampleCubic(ease: MotionEase, t: number): number {
  const y1 = ease.y1 ?? 0
  const y2 = ease.y2 ?? 1
  const u = 1 - t
  return (3 * u * u * t * y1) + (3 * u * t * t * y2) + (t * t * t)
}

function sampleSpring(ease: MotionEase, t: number): number {
  const stiffness = ease.stiffness ?? 320
  const damping = ease.damping ?? 34
  const mass = ease.mass ?? 1
  const omega = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))
  const time = t * 1
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta)
    return 1 - Math.exp(-zeta * omega * time) * (Math.cos(omegaD * time) + ((zeta * omega) / omegaD) * Math.sin(omegaD * time))
  }
  return 1 - Math.exp(-omega * time) * (1 + omega * time)
}

function cssIdent(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9_-]/g, '')
  return clean || 'node'
}

const WAAPI_RUNTIME = `const spec=document.getElementById('kj-motion');if(spec&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const items=JSON.parse(spec.textContent||'[]');for(const item of [].concat(items)){const el=document.querySelector('[data-kj-motion="'+item.nodeId+'"]');if(!el)continue;for(const transition of item.transitions){const play=()=>el.animate(transition.frames,{duration:transition.durationMs,easing:'linear',fill:'both'});if(transition.event==='load')play();if(transition.event==='click')el.addEventListener('click',()=>{if(passes(el,transition))play()});if(transition.event==='hover')el.addEventListener('pointerenter',play);if(transition.event==='press')el.addEventListener('pointerdown',play)}}}function passes(el,transition){return transition.conditions.every((condition)=>{const raw=el.getAttribute('data-kj-input-'+condition.input);if(condition.op==='true')return raw==='true';if(condition.op==='false')return raw!=='true';const value=Number(raw);if(condition.op==='gt')return value>Number(condition.value);if(condition.op==='lt')return value<Number(condition.value);return raw===String(condition.value)})}`
