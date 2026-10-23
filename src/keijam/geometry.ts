/**
 * Canvas geometry for the Keijam design surface: resize, nudge, snapping,
 * distance labels, and zoom. Pure functions — the canvas applies the result.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export type Handle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export type NudgeDirection = 'left' | 'right' | 'up' | 'down'

export interface Guide {
  orientation: 'v' | 'h'
  /** Vertical guides are an x; horizontal guides are a y. */
  position: number
  from: number
  to: number
}

export interface DistanceLabel {
  x: number
  y: number
  text: string
}

export interface SnapResult {
  rect: Rect
  guides: Guide[]
  labels: DistanceLabel[]
}

export interface View {
  zoom: number
  panX: number
  panY: number
}

export const SNAP_THRESHOLD = 5
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4
const MIN_SIZE = 8

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function resizeRect(start: Rect, handle: Handle, dx: number, dy: number, min = MIN_SIZE): Rect {
  let { x, y, width, height } = start
  if (handle.includes('e')) width = Math.max(min, start.width + dx)
  if (handle.includes('s')) height = Math.max(min, start.height + dy)
  if (handle.includes('w')) {
    const next = start.width - dx
    if (next >= min) {
      width = next
      x = start.x + dx
    }
  }
  if (handle.includes('n')) {
    const next = start.height - dy
    if (next >= min) {
      height = next
      y = start.y + dy
    }
  }
  return { x, y, width, height }
}

export function nudgeRect(rect: Rect, direction: NudgeDirection, amount: number): Rect {
  if (direction === 'left') return { ...rect, x: rect.x - amount }
  if (direction === 'right') return { ...rect, x: rect.x + amount }
  if (direction === 'up') return { ...rect, y: rect.y - amount }
  return { ...rect, y: rect.y + amount }
}

/**
 * Snap a moving rectangle to sibling edges, sibling centers, and the parent
 * box. One correction per axis — the closest candidate within `threshold`.
 */
export function snapMove(
  rect: Rect,
  obstacles: readonly Rect[],
  parent: Rect,
  threshold = SNAP_THRESHOLD,
): SnapResult {
  const xTargets = collectAxis(obstacles, parent, 'x')
  const yTargets = collectAxis(obstacles, parent, 'y')
  const xSnap = snapEdges(rect.x, rect.width, xTargets, threshold, 'v')
  const ySnap = snapEdges(rect.y, rect.height, yTargets, threshold, 'h')
  const next: Rect = {
    x: rect.x + xSnap.delta,
    y: rect.y + ySnap.delta,
    width: rect.width,
    height: rect.height,
  }
  return {
    rect: next,
    guides: [...xSnap.guides, ...ySnap.guides],
    labels: distanceLabels(next, obstacles, parent),
  }
}

/** Snap the edges a resize handle is moving. Width and height stay at least `min`. */
export function snapResize(
  rect: Rect,
  handle: Handle,
  obstacles: readonly Rect[],
  parent: Rect,
  threshold = SNAP_THRESHOLD,
  min = MIN_SIZE,
): SnapResult {
  const next = { ...rect }
  const guides: Guide[] = []
  const xTargets = collectAxis(obstacles, parent, 'x')
  const yTargets = collectAxis(obstacles, parent, 'y')

  if (handle.includes('e')) {
    const snap = nearest(next.x + next.width, xTargets, threshold)
    if (snap) {
      next.width = Math.max(min, snap.target - next.x)
      guides.push(verticalGuide(snap.target, next, parent))
    }
  }
  if (handle.includes('w')) {
    const snap = nearest(next.x, xTargets, threshold)
    if (snap) {
      const right = next.x + next.width
      next.x = snap.target
      next.width = Math.max(min, right - next.x)
      guides.push(verticalGuide(snap.target, next, parent))
    }
  }
  if (handle.includes('s')) {
    const snap = nearest(next.y + next.height, yTargets, threshold)
    if (snap) {
      next.height = Math.max(min, snap.target - next.y)
      guides.push(horizontalGuide(snap.target, next, parent))
    }
  }
  if (handle.includes('n')) {
    const snap = nearest(next.y, yTargets, threshold)
    if (snap) {
      const bottom = next.y + next.height
      next.y = snap.target
      next.height = Math.max(min, bottom - next.y)
      guides.push(horizontalGuide(snap.target, next, parent))
    }
  }

  return { rect: next, guides, labels: distanceLabels(next, obstacles, parent) }
}

/**
 * Gaps from `rect` to the parent and to overlapping siblings on each side.
 * The nearest positive gap on a side becomes a label.
 */
