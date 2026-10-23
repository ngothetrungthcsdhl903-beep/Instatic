import { describe, expect, it } from 'bun:test'
import '@modules/base/body'
import '@modules/base/container'
import '@modules/base/text'
import { registry } from '@core/module-engine'
import {
  CLEAN_EXPORT_GZIP_BUDGET,
  componentFromDescription,
  effectScriptTags,
  emptyMachine,
  exportCleanDocument,
  exportMotion,
  loaderBytes,
  lowerCodeComponent,
  parseCodeComponent,
  recordKeyframe,
  sampleEase,
} from '../../keijam'
import { makePage, makeSite } from '../publisher/helpers'

const OVERRIDE = `import { forwardRef } from "react"

/** @framerIntrinsicWidth 120 */
export function withFade(Component) {
  return forwardRef((props, ref) => <Component ref={ref} {...props} style={{ opacity: 0.5 }} />)
}
`

describe('code components', () => {
  it('parses a generated button and lowers it to HTML without a script', () => {
    const source = componentFromDescription('Primary button for the hero')
    const parsed = parseCodeComponent(source)
    expect(parsed.kind).toBe('component')
    expect(parsed.controls.map((control) => control.type)).toEqual(['string', 'color', 'color', 'number'])
    expect(parsed.defaults.label).toBe('Primary button for the hero')
    const html = lowerCodeComponent(source, { label: 'Start <now>' })
    expect(html).toContain('<button')
    expect(html).toContain('Start &lt;now&gt;')
    expect(html).toContain('border-radius:8px')
    expect(html).not.toContain('<script')
  })

  it('recognizes a Framer override paste and does not execute it', () => {
    const parsed = parseCodeComponent(OVERRIDE)
    expect(parsed.kind).toBe('override')
    expect(parsed.name).toBe('withFade')
    expect(parsed.intrinsicWidth).toBe(120)
    expect(lowerCodeComponent(OVERRIDE, {})).not.toContain('forwardRef')
  })

  it('publishes the lowered component inside the clean document', async () => {
    const source = componentFromDescription('Pricing card')
    const page = makePage({
      root: { moduleId: 'base.body', children: ['card'] },
      card: {
        moduleId: 'base.container',
        props: {
          tag: 'div',
          htmlAttributes: { 'data-kj-code': 'file-card', 'data-kj-values': '{"title":"Pricing card"}' },
        },
      },
    })
    const site = makeSite({
      pages: [page],
      files: [{
        id: 'file-card',
        path: 'src/components/PricingCard.tsx',
        type: 'component',
        content: source,
        createdAt: 0,
        updatedAt: 0,
      }],
    })
    const clean = await exportCleanDocument(page, site, registry)
    expect(clean.html).toContain('Pricing card')
    expect(clean.html).toContain('<h2>')
    expect(clean.html).not.toContain('addPropertyControls')
    expect(clean.html).not.toContain('<script')
    expect(clean.withinBudget).toBe(true)
  })
})

describe('motion', () => {
  it('records a keyframe and exports a CSS animation for a hover transition', () => {
    const base = emptyMachine()
    const withFrame = recordKeyframe(base, 'idle', 0, { opacity: 1, x: 0 })
    const machine = recordKeyframe({
      ...withFrame,
      states: [
        ...withFrame.states,
        { id: 'hover', name: 'Hover', durationMs: 200, keyframes: [{ timeMs: 0, x: 8, opacity: 1 }] },
      ],
      transitions: [{
        id: 'to-hover',
        from: 'idle',
        to: 'hover',
        event: 'hover',
        conditions: [],
        durationMs: 200,
        ease: { kind: 'cubic', x1: 0.2, y1: 0, x2: 0, y2: 1 },
      }],
    }, 'hover', 200, { x: 8, opacity: 1 })
    const exported = exportMotion('node_1', machine)
    expect(exported.css).toContain('@keyframes')
    expect(exported.css).toContain(':hover')
    expect(exported.script).toBeNull()
  })

  it('samples a spring above rest and ships a Web Animations runner for click', () => {
    const curve = sampleEase({ kind: 'spring', stiffness: 320, damping: 20, mass: 1 }, 16)
    expect(curve[0]).toBeLessThan(0.2)
    expect(Math.max(...curve)).toBeGreaterThan(1)
    const machine = {
      ...emptyMachine(),
      states: [{
        id: 'idle',
        name: 'Idle',
        durationMs: 400,
        keyframes: [{ timeMs: 400, y: -12, opacity: 1 }],
      }],
      transitions: [{
        id: 'click',
        from: 'idle',
        to: 'idle',
        event: 'click' as const,
        conditions: [{ input: 'armed', op: 'true' as const }],
        durationMs: 400,
        ease: { kind: 'spring' as const, stiffness: 320, damping: 34, mass: 1 },
      }],
    }
    const exported = exportMotion('node_1', machine)
    expect(exported.script).toContain('animate')
    expect(exported.script).not.toContain('gsap')
    expect(exported.json).toContain('click')
  })
})

describe('lazy effects', () => {
  it('omits loaders until a page uses them, and keeps the document under 80 KB', async () => {
    expect(loaderBytes('three')).toBeLessThan(1500)
    expect(loaderBytes('gsap')).toBeLessThan(800)
    expect(effectScriptTags(['three'])).toContain('https://esm.sh/three@0.170.0')
    expect(effectScriptTags(['three'])).not.toContain('BoxGeometry =')

    const plain = makePage({
      root: { moduleId: 'base.body', children: ['title'] },
      title: { moduleId: 'base.text', props: { text: 'Still', tag: 'p' } },
    })
    const plainExport = await exportCleanDocument(plain, makeSite({ pages: [plain] }), registry)
    expect(plainExport.html).not.toContain('esm.sh')
    expect(plainExport.html).not.toContain('<script')

    const page = makePage({
      root: { moduleId: 'base.body', children: ['scene'] },
      scene: {
        moduleId: 'base.container',
        props: { tag: 'div', htmlAttributes: { 'data-kj-effect': 'three' } },
      },
    })
    const clean = await exportCleanDocument(page, makeSite({ pages: [page] }), registry)
    expect(clean.html).toContain('https://esm.sh/three@0.170.0')
    expect(clean.html).not.toContain('https://esm.sh/gsap')
    expect(clean.gzipBytes).toBeLessThanOrEqual(CLEAN_EXPORT_GZIP_BUDGET)
    expect(clean.withinBudget).toBe(true)
  })
})
