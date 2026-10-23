/**
 * Browser runners for the Keijam design commands.
 *
 * Every mutation goes through the same store actions the canvas uses
 * (`insertNode`, `commitLayout`, `deleteNode`, `undo`, `redo`), so agent
 * edits and manual edits share one Y.UndoManager. After a mutation the
 * runner returns a structural diff plus, when the Keijam canvas is open,
 * a screenshot of the affected node.
 */

import { parseValue } from '@core/utils/typeboxHelpers'
import {
  aiToolError,
  aiToolOk,
  type AiToolImage,
  type AiToolOutput,
  KeijamCreateComponentInputSchema,
  KeijamCreateNodeInputSchema,
  KeijamDeleteComponentInputSchema,
  KeijamDeleteNodeInputSchema,
  KeijamExportInputSchema,
  KeijamGenerateComponentInputSchema,
  KeijamGetNodeInputSchema,
  KeijamPasteComponentInputSchema,
  KeijamSetEffectInputSchema,
  KeijamSetMotionInputSchema,
  KeijamInsertComponentInputSchema,
  KeijamListNodesInputSchema,
  KeijamSelectInputSchema,
  KeijamSetBreakpointInputSchema,
  KeijamSetLayoutInputSchema,
  KeijamSetSizingInputSchema,
  KeijamSetStyleInputSchema,
  KeijamUpdateNodeInputSchema,
  SetColorTokensInputSchema,
  SetFontTokensInputSchema,
  SetSpacingScaleInputSchema,
  SetTypeScaleInputSchema,
} from '@core/ai'
import { registry } from '@core/module-engine'
import { getNodeDisplayName, type Breakpoint, type PageNode, type SiteDocument, type StyleRule } from '@core/page-tree'
import { getErrorMessage } from '@core/utils/errorMessage'
import {
  applyLayoutPatch,
  componentFromDescription,
  componentIdent,
  diffDesignNodes,
  exportCleanDocument,
  MOTION_FILE_PATH,
  MotionMachineSchema,
  motionAttributeValue,
  parseCodeComponent,
  parseMotionDocument,
  type DesignNodeSnapshot,
  type LayoutPatch,
  type StylePatch,
} from '../../../../keijam'
import { editorState } from '../agent/editorState'
import { selectActiveCanvasPage } from '@site/store/selectors'
import {
  runSetColorTokens,
  runSetFontTokens,
  runSetSpacingScale,
  runSetTypeScale,
} from '../agent/tokenRunners'
import { captureKeijamProof } from './captureProof'
import {
  commitLayout,
  insertKeijamNode,
  layoutContextFor,
  readNodeLayout,
} from './layoutBridge'

interface FrameContext {
  breakpointId: string
  isBase: boolean
}

const EMPTY_BREAKPOINTS: Breakpoint[] = []
const EMPTY_COMPONENTS: NonNullable<SiteDocument['visualComponents']> = []

