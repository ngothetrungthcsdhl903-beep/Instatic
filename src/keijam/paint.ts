/**
 * Dirty-region bookkeeping. A paint stamp is the last signature drawn for
 * a node. The canvas skips treating a node as dirty when the signature
 * matches. Removed ids are dirty so their parent can drop them.
 */

export interface PaintStamp {
  id: string
  signature: string
}

/** Stable across renders when every signature matches. Signatures are JSON, so they contain no raw newlines. */
export function encodeStamps(stamps: readonly PaintStamp[]): string {
  return stamps.map((stamp) => `${stamp.id}\n${stamp.signature}`).join('\n\n')
}

export function decodeStamps(encoded: string): PaintStamp[] {
  if (!encoded) return []
  return encoded.split('\n\n').map((row) => {
    const split = row.indexOf('\n')
    return { id: row.slice(0, split), signature: row.slice(split + 1) }
  })
}

export function dirtyIds(previous: readonly PaintStamp[], next: readonly PaintStamp[]): string[] {
  const prior = new Map(previous.map((stamp) => [stamp.id, stamp.signature]))
  const nextIds = new Set<string>()
  const dirty: string[] = []
  for (const stamp of next) {
    nextIds.add(stamp.id)
    if (prior.get(stamp.id) !== stamp.signature) dirty.push(stamp.id)
  }
  for (const id of prior.keys()) {
    if (!nextIds.has(id)) dirty.push(id)
  }
  return dirty
}

export function paintSignature(parts: {
  layout: unknown
  text: string
  src: string
  hidden: boolean
  childIds: readonly string[]
  selected: boolean
}): string {
  return JSON.stringify([
    parts.layout,
    parts.text,
    parts.src,
    parts.hidden,
    parts.childIds,
    parts.selected,
  ])
}
