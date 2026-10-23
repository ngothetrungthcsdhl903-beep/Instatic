import { describe, expect, it } from 'bun:test'
import '@modules/base/body'
import '@modules/base/container'
import '@modules/base/image'
import '@modules/base/text'
import { registry } from '@core/module-engine'
import {
  CLEAN_EXPORT_GZIP_BUDGET,
  applyLayoutPatch,
  boxesIntersect,
  defaultLayout,
  diffDesignNodes,
  decodeStamps,
  dirtyIds,
  dirtyNodeIds,
  encodeStamps,
  exportCleanDocument,
  gzipByteLength,
  isCulled,
  paintSignature,
  screenBox,
  visibleFrameWindow,
} from '../../keijam'
import { makeModule, makePage, makeRegistry, makeSite } from '../publisher/helpers'

describe('layout patches', () => {
  it('turns a free frame into a padded stack without dropping paint', () => {
    const layout = defaultLayout('frame')
    layout.backgroundColor = '#ffffff'
    const next = applyLayoutPatch(layout, {
      mode: 'stack',
      direction: 'row',
      gap: 8,
      padding: 20,
      paddingTop: 4,
      align: 'center',
      distribute: 'space-between',
    })
    expect(next.mode).toBe('stack')
    expect(next.direction).toBe('row')
    expect(next.gap).toBe(8)
    expect(next.paddingTop).toBe(4)
    expect(next.paddingRight).toBe(20)
    expect(next.align).toBe('center')
    expect(next.distribute).toBe('space-between')
    expect(next.placed).toBe(false)
    expect(next.backgroundColor).toBe('#ffffff')
  })

  it('keeps a fixed pixel length when the patch only changes the mode', () => {
    const layout = defaultLayout('frame')
    layout.width = { mode: 'fixed', px: 320 }
    const next = applyLayoutPatch(layout, { width: { mode: 'fixed' } })
    expect(next.width).toEqual({ mode: 'fixed', px: 320 })
  })
})

describe('verify-after-edit diff', () => {
  it('reports added, removed, and the fields that changed', () => {
    const base = defaultLayout('frame')
    const before = [{
      id: 'a',
      moduleId: 'base.container',
      name: 'A',
      parentId: 'root',
      childIds: [],
      hidden: false,
      text: '',
      src: '',
      layout: base,
    }]
    const after = [
      { ...before[0], name: 'Hero', layout: { ...base, mode: 'stack' as const } },
      { ...before[0], id: 'b', name: 'B' },
    ]
    const diff = diffDesignNodes(before, after)
    expect(diff.added).toEqual(['b'])
    expect(diff.removed).toEqual([])
    expect(diff.changed).toEqual([{ id: 'a', fields: ['name', 'layout'] }])
    expect(dirtyNodeIds(diff).sort()).toEqual(['a', 'b'])
  })
})

describe('viewport culling', () => {
  const view = { zoom: 1, panX: 0, panY: 0 }
  const viewport = { x: 0, y: 0, width: 800, height: 600 }

  it('keeps a frame that intersects the viewport and drops one that does not', () => {
    const visible = screenBox({ x: 0, y: 0, width: 400, height: 300 }, view, { x: 40, y: 36 })
    const hidden = screenBox({ x: 0, y: 0, width: 400, height: 300 }, view, { x: 4000, y: 36 })
    expect(boxesIntersect(visible, viewport)).toBe(true)
    expect(isCulled(visible, viewport)).toBe(false)
    expect(isCulled(hidden, viewport)).toBe(true)
  })

  it('does not cull an unmeasured box or an unmeasured viewport', () => {
    expect(isCulled(null, viewport)).toBe(false)
    expect(isCulled({ x: 9000, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 0, height: 0 })).toBe(false)
  })

  it('maps the visible window back into frame coordinates', () => {
    const windowBox = visibleFrameWindow(
      { zoom: 2, panX: 100, panY: 40 },
      viewport,
      { x: 200, y: 36 },
    )
    expect(windowBox.x).toBeCloseTo(-250)
    expect(windowBox.y).toBeCloseTo(-56)
    expect(windowBox.width).toBe(400)
    expect(windowBox.height).toBe(300)
  })
})

describe('dirty region', () => {
  it('marks a node dirty only when its paint signature changes', () => {
    const layout = defaultLayout('text')
    const signature = paintSignature({
      layout,
      text: 'Hello',
      src: '',
      hidden: false,
      childIds: [],
      selected: false,
    })
    const previous = [{ id: 'desktop:a', signature }]
    const same = dirtyIds(previous, [{ id: 'desktop:a', signature }])
    const next = dirtyIds(previous, [{
      id: 'desktop:a',
      signature: paintSignature({ ...{ layout, text: 'Hello!', src: '', hidden: false, childIds: [], selected: false } }),
    }])
    expect(same).toEqual([])
    expect(next).toEqual(['desktop:a'])
    expect(dirtyIds(previous, [])).toEqual(['desktop:a'])
    expect(decodeStamps(encodeStamps(previous))).toEqual(previous)
  })
})

describe('clean export', () => {
  it('publishes a designed page as HTML and CSS with no runtime, inside 80 KB gzip', async () => {
    const page = makePage({
      root: { moduleId: 'base.body', children: ['hero', 'title', 'photo'] },
      hero: {
        moduleId: 'base.container',
        children: [],
        classIds: ['hero'],
      },
      title: { moduleId: 'base.text', props: { text: 'Keijam', tag: 'h1' } },
      photo: { moduleId: 'base.image', props: { src: '/media/cover.jpg', alt: 'Cover' } },
    })
    const site = makeSite({
      pages: [page],
      styleRules: {
        hero: {
          id: 'hero',
          name: 'hero',
          kind: 'class',
          selector: '.hero',
          order: 0,
          createdAt: 0,
          updatedAt: 0,
          styles: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingTop: '24px',
            paddingRight: '24px',
            paddingBottom: '24px',
            paddingLeft: '24px',
            backgroundColor: '#f4f4f5',
            borderRadius: '12px',
          },
          contextStyles: {},
        },
      },
    })
    const clean = await exportCleanDocument(page, site, registry)
    expect(clean.html).toContain('<!DOCTYPE html>')
    expect(clean.html).toContain('Keijam')
    expect(clean.html).toContain('<style')
    expect(clean.html).not.toContain('<script')
    expect(clean.html).not.toContain('instatic-hole')
    expect(clean.html).not.toContain('hole-runtime')
    expect(clean.gzipBytes).toBe(await gzipByteLength(clean.html))
    expect(clean.gzipBytes).toBeLessThanOrEqual(CLEAN_EXPORT_GZIP_BUDGET)
    expect(clean.withinBudget).toBe(true)
  })

  it('inlines a dynamic module instead of emitting a hole runtime', async () => {
    const dynamic = makeModule('dyn.block', {
      dynamic: true,
      render: () => ({ html: '<p>Rendered inline</p>' }),
    })
    const body = makeModule('base.body', {
      canHaveChildren: true,
      render: (_props, children) => ({ html: (children ?? []).join('') }),
    })
    const page = makePage({
      root: { moduleId: 'base.body', children: ['block'] },
      block: { moduleId: 'dyn.block' },
    })
    const clean = await exportCleanDocument(page, makeSite({ pages: [page] }), makeRegistry({
      'base.body': body,
      'dyn.block': dynamic,
    }))
    expect(clean.html).toContain('Rendered inline')
    expect(clean.html).not.toContain('<script')
    expect(clean.html).not.toContain('instatic-hole')
    expect(clean.withinBudget).toBe(true)
  })
})