export async function executeKeijamTool(toolName: string, rawInput: unknown): Promise<AiToolOutput> {
  try {
    switch (toolName) {
      case 'keijam_create_node':
        return await runCreate(parseValue(KeijamCreateNodeInputSchema, rawInput))
      case 'keijam_update_node':
        return await runUpdate(parseValue(KeijamUpdateNodeInputSchema, rawInput))
      case 'keijam_delete_node':
        return await runDelete(parseValue(KeijamDeleteNodeInputSchema, rawInput))
      case 'keijam_set_layout':
        return await runSetLayout(parseValue(KeijamSetLayoutInputSchema, rawInput))
      case 'keijam_set_sizing':
        return await runSetSizing(parseValue(KeijamSetSizingInputSchema, rawInput))
      case 'keijam_set_style':
        return await runSetStyle(parseValue(KeijamSetStyleInputSchema, rawInput))
      case 'keijam_set_breakpoint':
        return await runSetBreakpoint(parseValue(KeijamSetBreakpointInputSchema, rawInput))
      case 'keijam_select':
        return runSelect(parseValue(KeijamSelectInputSchema, rawInput))
      case 'keijam_get_selection':
        return runGetSelection()
      case 'keijam_get_node':
        return runGetNode(parseValue(KeijamGetNodeInputSchema, rawInput))
      case 'keijam_list_nodes':
        return runListNodes(parseValue(KeijamListNodesInputSchema, rawInput))
      case 'keijam_create_component':
        return await runCreateComponent(parseValue(KeijamCreateComponentInputSchema, rawInput))
      case 'keijam_insert_component':
        return await runInsertComponent(parseValue(KeijamInsertComponentInputSchema, rawInput))
      case 'keijam_delete_component':
        return await runDeleteComponent(parseValue(KeijamDeleteComponentInputSchema, rawInput))
      case 'keijam_list_components':
        return runListComponents()
      case 'keijam_set_color_tokens':
        return tokenResult('color', runSetColorTokens(parseValue(SetColorTokensInputSchema, rawInput)))
      case 'keijam_set_font_tokens':
        return tokenResult('font', await runSetFontTokens(parseValue(SetFontTokensInputSchema, rawInput)))
      case 'keijam_set_type_scale':
        return tokenResult('type', runSetTypeScale(parseValue(SetTypeScaleInputSchema, rawInput)))
      case 'keijam_set_spacing_scale':
        return tokenResult('spacing', runSetSpacingScale(parseValue(SetSpacingScaleInputSchema, rawInput)))
      case 'keijam_generate_component':
        return await runGenerate(parseValue(KeijamGenerateComponentInputSchema, rawInput))
      case 'keijam_paste_component':
        return await runPaste(parseValue(KeijamPasteComponentInputSchema, rawInput))
      case 'keijam_set_effect':
        return await runEffect(parseValue(KeijamSetEffectInputSchema, rawInput))
      case 'keijam_set_motion':
        return await runMotion(parseValue(KeijamSetMotionInputSchema, rawInput))
      case 'keijam_export':
        return await runExport(parseValue(KeijamExportInputSchema, rawInput).pageId)
      case 'keijam_undo':
        return await runHistory('undo')
      case 'keijam_redo':
        return await runHistory('redo')
      default:
        return aiToolError(`Unknown Keijam tool: ${toolName}`)
    }
  } catch (err) {
    return aiToolError(getErrorMessage(err, 'Keijam command failed.'))
  }
}

async function runCreate(input: {
  kind: 'frame' | 'text' | 'image'
  parentId?: string
  index?: number
  name?: string
  text?: string
  src?: string
  layout?: LayoutPatch
  style?: StylePatch
  breakpointId?: string
}): Promise<AiToolOutput> {
  const frame = frameContext(input.breakpointId)
  const before = captureSnapshots(frame)
  const parentId = resolveParent(input.parentId)
  const id = insertKeijamNode(input.kind, parentId, frame.breakpointId, frame.isBase, input.index)
  if (!id) return aiToolError('Could not create the node.')
  writeProps(id, input)
  if (input.layout || input.style) writeLayout(id, input.layout, input.style, frame)
  return finishEdit(before, [id], frame)
}

async function runUpdate(input: {
  nodeId: string
  name?: string
  text?: string
  src?: string
  layout?: LayoutPatch
  style?: StylePatch
  breakpointId?: string
}): Promise<AiToolOutput> {
  const frame = frameContext(input.breakpointId)
  requireNode(input.nodeId)
  const before = captureSnapshots(frame)
  writeProps(input.nodeId, input)
  if (input.layout || input.style) writeLayout(input.nodeId, input.layout, input.style, frame)
  return finishEdit(before, [input.nodeId], frame)
}

async function runDelete(input: { nodeId: string }): Promise<AiToolOutput> {
  const frame = frameContext()
  requireNode(input.nodeId)
  const before = captureSnapshots(frame)
  editorState().deleteNode(input.nodeId)
  return finishEdit(before, [input.nodeId], frame)
}

