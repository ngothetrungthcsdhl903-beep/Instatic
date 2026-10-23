/**
 * Keijam layout model.
 *
 * A parent is either Free (children are absolutely positioned) or Stack
 * (CSS flex auto-layout). Each child sizes as Fixed, Fill, or Fit content.
 * The mapping is plain CSS so the publisher emits it through the existing
 * style-rule pipeline — no second stylesheet format.
 */

export type LayoutMode = 'free' | 'stack'
export type StackDirection = 'row' | 'column'
export type StackAlign = 'start' | 'center' | 'end' | 'stretch'
export type StackDistribute = 'start' | 'center' | 'end' | 'space-between'
export type SizingMode = 'fixed' | 'fill' | 'fit'
export type TextAlign = 'left' | 'center' | 'right'
export type ObjectFit = 'cover' | 'contain'

export interface AxisSize {
  mode: SizingMode
  /** Pixel length used when mode is `fixed`. Ignored for fill and fit. */
  px: number
}

export interface KeijamLayout {
  mode: LayoutMode
  direction: StackDirection
  gap: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  align: StackAlign
  distribute: StackDistribute
  wrap: boolean
  /** Absolute position inside a free parent. Ignored for the page frame and stack children. */
  placed: boolean
  x: number
  y: number
  width: AxisSize
  height: AxisSize
  backgroundColor?: string
  color?: string
  radius?: number
  opacity?: number
  fontSize?: number
  fontWeight?: number
  textAlign?: TextAlign
  objectFit?: ObjectFit
}

export interface LayoutContext {
  /** `canvas` is the page frame itself. Otherwise the parent's layout mode. */
  parent: 'canvas' | LayoutMode
  parentDirection: StackDirection
}

export type CssBag = Record<string, string | number>

/** Keys a layout write is allowed to set or clear. Unrelated class properties stay. */
export const LAYOUT_KEYS = [
  'display',
  'flexDirection',
  'flexWrap',
  'alignItems',
  'justifyContent',
  'gap',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'flex',
  'alignSelf',
  'boxSizing',
  'backgroundColor',
  'color',
  'borderRadius',
  'opacity',
  'fontSize',
  'fontWeight',
  'textAlign',
  'objectFit',
  'overflow',
] as const

const ALIGN_TO_CSS: Record<StackAlign, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
}

const DISTRIBUTE_TO_CSS: Record<StackDistribute, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
}

const CSS_TO_ALIGN: Record<string, StackAlign> = {
  'flex-start': 'start',
  start: 'start',
  center: 'center',
  'flex-end': 'end',
  end: 'end',
  stretch: 'stretch',
}

const CSS_TO_DISTRIBUTE: Record<string, StackDistribute> = {
  'flex-start': 'start',
  start: 'start',
  center: 'center',
  'flex-end': 'end',
  end: 'end',
  'space-between': 'space-between',
}

export function defaultLayout(kind: 'canvas' | 'frame' | 'text' | 'image'): KeijamLayout {
  const shared: KeijamLayout = {
    mode: 'free',
    direction: 'column',
    gap: 12,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    align: 'start',
    distribute: 'start',
    wrap: false,
    placed: kind !== 'canvas',
    x: 48,
    y: 48,
    width: { mode: 'fixed', px: 280 },
    height: { mode: 'fixed', px: 180 },
    radius: kind === 'frame' ? 8 : undefined,
    backgroundColor: kind === 'frame' ? '#f4f4f5' : undefined,
  }
  if (kind === 'canvas') {
    return {
      ...shared,
      placed: false,
      x: 0,
      y: 0,
      width: { mode: 'fill', px: 0 },
      height: { mode: 'fixed', px: 800 },
      backgroundColor: '#f4f4f5',
      color: '#1c1c1c',
    }
  }
  if (kind === 'text') {
    return {
      ...shared,
      width: { mode: 'fit', px: 0 },
      height: { mode: 'fit', px: 0 },
      fontSize: 32,
      fontWeight: 560,
      color: '#1c1c1c',
    }
  }
  if (kind === 'image') {
    return {
      ...shared,
      width: { mode: 'fixed', px: 240 },
      height: { mode: 'fixed', px: 160 },
      backgroundColor: '#e4e4e7',
      objectFit: 'cover',
    }
  }
  return shared
}

