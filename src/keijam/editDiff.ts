/**
 * Before/after snapshot of a design node, and the diff an agent reads
 * after an edit. Layout is part of the snapshot so a stack or size change
 * shows up without a second read.
 */

import type { KeijamLayout } from './layout'

export interface DesignNodeSnapshot {
  id: string
  moduleId: string
  name: string
  parentId: string | null
  childIds: string[]
  hidden: boolean
  text: string
  src: string
  layout: KeijamLayout
}

export interface DesignNodeChange {
  id: string
  fields: string[]
}

export interface DesignEditDiff {
  added: string[]
  removed: string[]
  changed: DesignNodeChange[]
}

const COMPARED_FIELDS = ['moduleId', 'name', 'parentId', 'hidden', 'text', 'src', 'childIds', 'layout'] as const

export function diffDesignNodes(
  before: readonly DesignNodeSnapshot[],
  after: readonly DesignNodeSnapshot[],
): DesignEditDiff {
  const previous = new Map(before.map((node) => [node.id, node]))
  const nextIds = new Set(after.map((node) => node.id))
  const added: string[] = []
  const changed: DesignNodeChange[] = []
  for (const node of after) {
    const prior = previous.get(node.id)
    if (!prior) {
      added.push(node.id)
      continue
    }
    const fields = fieldsThatDiffer(prior, node)
    if (fields.length > 0) changed.push({ id: node.id, fields })
  }
  const removed = before.filter((node) => !nextIds.has(node.id)).map((node) => node.id)
  return { added, removed, changed }
}

export function dirtyNodeIds(diff: DesignEditDiff): string[] {
  return [...diff.added, ...diff.removed, ...diff.changed.map((change) => change.id)]
}

function fieldsThatDiffer(before: DesignNodeSnapshot, after: DesignNodeSnapshot): string[] {
  const fields: string[] = []
  for (const field of COMPARED_FIELDS) {
    const left = field === 'childIds' || field === 'layout' ? JSON.stringify(before[field]) : before[field]
    const right = field === 'childIds' || field === 'layout' ? JSON.stringify(after[field]) : after[field]
    if (left !== right) fields.push(field)
  }
  return fields
}