async function runSetLayout(input: { nodeId: string; layout: LayoutPatch; breakpointId?: string }): Promise<AiToolOutput> {
  const frame = frameContext(input.breakpointId)
  requireNode(input.nodeId)
  const before = captureSnapshots(frame)
  writeLayout(input.nodeId, input.layout, undefined, frame)
  return finishEdit(before, [input.nodeId], frame)
}

async function runSetSizing(input: {
  nodeId: string
  width?: LayoutPatch['width']
  height?: LayoutPatch['height']
  breakpointId?: string
}): Promise<AiToolOutput> {
  const frame = frameContext(input.breakpointId)
  requireNode(input.nodeId)
  const before = captureSnapshots(frame)
  writeLayout(input.nodeId, { width: input.width, height: input.height }, undefined, frame)
  return finishEdit(before, [input.nodeId], frame)
}

async function runSetStyle(input: { nodeId: string; style: StylePatch; breakpointId?: string }): Promise<AiToolOutput> {
  const frame = frameContext(input.breakpointId)
  requireNode(input.nodeId)
  const before = captureSnapshots(frame)
  writeLayout(input.nodeId, undefined, input.style, frame)
  return finishEdit(before, [input.nodeId], frame)
}

async function runSetBreakpoint(input: {
  nodeId: string
  breakpointId: string
  layout?: LayoutPatch
  style?: StylePatch
}): Promise<AiToolOutput> {
  const frame = frameContext(input.breakpointId)
  requireNode(input.nodeId)
  editorState().setActiveBreakpoint(frame.breakpointId)
  const before = captureSnapshots(frame)
  writeLayout(input.nodeId, input.layout, input.style, frame)
  return finishEdit(before, [input.nodeId], frame)
}

function runSelect(input: { nodeIds: string[] }): AiToolOutput {
  const store = editorState()
  const page = requirePage()
  for (const id of input.nodeIds) {
    if (!page.nodes[id]) return aiToolError(`Node not found: ${id}`)
  }
  if (input.nodeIds.length === 0) store.selectNode(null)
  else {
    store.selectNode(input.nodeIds[0] ?? null, 'replace')
    for (const id of input.nodeIds.slice(1)) store.selectNode(id, 'toggle')
  }
  return aiToolOk({
    nodeIds: editorState().selectedNodeIds,
    snapshot: selectedSnapshots(frameContext()),
  })
}

function runGetSelection(): AiToolOutput {
  const frame = frameContext()
  return aiToolOk({
    nodeIds: editorState().selectedNodeIds,
    snapshot: selectedSnapshots(frame),
  })
}

function runGetNode(input: { nodeId: string; breakpointId?: string }): AiToolOutput {
  const frame = frameContext(input.breakpointId)
  requireNode(input.nodeId)
  const snapshot = captureSnapshots(frame).find((node) => node.id === input.nodeId) ?? null
  return aiToolOk({ snapshot })
}

function runListNodes(input: { parentId?: string; query?: string; breakpointId?: string }): AiToolOutput {
  const frame = frameContext(input.breakpointId)
  const page = requirePage()
  if (input.parentId && !page.nodes[input.parentId]) return aiToolError(`Parent not found: ${input.parentId}`)
  const query = input.query?.trim().toLowerCase()
  const snapshot = captureSnapshots(frame).filter((node) => {
    if (input.parentId && node.parentId !== input.parentId) return false
    if (!query) return true
    return node.name.toLowerCase().includes(query) || node.text.toLowerCase().includes(query) || node.id === query
  })
  return aiToolOk({ snapshot })
}

async function runCreateComponent(input: { name: string; nodeId?: string }): Promise<AiToolOutput> {
  const frame = frameContext()
  const before = captureSnapshots(frame)
  const store = editorState()
  const componentId = input.nodeId
    ? store.convertNodeToComponent(input.nodeId, input.name)
    : store.createVisualComponent(input.name)
  return finishEdit(before, input.nodeId ? [input.nodeId] : [], frame, { componentId })
}

