/**
 * Animate mode: state list, transitions, a recordable timeline, and an easing curve.
 */

import { useState, type CSSProperties } from 'react'
import type { SiteFile } from '@core/files/schemas'
import { Button } from '@ui/components/Button'
import { Input } from '@ui/components/Input'
import { useEditorStore, selectActiveCanvasPage } from '@site/store/store'
import {
  MOTION_FILE_PATH,
  emptyMachine,
  motionAttributeValue,
  parseMotionDocument,
  recordKeyframe,
  sampleEase,
  type MotionEase,
  type MotionMachine,
  type MotionTransition,
} from '../../../../keijam'
import { readNodeLayout, layoutContextFor } from './layoutBridge'
import styles from './KeijamEditor.module.css'

const EMPTY_FILES: SiteFile[] = []

interface TimelineProps {
  playhead: number
  recording: boolean
  onPlayhead: (timeMs: number) => void
  onRecording: (recording: boolean) => void
}

export function KeijamAnimate(props: TimelineProps) {
  const page = useEditorStore(selectActiveCanvasPage)
  const selectedId = useEditorStore((state) => state.selectedNodeId)
  const node = selectedId && page ? page.nodes[selectedId] : undefined
  if (!node || node.id === page?.rootNodeId) {
    return <p className={styles.hint}>Select a layer to edit states and transitions.</p>
  }
  return <AnimateBody nodeId={node.id} {...props} />
}

export function KeijamTimeline(props: TimelineProps) {
  return (
    <div className={styles.timeline} aria-label="Timeline">
      <div className={styles.tabs}>
        <Button
          variant="secondary"
          size="xs"
          pressed={props.recording}
          aria-pressed={props.recording}
          onClick={() => props.onRecording(!props.recording)}
        >
          {props.recording ? 'Recording' : 'Record'}
        </Button>
        <Input
          aria-label="Playhead milliseconds"
          fieldSize="xs"
          type="number"
          value={String(props.playhead)}
          onChange={(event) => props.onPlayhead(Math.max(0, Number(event.target.value) || 0))}
        />
        {props.recording ? <Capture playhead={props.playhead} /> : null}
      </div>
    </div>
  )
}

function AnimateBody(props: TimelineProps & { nodeId: string }) {
  const machine = useMachine(props.nodeId)
  const [stateId, setStateId] = useState(machine.initial)
  const state = machine.states.find((item) => item.id === stateId) ?? machine.states[0]
  const ease = machine.transitions[0]?.ease ?? { kind: 'cubic' as const, x1: 0.2, y1: 0, x2: 0, y2: 1 }

  function commit(next: MotionMachine) {
    saveMachine(props.nodeId, next)
  }

  function addState() {
    const id = `state-${machine.states.length + 1}`
    commit({
      ...machine,
      states: [...machine.states, { id, name: `State ${machine.states.length + 1}`, durationMs: 400, keyframes: [] }],
    })
    setStateId(id)
  }

  function addTransition() {
    const to = machine.states.find((item) => item.id !== machine.initial)?.id ?? machine.initial
    const transition: MotionTransition = {
      id: `t-${machine.transitions.length + 1}`,
      from: machine.initial,
      to,
      event: 'hover',
      conditions: [],
      durationMs: 240,
      ease,
    }
    commit({ ...machine, transitions: [...machine.transitions, transition] })
  }

  return (
    <div className={styles.scroll}>
      <p className={styles.section}>States</p>
      <div className={styles.seg}>
        {machine.states.map((item) => (
          <Button
            key={item.id}
            variant="secondary"
            size="xs"
            pressed={item.id === state?.id}
            onClick={() => setStateId(item.id)}
          >
            {item.name}
          </Button>
        ))}
        <Button variant="ghost" size="xs" onClick={addState}>Add</Button>
      </div>
      {state ? (
        <p className={styles.hint}>
          {state.keyframes.length} keyframe{state.keyframes.length === 1 ? '' : 's'} over {state.durationMs}ms.
          {props.recording ? ' Record is on. Capture writes this state at the playhead.' : ''}
        </p>
      ) : null}
      <p className={styles.section}>Transitions</p>
      {machine.transitions.map((transition) => (
        <p key={transition.id} className={styles.hint}>
          {transition.from} → {transition.to} on {transition.event}
          {transition.conditions.length > 0 ? ` when ${transition.conditions.map((item) => `${item.input} ${item.op}`).join(', ')}` : ''}
          {' '}({transition.ease.kind})
        </p>
      ))}
      <div className={styles.field}>
        <Button variant="secondary" size="xs" onClick={addTransition}>Add hover</Button>
      </div>
      <p className={styles.section}>Easing</p>
      <Curve ease={ease} />
    </div>
  )
}

function Capture(props: { playhead: number }) {
  const selectedId = useEditorStore((state) => state.selectedNodeId)
  function capture() {
    if (!selectedId) return
    const store = useEditorStore.getState()
    const page = selectActiveCanvasPage(store)
    const node = page?.nodes[selectedId]
    if (!page || !node) return
    const machine = readMachine(selectedId)
    const state = machine.states[0]
    if (!state) return
    const rules = store.site?.styleRules
    const context = layoutContextFor(node, page.nodes, page.rootNodeId, rules, store.activeBreakpointId, true)
    const layout = readNodeLayout(node, rules, context, store.activeBreakpointId, true)
    saveMachine(selectedId, recordKeyframe(machine, state.id, props.playhead, {
      x: layout.x,
      y: layout.y,
      opacity: layout.opacity ?? 1,
      scale: 1,
    }))
  }
  return <Button variant="primary" size="xs" onClick={capture}>Capture</Button>
}

function Curve(props: { ease: MotionEase }) {
  const samples = sampleEase(props.ease, 24)
  return (
    <div className={styles.curve} role="img" aria-label={`${props.ease.kind} easing curve`}>
      {samples.map((sample, index) => (
        <span
          key={index}
          className={styles.curveBar}
          style={{ '--kj-curve': `${Math.max(1, Math.round(Math.min(sample, 1.25) * 32))}px` } as CSSProperties}
        />
      ))}
    </div>
  )
}

function useMachine(nodeId: string): MotionMachine {
  const files = useEditorStore((state) => state.site?.files ?? EMPTY_FILES)
  const file = files.find((item) => item.path === MOTION_FILE_PATH)
  return parseMotionDocument(file?.content).byNodeId[nodeId] ?? emptyMachine()
}

function readMachine(nodeId: string): MotionMachine {
  const files = useEditorStore.getState().site?.files ?? EMPTY_FILES
  const file = files.find((item) => item.path === MOTION_FILE_PATH)
  return parseMotionDocument(file?.content).byNodeId[nodeId] ?? emptyMachine()
}

function saveMachine(nodeId: string, machine: MotionMachine): void {
  const store = useEditorStore.getState()
  const files = store.site?.files ?? EMPTY_FILES
  const existing = files.find((item) => item.path === MOTION_FILE_PATH)
  const doc = parseMotionDocument(existing?.content)
  doc.byNodeId[nodeId] = machine
  const text = JSON.stringify(doc)
  if (existing) store.updateFileContent(existing.id, text)
  else store.createFile(MOTION_FILE_PATH, 'config', text)
  const page = selectActiveCanvasPage(store)
  const node = page?.nodes[nodeId]
  if (!node) return
  const raw = node.props.htmlAttributes
  const attrs: Record<string, string> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') attrs[key] = value
    }
  }
  attrs['data-kj-motion'] = motionAttributeValue(nodeId)
  store.updateNodeProps(nodeId, { htmlAttributes: attrs })
}
