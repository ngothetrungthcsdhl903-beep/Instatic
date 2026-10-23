/**
 * Keijam commands and manual edits share the editor undo stack.
 * The command result carries the diff the agent uses to confirm the edit.
 */
import { describe, expect, it, beforeEach } from 'bun:test'
import '@modules/base/body'
import '@modules/base/container'
import '@modules/base/image'
import '@modules/base/text'
import { useEditorStore } from '@site/store/store'
import { executeKeijamTool } from '../../admin/pages/site/keijam/agentCommands'

function pageNodes() {
  return useEditorStore.getState().site!.pages[0].nodes
}

beforeEach(() => {
  useEditorStore.getState().clearSite()
  useEditorStore.setState({
    selectedNodeId: null,
    selectedNodeIds: [],
    hoveredNodeId: null,
  })
})

describe('Keijam design commands', () => {
  it('creates a stack, reports the diff, and shares undo with a manual edit', async () => {
    const site = useEditorStore.getState().createSite('Keijam')
    const rootId = site.pages[0].rootNodeId
    const before = Object.keys(site.pages[0].nodes).length

    const created = await executeKeijamTool('keijam_create_node', {
      kind: 'frame',
      parentId: rootId,
      name: 'Hero',
      layout: { mode: 'stack', direction: 'column', gap: 16, padding: 24 },
      style: { backgroundColor: '#ffffff', radius: 12 },
    })
    expect(created.ok).toBe(true)
    const data = created.data as {
      nodeIds: string[]
      diff: { added: string[]; changed: Array<{ id: string; fields: string[] }> }
      snapshot: Array<{ id: string; name: string; layout: { mode: string; gap: number; paddingTop: number } }>
      proof: null
    }
    const id = data.nodeIds[0]
    expect(id).toBeTruthy()
    expect(data.diff.added).toContain(id)
    expect(data.snapshot.find((node) => node.id === id)?.layout).toMatchObject({
      mode: 'stack',
      gap: 16,
      paddingTop: 24,
    })
    expect(data.snapshot.find((node) => node.id === id)?.name).toBe('Hero')
    expect(data.proof).toBeNull()

    const manualId = useEditorStore.getState().insertNode('base.text', { text: 'Manual' }, rootId)
    expect(pageNodes()[manualId]).toBeTruthy()
    useEditorStore.getState().undo()
    expect(pageNodes()[manualId]).toBeUndefined()
    expect(pageNodes()[id]).toBeTruthy()

    // One Keijam command writes the node and its class as separate steps on
    // the same stack. Drain them with the agent undo command.
    let guard = 0
    while (pageNodes()[id] && useEditorStore.getState().canUndo && guard < 40) {
      const step = await executeKeijamTool('keijam_undo', {})
      expect(step.ok).toBe(true)
      guard += 1
    }
    expect(pageNodes()[id]).toBeUndefined()
    expect(Object.keys(pageNodes()).length).toBe(before)

    guard = 0
    while (!pageNodes()[id] && useEditorStore.getState().canRedo && guard < 40) {
      const step = await executeKeijamTool('keijam_redo', {})
      expect(step.ok).toBe(true)
      guard += 1
    }
    expect(pageNodes()[id]).toBeTruthy()
  })

  it('updates sizing, selects the node, and exports the page without a script', async () => {
    const site = useEditorStore.getState().createSite('Keijam')
    const rootId = site.pages[0].rootNodeId
    const created = await executeKeijamTool('keijam_create_node', {
      kind: 'text',
      parentId: rootId,
      text: 'Hello',
    })
    const id = (created.data as { nodeIds: string[] }).nodeIds[0]
    const sized = await executeKeijamTool('keijam_set_sizing', {
      nodeId: id,
      width: { mode: 'fixed', px: 240 },
      height: { mode: 'fit' },
    })
    expect(sized.ok).toBe(true)
    const sizedData = sized.data as {
      diff: { changed: Array<{ id: string; fields: string[] }> }
      snapshot: Array<{ id: string; layout: { width: { mode: string; px: number }; height: { mode: string } } }>
    }
    expect(sizedData.diff.changed.some((change) => change.id === id && change.fields.includes('layout'))).toBe(true)
    expect(sizedData.snapshot.find((node) => node.id === id)?.layout.width).toEqual({ mode: 'fixed', px: 240 })
    expect(sizedData.snapshot.find((node) => node.id === id)?.layout.height.mode).toBe('fit')

    const selected = await executeKeijamTool('keijam_select', { nodeIds: [id] })
    expect(selected.ok).toBe(true)
    expect(useEditorStore.getState().selectedNodeIds).toEqual([id])
    const read = await executeKeijamTool('keijam_get_selection', {})
    expect((read.data as { nodeIds: string[] }).nodeIds).toEqual([id])

    const exported = await executeKeijamTool('keijam_export', {})
    expect(exported.ok).toBe(true)
    const clean = exported.data as { html: string; gzipBytes: number; withinBudget: boolean }
    expect(clean.html).toContain('Hello')
    expect(clean.html).not.toContain('<script')
    expect(clean.withinBudget).toBe(true)
    expect(clean.gzipBytes).toBeLessThanOrEqual(80 * 1024)

    const removed = await executeKeijamTool('keijam_delete_node', { nodeId: id })
    expect(removed.ok).toBe(true)
    expect((removed.data as { diff: { removed: string[] } }).diff.removed).toContain(id)
    expect(pageNodes()[id]).toBeUndefined()
  })

  it('rejects an unknown breakpoint before writing', async () => {
    const site = useEditorStore.getState().createSite('Keijam')
    const rootId = site.pages[0].rootNodeId
    const result = await executeKeijamTool('keijam_set_breakpoint', {
      nodeId: rootId,
      breakpointId: 'missing',
      layout: { gap: 4 },
    })
    expect(result.ok).toBe(false)
  })
})