async function runInsertComponent(input: { componentId: string; parentId?: string; index?: number }): Promise<AiToolOutput> {
  const frame = frameContext()
  const before = captureSnapshots(frame)
  const parentId = resolveParent(input.parentId)
  const id = editorState().insertComponentRef(parentId, input.componentId, input.index)
  if (!id) return aiToolError(`Could not insert component ${input.componentId}.`)
  return finishEdit(before, [id], frame, { componentId: input.componentId })
}

async function runDeleteComponent(input: { componentId: string }): Promise<AiToolOutput> {
  const frame = frameContext()
  const before = captureSnapshots(frame)
  editorState().deleteVisualComponent(input.componentId)
  return finishEdit(before, [], frame, { componentId: input.componentId })
}

function runListComponents(): AiToolOutput {
  const components = editorState().site?.visualComponents ?? EMPTY_COMPONENTS
  return aiToolOk({
    components: components.map((component) => ({ id: component.id, name: component.name })),
  })
}

async function runExport(pageId: string | undefined): Promise<AiToolOutput> {
  const site = editorState().site
  if (!site) return aiToolError('No site is open in the editor.')
  const page = pageId
    ? site.pages.find((candidate) => candidate.id === pageId)
    : selectActiveCanvasPage(editorState())
  if (!page) return aiToolError(pageId ? `Page not found: ${pageId}` : 'No page is open in the editor.')
  const clean = await exportCleanDocument(page, site, registry)
  return aiToolOk(clean)
}

async function runGenerate(input: {
  description: string
  name?: string
  parentId?: string
}): Promise<AiToolOutput> {
  const frame = frameContext()
  const before = captureSnapshots(frame)
  const parentId = resolveParent(input.parentId)
  const id = insertKeijamNode('frame', parentId, frame.breakpointId, frame.isBase)
  if (!id) return aiToolError('Could not create the component frame.')
  const ident = componentIdent(input.name, input.description)
  const source = componentFromDescription(input.description, ident)
  const fileId = writeComponentFile(ident, source)
  bindCode(id, fileId, source)
  const parsed = parseCodeComponent(source)
  return finishEdit(before, [id], frame, {
    fileId,
    component: parsed.name,
    controls: parsed.controls.map((control) => control.key),
  })
}

async function runPaste(input: {
  source: string
  name?: string
  nodeId?: string
  parentId?: string
}): Promise<AiToolOutput> {
  const parsed = parseCodeComponent(input.source)
  if (parsed.kind === 'unknown') return aiToolError(parsed.warnings[0] ?? 'Unrecognized component.')
  const frame = frameContext()
  const before = captureSnapshots(frame)
  let nodeId = input.nodeId
  if (nodeId) requireNode(nodeId)
  else {
    nodeId = insertKeijamNode('frame', resolveParent(input.parentId), frame.breakpointId, frame.isBase)
  }
  if (!nodeId) return aiToolError('Could not bind the component.')
  const fileId = writeComponentFile(componentIdent(input.name, parsed.name), input.source)
  if (parsed.kind === 'component') bindCode(nodeId, fileId, input.source)
  else writeAttr(nodeId, 'data-kj-code', fileId)
  return finishEdit(before, [nodeId], frame, {
    fileId,
    kind: parsed.kind,
    warnings: parsed.warnings,
    controls: parsed.controls.map((control) => control.key),
  })
}

async function runEffect(input: { nodeId: string; effect: 'none' | 'webgl' | 'three' | 'gsap' }): Promise<AiToolOutput> {
  const frame = frameContext()
  requireNode(input.nodeId)
  const before = captureSnapshots(frame)
  writeAttr(input.nodeId, 'data-kj-effect', input.effect === 'none' ? null : input.effect)
  return finishEdit(before, [input.nodeId], frame, { effect: input.effect })
}