export function distanceLabels(rect: Rect, obstacles: readonly Rect[], parent: Rect): DistanceLabel[] {
  const labels: DistanceLabel[] = []
  const left = nearestPositive([
    rect.x - parent.x,
    ...obstacles.filter((item) => overlaps(rect.y, rect.height, item.y, item.height) && item.x + item.width <= rect.x + 0.5)
      .map((item) => rect.x - (item.x + item.width)),
  ])
  const right = nearestPositive([
    parent.x + parent.width - (rect.x + rect.width),
    ...obstacles.filter((item) => overlaps(rect.y, rect.height, item.y, item.height) && item.x >= rect.x + rect.width - 0.5)
      .map((item) => item.x - (rect.x + rect.width)),
  ])
  const top = nearestPositive([
    rect.y - parent.y,
    ...obstacles.filter((item) => overlaps(rect.x, rect.width, item.x, item.width) && item.y + item.height <= rect.y + 0.5)
      .map((item) => rect.y - (item.y + item.height)),
  ])
  const bottom = nearestPositive([
    parent.y + parent.height - (rect.y + rect.height),
    ...obstacles.filter((item) => overlaps(rect.x, rect.width, item.x, item.width) && item.y >= rect.y + rect.height - 0.5)
      .map((item) => item.y - (rect.y + rect.height)),
  ])

  if (left !== null) {
    labels.push({ x: rect.x - left / 2, y: rect.y + rect.height / 2, text: String(Math.round(left)) })
  }
  if (right !== null) {
    labels.push({ x: rect.x + rect.width + right / 2, y: rect.y + rect.height / 2, text: String(Math.round(right)) })
  }
  if (top !== null) {
    labels.push({ x: rect.x + rect.width / 2, y: rect.y - top / 2, text: String(Math.round(top)) })
  }
  if (bottom !== null) {
    labels.push({ x: rect.x + rect.width / 2, y: rect.y + rect.height + bottom / 2, text: String(Math.round(bottom)) })
  }
  return labels
}

/** Insertion index along a stack, using sibling midpoints. */
export function insertionIndex(pointer: number, starts: readonly number[], sizes: readonly number[]): number {
  const count = Math.min(starts.length, sizes.length)
  for (let index = 0; index < count; index += 1) {
    const mid = starts[index] + sizes[index] / 2
    if (pointer < mid) return index
  }
  return count
}

export function placeFrames(
  frames: readonly { id: string; width: number; height: number }[],
  gap: number,
): Array<{ id: string; x: number; y: number; width: number; height: number }> {
  let x = 0
  return frames.map((frame) => {
    const placed = { id: frame.id, x, y: 0, width: frame.width, height: frame.height }
    x += frame.width + gap
    return placed
  })
}

export function boundsOf(rects: readonly Rect[]): Rect {
  if (rects.length === 0) return { x: 0, y: 0, width: 1, height: 1 }
  const left = Math.min(...rects.map((rect) => rect.x))
  const top = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  return { x: left, y: top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) }
}

export function zoomAtPoint(
  zoom: number,
  panX: number,
  panY: number,
  cursorX: number,
  cursorY: number,
  nextZoom: number,
): View {
  const z = clampZoom(nextZoom)
  const safe = zoom === 0 ? 1 : zoom
  const worldX = (cursorX - panX) / safe
  const worldY = (cursorY - panY) / safe
  return { zoom: z, panX: cursorX - worldX * z, panY: cursorY - worldY * z }
}

export function zoomToFit(viewport: { width: number; height: number }, content: Rect, padding: number): View {
  const availW = Math.max(1, viewport.width - padding * 2)
  const availH = Math.max(1, viewport.height - padding * 2)
  const zoom = clampZoom(Math.min(availW / content.width, availH / content.height, 1))
  return {
    zoom,
    panX: (viewport.width - content.width * zoom) / 2 - content.x * zoom,
    panY: (viewport.height - content.height * zoom) / 2 - content.y * zoom,
  }
}

function collectAxis(obstacles: readonly Rect[], parent: Rect, axis: 'x' | 'y'): number[] {
  const targets = [parent[axis]]
  if (axis === 'x') {
    targets.push(parent.x + parent.width, parent.x + parent.width / 2)
    for (const item of obstacles) targets.push(item.x, item.x + item.width, item.x + item.width / 2)
  } else {
    targets.push(parent.y + parent.height, parent.y + parent.height / 2)
    for (const item of obstacles) targets.push(item.y, item.y + item.height, item.y + item.height / 2)
  }
  return targets
}

function snapEdges(
  start: number,
  size: number,
  targets: readonly number[],
  threshold: number,
  orientation: Guide['orientation'],
): { delta: number; guides: Guide[] } {
  const edges = [start, start + size / 2, start + size]
  let best: { delta: number; target: number } | null = null
  for (const edge of edges) {
    const snap = nearest(edge, targets, threshold)
    if (!snap) continue
    if (!best || Math.abs(snap.delta) < Math.abs(best.delta)) best = snap
  }
  if (!best || best.delta === 0) return { delta: 0, guides: [] }
  return {
    delta: best.delta,
    guides: [{ orientation, position: best.target, from: 0, to: 0 }],
  }
}

function nearest(value: number, targets: readonly number[], threshold: number): { delta: number; target: number } | null {
  let best: { delta: number; target: number } | null = null
  for (const target of targets) {
    const delta = target - value
    if (Math.abs(delta) > threshold) continue
    if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { delta, target }
  }
  return best
}

function verticalGuide(x: number, rect: Rect, parent: Rect): Guide {
  return {
    orientation: 'v',
    position: x,
    from: Math.min(rect.y, parent.y),
    to: Math.max(rect.y + rect.height, parent.y + parent.height),
  }
}

function horizontalGuide(y: number, rect: Rect, parent: Rect): Guide {
  return {
    orientation: 'h',
    position: y,
    from: Math.min(rect.x, parent.x),
    to: Math.max(rect.x + rect.width, parent.x + parent.width),
  }
}

function overlaps(a: number, aSize: number, b: number, bSize: number): boolean {
  return a < b + bSize && a + aSize > b
}

function nearestPositive(gaps: number[]): number | null {
  let best: number | null = null
  for (const gap of gaps) {
    if (gap <= 0.5) continue
    if (best === null || gap < best) best = gap
  }
  return best
}
