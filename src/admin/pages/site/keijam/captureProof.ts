/**
 * Verify-after-edit capture for the Keijam canvas.
 *
 * When the design surface is mounted, wait one paint and screenshot the
 * affected node. When it is not mounted, return immediately so a headless
 * tool call is not charged a frame timeout. The structural diff is always
 * returned by the command, with or without this image.
 */

import { getErrorMessage } from '@core/utils/errorMessage'

export interface KeijamProof {
  rect: { x: number; y: number; width: number; height: number } | null
  screenshot: { mimeType: string; data: string; width: number; height: number } | null
  reason: string | null
}

export async function captureKeijamProof(nodeId: string, breakpointId: string): Promise<KeijamProof | null> {
  if (typeof document === 'undefined') return null
  if (!document.querySelector('[data-kj-shell]')) return null
  await nextPaint()
  const frame = document.querySelector(`[data-kj-frame="${escapeAttr(breakpointId)}"]`)
  if (!(frame instanceof HTMLElement)) {
    return { rect: null, screenshot: null, reason: 'Keijam frame is not mounted.' }
  }
  const node = frame.querySelector(`[data-kj-node="${escapeAttr(nodeId)}"]`)
  if (!(node instanceof HTMLElement)) {
    return { rect: null, screenshot: null, reason: 'Node is not mounted in the Keijam frame.' }
  }
  const box = node.getBoundingClientRect()
  const rect = { x: box.x, y: box.y, width: box.width, height: box.height }
  try {
    const { toCanvas } = await import('html-to-image')
    const canvas = await toCanvas(node, { pixelRatio: 1, cacheBust: true })
    const dataUrl = canvas.toDataURL('image/png')
    const marker = 'base64,'
    const index = dataUrl.indexOf(marker)
    return {
      rect,
      reason: null,
      screenshot: {
        mimeType: 'image/png',
        data: index >= 0 ? dataUrl.slice(index + marker.length) : dataUrl,
        width: canvas.width,
        height: canvas.height,
      },
    }
  } catch (err) {
    return { rect, screenshot: null, reason: getErrorMessage(err, 'Screenshot capture failed.') }
  }
}

function escapeAttr(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return value.replace(/["\\]/g, '\\$&')
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const timer = setTimeout(done, 48)
    if (typeof requestAnimationFrame !== 'function') return
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clearTimeout(timer)
        done()
      })
    })
  })
}
