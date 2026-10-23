/**
 * Viewport culling for the Keijam pasteboard.
 *
 * A box with no measured rect stays mounted: stack children are positioned
 * by CSS, and culling them from a guessed rect would disagree with the
 * published page. Unknown viewport size (0) also keeps everything mounted.
 */

import type { View } from './geometry'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export function boxesIntersect(a: Box, b: Box, margin = 0): boolean {
  return (
    a.x - margin < b.x + b.width &&
    a.x + a.width + margin > b.x &&
    a.y - margin < b.y + b.height &&
    a.y + a.height + margin > b.y
  )
}

export function screenBox(box: Box, view: View, origin: { x: number; y: number } = { x: 0, y: 0 }): Box {
  const zoom = view.zoom || 1
  return {
    x: (origin.x + box.x) * zoom + view.panX,
    y: (origin.y + box.y) * zoom + view.panY,
    width: box.width * zoom,
    height: box.height * zoom,
  }
}

/** The visible window in a frame's layout coordinates. */
export function visibleFrameWindow(view: View, viewport: Box, frameOrigin: { x: number; y: number }): Box {
  const zoom = view.zoom || 1
  return {
    x: (viewport.x - view.panX) / zoom - frameOrigin.x,
    y: (viewport.y - view.panY) / zoom - frameOrigin.y,
    width: viewport.width / zoom,
    height: viewport.height / zoom,
  }
}

/**
 * True when `node` is far enough outside `viewport` to skip drawing.
 * A null rect, or a viewport that has not been measured, is never culled.
 */
export function isCulled(node: Box | null, viewport: Box, margin = 64): boolean {
  if (!node) return false
  if (viewport.width <= 0 || viewport.height <= 0) return false
  return !boxesIntersect(node, viewport, margin)
}