export function layoutToCss(layout: KeijamLayout, context: LayoutContext): CssBag {
  const css: CssBag = {
    boxSizing: 'border-box',
    display: layout.mode === 'stack' ? 'flex' : 'block',
    flexDirection: layout.direction,
    flexWrap: layout.wrap ? 'wrap' : 'nowrap',
    alignItems: ALIGN_TO_CSS[layout.align],
    justifyContent: DISTRIBUTE_TO_CSS[layout.distribute],
    gap: px(layout.gap),
    paddingTop: px(layout.paddingTop),
    paddingRight: px(layout.paddingRight),
    paddingBottom: px(layout.paddingBottom),
    paddingLeft: px(layout.paddingLeft),
    overflow: 'visible',
  }

  if (context.parent === 'canvas') {
    css.position = 'relative'
    css.width = '100%'
    if (layout.height.mode === 'fit') {
      css.height = 'fit-content'
      css.minHeight = '0px'
    } else if (layout.height.mode === 'fixed') {
      css.height = px(layout.height.px)
      css.minHeight = px(layout.height.px)
    } else {
      css.height = 'auto'
      css.minHeight = '640px'
    }
  } else if (context.parent === 'free') {
    css.position = layout.placed ? 'absolute' : 'relative'
    if (layout.placed) {
      css.left = px(layout.x)
      css.top = px(layout.y)
    }
    writeFreeAxis(css, 'width', layout.width)
    writeFreeAxis(css, 'height', layout.height)
  } else {
    css.position = 'relative'
    writeStackChild(css, layout, context.parentDirection)
  }

  if (layout.backgroundColor) css.backgroundColor = layout.backgroundColor
  if (layout.color) css.color = layout.color
  if (layout.radius !== undefined) css.borderRadius = px(layout.radius)
  if (layout.opacity !== undefined) css.opacity = layout.opacity
  if (layout.fontSize !== undefined) css.fontSize = px(layout.fontSize)
  if (layout.fontWeight !== undefined) css.fontWeight = String(layout.fontWeight)
  if (layout.textAlign) css.textAlign = layout.textAlign
  if (layout.objectFit) css.objectFit = layout.objectFit
  return css
}

export function readLayout(
  styles: Record<string, unknown> | undefined,
  context: LayoutContext,
): KeijamLayout {
  const css = styles ?? {}
  const mode: LayoutMode = css.display === 'flex' ? 'stack' : 'free'
  const direction: StackDirection = css.flexDirection === 'row' || css.flexDirection === 'row-reverse'
    ? 'row'
    : 'column'
  const layout: KeijamLayout = {
    mode,
    direction: css.flexDirection === 'row' || css.flexDirection === 'column' ? css.flexDirection : direction === 'row' ? 'row' : 'column',
    gap: readPx(css.gap, 12),
    paddingTop: readPx(css.paddingTop, 0),
    paddingRight: readPx(css.paddingRight, 0),
    paddingBottom: readPx(css.paddingBottom, 0),
    paddingLeft: readPx(css.paddingLeft, 0),
    align: CSS_TO_ALIGN[String(css.alignItems ?? '')] ?? 'start',
    distribute: CSS_TO_DISTRIBUTE[String(css.justifyContent ?? '')] ?? 'start',
    wrap: css.flexWrap === 'wrap',
    placed: css.position === 'absolute',
    x: readPx(css.left, 0),
    y: readPx(css.top, 0),
    width: { mode: 'fit', px: 0 },
    height: { mode: 'fit', px: 0 },
  }

  if (context.parent === 'canvas') {
    layout.placed = false
    layout.width = { mode: 'fill', px: 0 }
    if (typeof css.height === 'string' && css.height.endsWith('px')) {
      layout.height = { mode: 'fixed', px: readPx(css.height, 800) }
    } else if (css.height === 'fit-content') {
      layout.height = { mode: 'fit', px: 0 }
    } else {
      layout.height = { mode: 'fill', px: 0 }
    }
  } else if (context.parent === 'free') {
    layout.width = readFreeAxis(css.width, { mode: 'fit', px: 0 })
    layout.height = readFreeAxis(css.height, { mode: 'fit', px: 0 })
  } else {
    const main = context.parentDirection === 'row' ? 'width' : 'height'
    layout.width = readStackAxis(css, 'width', main === 'width' ? 'main' : 'cross')
    layout.height = readStackAxis(css, 'height', main === 'height' ? 'main' : 'cross')
    layout.placed = false
  }

  if (typeof css.backgroundColor === 'string') layout.backgroundColor = css.backgroundColor
  if (typeof css.color === 'string') layout.color = css.color
  if (css.borderRadius !== undefined) layout.radius = readPx(css.borderRadius, 0)
  if (typeof css.opacity === 'number') layout.opacity = css.opacity
  if (css.fontSize !== undefined) layout.fontSize = readPx(css.fontSize, 16)
  if (css.fontWeight !== undefined) layout.fontWeight = Number(css.fontWeight)
  if (css.textAlign === 'left' || css.textAlign === 'center' || css.textAlign === 'right') {
    layout.textAlign = css.textAlign
  }
  if (css.objectFit === 'cover' || css.objectFit === 'contain') layout.objectFit = css.objectFit
  return layout
}

export function mergeStyles(
  base: Record<string, unknown>,
  override?: Record<string, unknown>,
): Record<string, unknown> {
  if (!override) return { ...base }
  const out = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined || value === null) continue
    out[key] = value
  }
  return out
}

/** Replace layout keys on the base rule. Keys no longer emitted are cleared. */
export function replaceLayoutPatch(
  previous: Record<string, unknown>,
  next: CssBag,
): Record<string, string | number | null> {
  const patch: Record<string, string | number | null> = {}
  for (const key of LAYOUT_KEYS) {
    if (key in next) {
      if (!Object.is(previous[key], next[key])) patch[key] = next[key]
    } else if (key in previous) {
      patch[key] = null
    }
  }
  return patch
}