async function runMotion(input: { nodeId: string; machine: unknown }): Promise<AiToolOutput> {
  const frame = frameContext()
  requireNode(input.nodeId)
  const machine = parseValue(MotionMachineSchema, input.machine)
  const before = captureSnapshots(frame)
  const store = editorState()
  const files = store.site?.files
  if (!files) return aiToolError('No site is open.')
  const existing = files.find((file) => file.path === MOTION_FILE_PATH)
  const doc = parseMotionDocument(existing?.content)
  doc.byNodeId[input.nodeId] = machine
  const text = JSON.stringify(doc)
  if (existing) store.updateFileContent(existing.id, text)
  else store.createFile(MOTION_FILE_PATH, 'config', text)
  writeAttr(input.nodeId, 'data-kj-motion', motionAttributeValue(input.nodeId))
  return finishEdit(before, [input.nodeId], frame, { states: machine.states.map((state) => state.id) })
}

function writeComponentFile(ident: string, source: string): string {
  const store = editorState()
  const files = store.site?.files
  if (!files) throw new Error('No site is open.')
  let path = `src/components/${ident}.tsx`
  let suffix = 2
  while (files.some((file) => file.path === path)) {
    path = `src/components/${ident}-${suffix}.tsx`
    suffix += 1
  }
  return store.createFile(path, 'component', source)
}

function bindCode(nodeId: string, fileId: string, source: string): void {
  const parsed = parseCodeComponent(source)
  writeAttr(nodeId, 'data-kj-code', fileId)
  writeAttr(nodeId, 'data-kj-values', JSON.stringify(parsed.defaults))
}

function writeAttr(nodeId: string, name: string, value: string | null): void {
  const node = requireNode(nodeId)
  const raw = node.props.htmlAttributes
  const attrs: Record<string, string> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, current] of Object.entries(raw)) {
      if (typeof current === 'string') attrs[key] = current
    }
  }
  if (value === null) delete attrs[name]
  else attrs[name] = value
  editorState().updateNodeProps(nodeId, { htmlAttributes: attrs })
}

async function runHistory(direction: 'undo' | 'redo'): Promise<AiToolOutput> {
  const frame = frameContext()
  const before = captureSnapshots(frame)
  const store = editorState()
  if (direction === 'undo') store.undo()
  else store.redo()
  const after = editorState()
  return finishEdit(before, [], frame, { canUndo: after.canUndo, canRedo: after.canRedo })
}

function tokenResult(kind: 'color' | 'font' | 'type' | 'spacing', result: AiToolOutput): AiToolOutput {
  if (!result.ok) return result
  return aiToolOk({
    target: 'tokens',
    kind,
    diff: { target: 'tokens', kind },
    snapshot: result.data ?? null,
  })
}

async function finishEdit(
  before: DesignNodeSnapshot[],
  focusIds: string[],
  frame: FrameContext,
  extra?: Record<string, unknown>,
): Promise<AiToolOutput> {
  const after = captureSnapshots(frame)
  const diff = diffDesignNodes(before, after)
  const focus = new Set<string>([...focusIds, ...diff.added, ...diff.changed.map((change) => change.id)])
  const snapshot = after.filter((node) => focus.has(node.id))
  const proofId = focusIds.find((id) => after.some((node) => node.id === id)) ?? diff.added[0]
  const proof = proofId ? await captureKeijamProof(proofId, frame.breakpointId) : null
  const images: AiToolImage[] | undefined = proof?.screenshot
    ? [{ mimeType: proof.screenshot.mimeType, data: proof.screenshot.data }]
    : undefined
  return aiToolOk({
    ...extra,
    nodeIds: focusIds,
    breakpointId: frame.breakpointId,
    diff,
    snapshot,
    proof: proof
      ? { rect: proof.rect, captured: Boolean(proof.screenshot), reason: proof.reason }
      : null,
  }, images)
}

function writeProps(nodeId: string, input: { name?: string; text?: string; src?: string }): void {
  const store = editorState()
  if (input.name !== undefined) store.renameNode(nodeId, input.name)
  const patch: Record<string, unknown> = {}
  if (input.text !== undefined) patch.text = input.text
  if (input.src !== undefined) patch.src = input.src
  if (Object.keys(patch).length > 0) store.updateNodeProps(nodeId, patch)
}

