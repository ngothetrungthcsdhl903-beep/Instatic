/**
 * Bridge between the Keijam layout model and the editor store.
 *
 * Layout is written into the node's scoped style class, and breakpoint
 * frames write context overrides. The publisher already turns those rules
 * into CSS, so the design surface does not invent a second output path.
 */

import type { CSSPropertyBag, PageNode, StyleRule } from '@core/page-tree'
import { styleRuleSelector } from '@core/page-tree'
import type { KeijamLayout, LayoutContext, Rect } from '../../../../keijam'
import {
  contextOverridePatch,
  defaultLayout,
  emptyInteractions,
  interactionsToCss,
  layoutToCss,
  mergeStyles,
  readInteractions,
  readLayout,
  replaceLayoutPatch,
} from '../../../../keijam'
import type { Interactions } from '../../../../keijam'
import { useEditorStore } from '@site/store/store'
import { selectActiveCanvasPage } from '@site/store/store'

type StyleMap = Record<string, StyleRule>

export function scopedRule(rules: StyleMap | undefined, nodeId: string): StyleRule | undefined {
  if (!rules) return undefined
  for (const rule of Object.values(rules)) {
    if (rule.scope?.type === 'node' && rule.scope.nodeId === nodeId && rule.scope.role === 'module-style') {
      return rule
    }
  }
  return undefined
}

export function layoutContextFor(
  node: PageNode,
  nodes: Record<string, PageNode>,
  rootId: string,
  rules: StyleMap | undefined,
  breakpointId: string,
  isBase: boolean,
): LayoutContext {
  if (node.id === rootId || !node.parentId || !nodes[node.parentId]) {
    return { parent: 'canvas', parentDirection: 'column' }
  }
  const parent = nodes[node.parentId]
  const parentContext = layoutContextFor(parent, nodes, rootId, rules, breakpointId, isBase)
  const parentLayout = readNodeLayout(parent, rules, parentContext, breakpointId, isBase)
  return { parent: parentLayout.mode, parentDirection: parentLayout.direction }
}

export function readNodeLayout(
  node: PageNode,
  rules: StyleMap | undefined,
  context: LayoutContext,
  breakpointId: string,
  isBase: boolean,
): KeijamLayout {
  const rule = scopedRule(rules, node.id)
  if (!rule) {
    if (context.parent === 'canvas') return defaultLayout('canvas')
    return readLayout(undefined, context)
  }
  const styles = isBase ? rule.styles : mergeStyles(rule.styles, rule.contextStyles?.[breakpointId])
  return readLayout(styles, context)
}

export function commitLayout(
  nodeId: string,
  layout: KeijamLayout,
  context: LayoutContext,
  breakpointId: string,
  isBase: boolean,
): void {
  ensureCanvasRoot(nodeId, breakpointId, isBase)
  const rule = ensureKeijamClass(nodeId)
  if (!rule) return
  const store = useEditorStore.getState()
  const next = layoutToCss(layout, context)
  if (isBase) {
    store.updateClassStyles(rule.id, replaceLayoutPatch(rule.styles, next) as Partial<CSSPropertyBag>)
    return
  }
  const base = layoutToCss(readLayout(rule.styles, context), context)
  store.setClassContextStyles(rule.id, breakpointId, contextOverridePatch(base, next) as Partial<CSSPropertyBag>)
}

export function readNodeInteractions(rules: StyleMap | undefined, nodeId: string): Interactions {
  const rule = scopedRule(rules, nodeId)
  if (!rule || !rules) return emptyInteractions()
  const selector = styleRuleSelector(rule)
  const hover = findAmbient(rules, `${selector}:hover`)
  const press = findAmbient(rules, `${selector}:active`)
  return readInteractions(rule.styles, hover?.styles, press?.styles)
}

export function commitInteractions(nodeId: string, interactions: Interactions): void {
  const rule = ensureKeijamClass(nodeId)
  if (!rule) return
  const selector = styleRuleSelector(rule)
  const css = interactionsToCss(selector, interactions)
  const store = useEditorStore.getState()
  const fresh = useEditorStore.getState().site?.styleRules[rule.id] ?? rule
  store.updateClassStyles(fresh.id, { transition: css.transition } as Partial<CSSPropertyBag>)
  writeAmbient(css.hover?.selector ?? `${selector}:hover`, css.hover?.styles ?? null)
  writeAmbient(css.press?.selector ?? `${selector}:active`, css.press?.styles ?? null)
}

