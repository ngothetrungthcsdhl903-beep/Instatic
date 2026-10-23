import { describe, expect, it } from 'bun:test'
import {
  distanceLabels,
  insertionIndex,
  nudgeRect,
  placeFrames,
  resizeRect,
  snapMove,
  snapResize,
  zoomAtPoint,
  zoomToFit,
} from '../../keijam'

const parent = { x: 0, y: 0, width: 400, height: 300 }

describe('drag and snap math', () => {
  it('grows east and south without moving the origin', () => {
    const next = resizeRect({ x: 10, y: 20, width: 100, height: 80 }, 'se', 15, -4)
    expect(next).toEqual({ x: 10, y: 20, width: 115, height: 76 })
  })

  it('moves the origin when resizing from the west or north', () => {
    const next = resizeRect({ x: 40, y: 50, width: 100, height: 80 }, 'nw', -10, 12)
    expect(next).toEqual({ x: 30, y: 62, width: 110, height: 68 })
  })

  it('does not shrink past the minimum size', () => {
    const next = resizeRect({ x: 0, y: 0, width: 20, height: 20 }, 'w', 100, 0, 8)
    expect(next.width).toBe(20)
    expect(next.x).toBe(0)
  })

  it('nudges by the requested amount', () => {
    expect(nudgeRect({ x: 5, y: 5, width: 10, height: 10 }, 'right', 10).x).toBe(15)
    expect(nudgeRect({ x: 5, y: 5, width: 10, height: 10 }, 'up', 1).y).toBe(4)
  })

  it('snaps a moving edge to a sibling within the threshold', () => {
    const moving = { x: 103, y: 40, width: 50, height: 20 }
    const sibling = { x: 0, y: 40, width: 100, height: 20 }
    const snapped = snapMove(moving, [sibling], parent, 5)
    expect(snapped.rect.x).toBe(100)
    expect(snapped.rect.y).toBe(40)
    expect(snapped.guides.some((guide) => guide.orientation === 'v' && guide.position === 100)).toBe(true)
  })

  it('leaves a rectangle alone when nothing is close', () => {
    const moving = { x: 130, y: 40, width: 30, height: 20 }
    const sibling = { x: 0, y: 40, width: 80, height: 20 }
    const snapped = snapMove(moving, [sibling], parent, 5)
    expect(snapped.rect).toEqual(moving)
    expect(snapped.guides).toEqual([])
  })

  it('snaps a resized edge to the parent', () => {
    const resized = snapResize({ x: 10, y: 10, width: 385, height: 40 }, 'e', [], parent, 5)
    expect(resized.rect.width).toBe(390)
    expect(resized.guides[0]).toMatchObject({ orientation: 'v', position: 400 })
  })

  it('labels the gap to a sibling on the left', () => {
    const labels = distanceLabels(
      { x: 100, y: 10, width: 40, height: 20 },
      [{ x: 0, y: 10, width: 80, height: 20 }],
      parent,
    )
    expect(labels.some((label) => label.text === '20')).toBe(true)
  })

  it('picks a stack insertion index from sibling midpoints', () => {
    expect(insertionIndex(40, [0, 100], [100, 100])).toBe(0)
    expect(insertionIndex(60, [0, 100], [100, 100])).toBe(1)
    expect(insertionIndex(160, [0, 100], [100, 100])).toBe(2)
  })

  it('places breakpoint frames side by side', () => {
    const frames = placeFrames(
      [
        { id: 'mobile', width: 375, height: 800 },
        { id: 'desktop', width: 1200, height: 800 },
      ],
      80,
    )
    expect(frames[0]).toMatchObject({ x: 0, width: 375 })
    expect(frames[1]).toMatchObject({ x: 455, width: 1200 })
  })

  it('keeps the cursor point fixed while zooming', () => {
    const next = zoomAtPoint(1, 0, 0, 100, 80, 2)
    expect(next.zoom).toBe(2)
    expect(next.panX).toBe(-100)
    expect(next.panY).toBe(-80)
    const worldX = (100 - next.panX) / next.zoom
    expect(worldX).toBe(100)
  })

  it('fits a content box inside the viewport with padding', () => {
    const view = zoomToFit({ width: 1000, height: 600 }, { x: 0, y: 0, width: 2000, height: 800 }, 40)
    expect(view.zoom).toBeCloseTo(0.46, 2)
    expect(view.panX).toBeGreaterThan(0)
    expect(view.panY).toBeGreaterThan(0)
  })
})