function writeLayout(
  nodeId: string,
  layoutPatch: LayoutPatch | undefined,
  stylePatch: StylePatch | undefined,
  frame: FrameContext,
): void {
  const store = editorState()
  const page = requirePage()
  const node = page.nodes[nodeId]
  if (!node) throw new Error(`Node not found: ${nodeId}`)
  const rules = store.site?.styleRules
  const context = layoutContextFor(node, page.nodes, page.rootNodeId, rules, frame.breakpointId, frame.isBase)
  const current = readNodeLayout(node, rules, context, frame.breakpointId, frame.isBase)
  commitLayout(nodeId, applyLayoutPatch(current, layoutPatch, stylePatch), context, frame.breakpointId, frame.isBase)
}

function captureSnapshots(frame: FrameContext): DesignNodeSnapshot[] {
  const store = editorState()
  const page = selectActiveCanvasPage(store)
  if (!page) return []
  const rules = store.site?.styleRules
  const visualComponents = store.site?.visualComponents
  return Object.values(page.nodes).map((node) => snapshotNode(node, page.nodes, page.rootNodeId, rules, visualComponents, frame))
}

function selectedSnapshots(frame: FrameContext): DesignNodeSnapshot[] {
  const selected = new Set(editorState().selectedNodeIds)
  return captureSnapshots(frame).filter((node) => selected.has(node.id))
}

function snapshotNode(
  node: PageNode,
  nodes: Record<string, PageNode>,
  rootId: string,
  rules: Record<string, StyleRule> | undefined,
  visualComponents: SiteDocument['visualComponents'] | undefined,
  frame: FrameContext,
): DesignNodeSnapshot {
  const context = layoutContextFor(node, nodes, rootId, rules, frame.breakpointId, frame.isBase)
  return {
    id: node.id,
    moduleId: node.moduleId,
    name: getNodeDisplayName(node, registry.get(node.moduleId), visualComponents),
    parentId: node.parentId ?? null,
    childIds: [...node.children],
    hidden: Boolean(node.hidden),
    text: typeof node.props.text === 'string' ? node.props.text : '',
    src: typeof node.props.src === 'string' ? node.props.src : '',
    layout: readNodeLayout(node, rules, context, frame.breakpointId, frame.isBase),
  }
}

function frameContext(requested?: string): FrameContext {
  const store = editorState()
  const breakpoints = store.site?.breakpoints ?? EMPTY_BREAKPOINTS
  const breakpointId = requested || store.activeBreakpointId
  if (requested && !breakpoints.some((item) => item.id === requested)) {
    throw new Error(`Breakpoint not found: ${requested}`)
  }
  let widest = breakpoints[0]
  for (const item of breakpoints) {
    if (!widest || item.width > widest.width) widest = item
  }
  return {
    breakpointId,
    isBase: breakpoints.length === 0 || breakpointId === widest?.id,
  }
}

function requirePage() {
  const page = selectActiveCanvasPage(editorState())
  if (!page) throw new Error('No page is open in the editor.')
  return page
}

function requireNode(nodeId: string): PageNode {
  const page = requirePage()
  const node = page.nodes[nodeId]
  if (!node) throw new Error(`Node not found: ${nodeId}`)
  return node
}

function resolveParent(parentId: string | undefined): string {
  const page = requirePage()
  if (parentId) {
    if (!page.nodes[parentId]) throw new Error(`Parent not found: ${parentId}`)
    return parentId
  }
  const selected = editorState().selectedNodeId
  if (selected && page.nodes[selected]) {
    const node = page.nodes[selected]
    if (node.id === page.rootNodeId || node.moduleId === 'base.container' || node.moduleId === 'base.body') {
      return node.id
    }
    return node.parentId ?? page.rootNodeId
  }
  return page.rootNodeId
}
