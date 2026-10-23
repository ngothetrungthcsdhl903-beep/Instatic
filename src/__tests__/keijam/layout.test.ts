import { describe, expect, it } from 'bun:test'
import {
  contextOverridePatch,
  defaultLayout,
  interactionsToCss,
  layoutToCss,
  readInteractions,
  readLayout,
  replaceLayoutPatch,
} from '../../keijam'

describe('layout to CSS', () => {
  it('maps a free child to absolute positioning with fixed size', () => {
    const layout = defaultLayout('frame')
    layout.x = 40
    layout.y = 80
    layout.width = { mode: 'fixed', px: 200 }
    layout.height = { mode: 'fixed', px: 120 }
    const css = layoutToCss(layout, { parent: 'free', parentDirection: 'column' })
    expect(css.position).toBe('absolute')
    expect(css.left).toBe('40px')
    expect(css.top).toBe('80px')
    expect(css.width).toBe('200px')
    expect(css.height).toBe('120px')
    expect(css.display).toBe('block')
    expect(readLayout(css, { parent: 'free', parentDirection: 'column' })).toMatchObject({
      mode: 'free',
      placed: true,
      x: 40,
      y: 80,
      width: { mode: 'fixed', px: 200 },
      height: { mode: 'fixed', px: 120 },
      backgroundColor: '#f4f4f5',
      radius: 8,
    })
  })

  it('maps a stack to flex with gap, padding, alignment, and wrap', () => {
    const layout = defaultLayout('frame')
    layout.mode = 'stack'
    layout.direction = 'column'
    layout.gap = 16
    layout.paddingTop = 24
    layout.paddingRight = 12
    layout.paddingBottom = 24
    layout.paddingLeft = 12
    layout.align = 'center'
    layout.distribute = 'space-between'
    layout.wrap = true
    const css = layoutToCss(layout, { parent: 'free', parentDirection: 'column' })
    expect(css.display).toBe('flex')
    expect(css.flexDirection).toBe('column')
    expect(css.gap).toBe('16px')
    expect(css.paddingTop).toBe('24px')
    expect(css.paddingLeft).toBe('12px')
    expect(css.alignItems).toBe('center')
    expect(css.justifyContent).toBe('space-between')
    expect(css.flexWrap).toBe('wrap')
    expect(readLayout(css, { parent: 'free', parentDirection: 'column' })).toMatchObject({
      mode: 'stack',
      direction: 'column',
      gap: 16,
      paddingTop: 24,
      paddingLeft: 12,
      align: 'center',
      distribute: 'space-between',
      wrap: true,
    })
  })

  it('maps fill and fit inside a column stack', () => {
    const layout = defaultLayout('frame')
    layout.width = { mode: 'fill', px: 0 }
    layout.height = { mode: 'fit', px: 0 }
    const css = layoutToCss(layout, { parent: 'stack', parentDirection: 'column' })
    expect(css.position).toBe('relative')
    expect(css.left).toBeUndefined()
    expect(css.width).toBe('auto')
    expect(css.alignSelf).toBe('stretch')
    expect(css.height).toBe('fit-content')
    expect(css.flex).toBe('0 0 auto')
    expect(readLayout(css, { parent: 'stack', parentDirection: 'column' })).toMatchObject({
      width: { mode: 'fill', px: 0 },
      height: { mode: 'fit', px: 0 },
      placed: false,
    })
  })

  it('maps fill on the main axis of a row stack to flex grow', () => {
    const layout = defaultLayout('text')
    layout.width = { mode: 'fill', px: 0 }
    layout.height = { mode: 'fixed', px: 40 }
    const css = layoutToCss(layout, { parent: 'stack', parentDirection: 'row' })
    expect(css.flex).toBe('1 1 auto')
    expect(css.width).toBe('auto')
    expect(css.height).toBe('40px')
    expect(readLayout(css, { parent: 'stack', parentDirection: 'row' })).toMatchObject({
      width: { mode: 'fill', px: 0 },
      height: { mode: 'fixed', px: 40 },
      fontSize: 32,
    })
  })

  it('maps the page frame to a relative containing block', () => {
    const css = layoutToCss(defaultLayout('canvas'), { parent: 'canvas', parentDirection: 'column' })
    expect(css.position).toBe('relative')
    expect(css.width).toBe('100%')
    expect(css.height).toBe('800px')
    expect(css.minHeight).toBe('800px')
    expect(css.left).toBeUndefined()
    const read = readLayout(css, { parent: 'canvas', parentDirection: 'column' })
    expect(read.width.mode).toBe('fill')
    expect(read.height).toEqual({ mode: 'fixed', px: 800 })
    expect(read.placed).toBe(false)
  })

  it('writes only changed keys into a breakpoint override', () => {
    const base = layoutToCss(defaultLayout('frame'), { parent: 'free', parentDirection: 'column' })
    const moved = defaultLayout('frame')
    moved.x = 120
    const next = layoutToCss(moved, { parent: 'free', parentDirection: 'column' })
    const patch = contextOverridePatch(base, next)
    expect(patch.left).toBe('120px')
    expect(patch.top).toBeNull()
    expect(patch.width).toBeNull()
  })

  it('clears stale absolute offsets when a layout key disappears', () => {
    const patch = replaceLayoutPatch(
      { position: 'absolute', left: '10px', top: '10px', color: '#111111' },
      { position: 'relative', display: 'block' },
    )
    expect(patch.left).toBeNull()
    expect(patch.top).toBeNull()
    expect(patch.position).toBe('relative')
    expect(patch.color).toBeNull()
  })
})

describe('interaction CSS', () => {
  it('emits hover, press, and a transition on the base class', () => {
    const css = interactionsToCss('.kj-card', {
      transitionMs: 200,
      hover: { backgroundColor: '#2a68f1', scale: 1.02 },
      press: { opacity: 0.8 },
    })
    expect(css.transition).toContain('200ms')
    expect(css.hover).toEqual({
      selector: '.kj-card:hover',
      styles: { backgroundColor: '#2a68f1', transform: 'scale(1.02)' },
    })
    expect(css.press).toEqual({
      selector: '.kj-card:active',
      styles: { opacity: 0.8 },
    })
    expect(readInteractions(
      { transition: css.transition },
      css.hover?.styles,
      css.press?.styles,
    )).toEqual({
      transitionMs: 200,
      hover: { backgroundColor: '#2a68f1', scale: 1.02 },
      press: { opacity: 0.8 },
    })
  })

  it('omits empty states', () => {
    const css = interactionsToCss('.kj-card', { transitionMs: 180, hover: {}, press: {} })
    expect(css.transition).toBeNull()
    expect(css.hover).toBeNull()
    expect(css.press).toBeNull()
  })
})