/**
 * Breakpoint override against the base bag. Matching keys are cleared so
 * they keep inheriting. Insets that disappear are set to `auto` so the
 * base value does not leak back through the cascade.
 */
export function contextOverridePatch(
  base: CssBag,
  next: CssBag,
): Record<string, string | number | null> {
  const patch: Record<string, string | number | null> = {}
  for (const key of LAYOUT_KEYS) {
    const baseValue = base[key]
    const nextValue = next[key]
    if (nextValue === undefined) {
      if (baseValue !== undefined) {
        patch[key] = key === 'left' || key === 'top' || key === 'right' || key === 'bottom' ? 'auto' : null
      }
      continue
    }
    patch[key] = Object.is(baseValue, nextValue) ? null : nextValue
  }
  return patch
}

/** CSS custom properties the design canvas reads. Every key is always set. */
export function layoutStyleVars(css: CssBag): Record<string, string> {
  const side = (key: string) => (css[key] !== undefined ? String(css[key]) : '0px')
  return {
    '--kj-position': String(css.position ?? 'relative'),
    '--kj-left': String(css.left ?? 'auto'),
    '--kj-top': String(css.top ?? 'auto'),
    '--kj-width': String(css.width ?? 'auto'),
    '--kj-height': String(css.height ?? 'auto'),
    '--kj-min-height': String(css.minHeight ?? '0px'),
    '--kj-display': String(css.display ?? 'block'),
    '--kj-flex-direction': String(css.flexDirection ?? 'column'),
    '--kj-flex-wrap': String(css.flexWrap ?? 'nowrap'),
    '--kj-align': String(css.alignItems ?? 'flex-start'),
    '--kj-justify': String(css.justifyContent ?? 'flex-start'),
    '--kj-align-self': String(css.alignSelf ?? 'auto'),
    '--kj-flex': String(css.flex ?? '0 0 auto'),
    '--kj-gap': String(css.gap ?? '0px'),
    '--kj-padding': `${side('paddingTop')} ${side('paddingRight')} ${side('paddingBottom')} ${side('paddingLeft')}`,
    '--kj-bg': String(css.backgroundColor ?? 'transparent'),
    '--kj-color': String(css.color ?? 'inherit'),
    '--kj-radius': String(css.borderRadius ?? '0px'),
    '--kj-opacity': String(css.opacity ?? 1),
    '--kj-font-size': String(css.fontSize ?? 'inherit'),
    '--kj-font-weight': String(css.fontWeight ?? 'inherit'),
    '--kj-text-align': String(css.textAlign ?? 'start'),
    '--kj-object-fit': String(css.objectFit ?? 'cover'),
  }
}

function writeFreeAxis(css: CssBag, key: 'width' | 'height', axis: AxisSize): void {
  if (axis.mode === 'fixed') css[key] = px(axis.px)
  else if (axis.mode === 'fill') css[key] = '100%'
  else css[key] = 'fit-content'
}

function writeStackChild(css: CssBag, layout: KeijamLayout, direction: StackDirection): void {
  const mainKey = direction === 'row' ? 'width' : 'height'
  const crossKey = direction === 'row' ? 'height' : 'width'
  const main = mainKey === 'width' ? layout.width : layout.height
  const cross = crossKey === 'width' ? layout.width : layout.height

  if (main.mode === 'fill') {
    css.flex = '1 1 auto'
    css[mainKey] = 'auto'
  } else if (main.mode === 'fixed') {
    css.flex = '0 0 auto'
    css[mainKey] = px(main.px)
  } else {
    css.flex = '0 0 auto'
    css[mainKey] = 'fit-content'
  }

  if (cross.mode === 'fill') {
    css.alignSelf = 'stretch'
    css[crossKey] = 'auto'
  } else if (cross.mode === 'fixed') {
    css.alignSelf = 'auto'
    css[crossKey] = px(cross.px)
  } else {
    css.alignSelf = 'auto'
    css[crossKey] = 'fit-content'
  }
}

function readFreeAxis(value: unknown, fallback: AxisSize): AxisSize {
  if (value === '100%') return { mode: 'fill', px: fallback.px }
  if (value === 'fit-content') return { mode: 'fit', px: fallback.px }
  const n = parsePx(value)
  if (n !== null) return { mode: 'fixed', px: n }
  return fallback
}

function readStackAxis(
  css: Record<string, unknown>,
  axis: 'width' | 'height',
  role: 'main' | 'cross',
): AxisSize {
  const flex = String(css.flex ?? '')
  if (role === 'main' && (flex.startsWith('1') || flex.includes('1 1'))) {
    return { mode: 'fill', px: 0 }
  }
  if (role === 'cross' && css.alignSelf === 'stretch') return { mode: 'fill', px: 0 }
  return readFreeAxis(css[axis], { mode: 'fit', px: 0 })
}

function px(value: number): string {
  return `${Math.round(value)}px`
}

function parsePx(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(value.trim())
  return match ? Number(match[1]) : null
}

function readPx(value: unknown, fallback: number): number {
  return parsePx(value) ?? fallback
}
