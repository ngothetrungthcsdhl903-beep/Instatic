/**
 * Apply an agent layout or style patch onto a Keijam layout.
 * Omitted fields stay as they are. A padding shorthand fills every side
 * that the patch does not set on its own.
 */

import type { AxisSize, KeijamLayout, StackAlign, StackDirection, StackDistribute, TextAlign, ObjectFit, LayoutMode } from './layout'

export interface LayoutPatch {
  mode?: LayoutMode
  direction?: StackDirection
  gap?: number
  padding?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  align?: StackAlign
  distribute?: StackDistribute
  wrap?: boolean
  x?: number
  y?: number
  width?: { mode: AxisSize['mode']; px?: number }
  height?: { mode: AxisSize['mode']; px?: number }
}

export interface StylePatch {
  backgroundColor?: string
  color?: string
  radius?: number
  opacity?: number
  fontSize?: number
  fontWeight?: number
  textAlign?: TextAlign
  objectFit?: ObjectFit
}

export function applyLayoutPatch(
  layout: KeijamLayout,
  patch: LayoutPatch | undefined,
  style?: StylePatch,
): KeijamLayout {
  const next: KeijamLayout = {
    ...layout,
    width: { ...layout.width },
    height: { ...layout.height },
  }
  if (patch) {
    if (patch.mode) next.mode = patch.mode
    if (patch.direction) next.direction = patch.direction
    if (patch.gap !== undefined) next.gap = patch.gap
    if (patch.padding !== undefined) {
      next.paddingTop = patch.padding
      next.paddingRight = patch.padding
      next.paddingBottom = patch.padding
      next.paddingLeft = patch.padding
    }
    if (patch.paddingTop !== undefined) next.paddingTop = patch.paddingTop
    if (patch.paddingRight !== undefined) next.paddingRight = patch.paddingRight
    if (patch.paddingBottom !== undefined) next.paddingBottom = patch.paddingBottom
    if (patch.paddingLeft !== undefined) next.paddingLeft = patch.paddingLeft
    if (patch.align) next.align = patch.align
    if (patch.distribute) next.distribute = patch.distribute
    if (patch.wrap !== undefined) next.wrap = patch.wrap
    if (patch.x !== undefined) {
      next.x = patch.x
      next.placed = true
    }
    if (patch.y !== undefined) {
      next.y = patch.y
      next.placed = true
    }
    if (patch.width) next.width = axisFromPatch(next.width, patch.width)
    if (patch.height) next.height = axisFromPatch(next.height, patch.height)
    if (next.mode === 'stack') next.placed = false
  }
  if (style) {
    if (style.backgroundColor !== undefined) next.backgroundColor = style.backgroundColor
    if (style.color !== undefined) next.color = style.color
    if (style.radius !== undefined) next.radius = style.radius
    if (style.opacity !== undefined) next.opacity = style.opacity
    if (style.fontSize !== undefined) next.fontSize = style.fontSize
    if (style.fontWeight !== undefined) next.fontWeight = style.fontWeight
    if (style.textAlign) next.textAlign = style.textAlign
    if (style.objectFit) next.objectFit = style.objectFit
  }
  return next
}

function axisFromPatch(current: AxisSize, patch: { mode: AxisSize['mode']; px?: number }): AxisSize {
  return {
    mode: patch.mode,
    px: patch.px !== undefined ? patch.px : patch.mode === 'fixed' ? current.px : 0,
  }
}