export function insertKeijamNode(
  kind: 'frame' | 'text' | 'image',
  parentId: string,
  breakpointId: string,
  isBase: boolean,
): string {
  const store = useEditorStore.getState()
  const page = selectActiveCanvasPage(store)
  if (!page?.nodes[parentId]) return ''
  const moduleId = kind === 'frame' ? 'base.container' : kind === 'text' ? 'base.text' : 'base.image'
  const defaults = kind === 'text'
    ? { text: 'Text', tag: 'h2' }
    : kind === 'image'
      ? { src: '' }
      : { tag: 'div' }
  const id = store.insertNode(moduleId, defaults, parentId)
  if (!id) return ''
  const nextPage = selectActiveCanvasPage(useEditorStore.getState())
  const node = nextPage?.nodes[id]
  if (!node || !nextPage) return id
  const rules = useEditorStore.getState().site?.styleRules
  const context = layoutContextFor(node, nextPage.nodes, nextPage.rootNodeId, rules, breakpointId, isBase)
  const layout = defaultLayout(kind)
  const siblings = nextPage.nodes[parentId]?.children.length ?? 1
  layout.x = 48 + Math.max(0, siblings - 1) * 24
  layout.y = 48 + Math.max(0, siblings - 1) * 24
  if (context.parent !== 'free') layout.placed = false
  commitLayout(id, layout, context, breakpointId, isBase)
  useEditorStore.getState().selectNode(id)
  return id
}

export function nudgeSelected(direction: 'left' | 'right' | 'up' | 'down', amount: number, breakpointId: string, isBase: boolean): void {
  const store = useEditorStore.getState()
  const page = selectActiveCanvasPage(store)
  if (!page) return
  const rules = store.site?.styleRules
  const dx = direction === 'left' ? -amount : direction === 'right' ? amount : 0
  const dy = direction === 'up' ? -amount : direction === 'down' ? amount : 0
  for (const nodeId of store.selectedNodeIds) {
    if (nodeId === page.rootNodeId) continue
    const node = page.nodes[nodeId]
    if (!node || node.locked) continue
    const context = layoutContextFor(node, page.nodes, page.rootNodeId, rules, breakpointId, isBase)
    if (context.parent !== 'free') continue
    const layout = readNodeLayout(node, rules, context, breakpointId, isBase)
    commitLayout(nodeId, {
      ...layout,
      placed: true,
      x: Math.round(layout.x + dx),
      y: Math.round(layout.y + dy),
    }, context, breakpointId, isBase)
  }
}

export function layoutWithRect(layout: KeijamLayout, rect: Rect, fixSize: boolean): KeijamLayout {
  return {
    ...layout,
    placed: true,
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: fixSize ? { mode: 'fixed', px: Math.max(8, Math.round(rect.width)) } : layout.width,
    height: fixSize ? { mode: 'fixed', px: Math.max(8, Math.round(rect.height)) } : layout.height,
  }
}

function ensureCanvasRoot(nodeId: string, breakpointId: string, isBase: boolean): void {
  const store = useEditorStore.getState()
  const page = selectActiveCanvasPage(store)
  if (!page || nodeId === page.rootNodeId) return
  const node = page.nodes[nodeId]
  if (node?.parentId !== page.rootNodeId) return
  if (scopedRule(store.site?.styleRules, page.rootNodeId)) return
  commitLayout(
    page.rootNodeId,
    defaultLayout('canvas'),
    { parent: 'canvas', parentDirection: 'column' },
    breakpointId,
    isBase,
  )
}

function ensureKeijamClass(nodeId: string): StyleRule | null {
  const store = useEditorStore.getState()
  const existing = scopedRule(store.site?.styleRules, nodeId)
  const rule = existing ?? store.ensureNodeStyleClass(nodeId, 'Layer')
  if (!rule) return null
  if (!rule.name.startsWith('kj-')) {
    const name = `kj-${nodeId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 18)}`
    try {
      store.renameClass(rule.id, name)
    } catch (err) {
      console.error('[keijam] could not name the layer class:', err)
    }
  }
  return useEditorStore.getState().site?.styleRules[rule.id] ?? rule
}

function findAmbient(rules: StyleMap, selector: string): StyleRule | undefined {
  for (const rule of Object.values(rules)) {
    if (rule.kind === 'ambient' && rule.selector === selector) return rule
  }
  return undefined
}

function writeAmbient(selector: string, styles: Record<string, string | number> | null): void {
  const store = useEditorStore.getState()
  const rules = store.site?.styleRules
  if (!rules) return
  const existing = findAmbient(rules, selector)
  if (!styles || Object.keys(styles).length === 0) {
    if (existing) store.deleteClass(existing.id)
    return
  }
  if (!existing) {
    store.createAmbientRule({ selector, styles: styles as Partial<CSSPropertyBag> })
    return
  }
  const patch: Record<string, string | number | null> = {}
  for (const key of ['backgroundColor', 'opacity', 'transform'] as const) {
    patch[key] = key in styles ? styles[key] : null
  }
  store.updateClassStyles(existing.id, patch as Partial<CSSPropertyBag>)
}
