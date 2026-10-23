/**
 * One canvas layer: layout, code-component preview, effect label, resize handles.
 */

import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { PageNode, SiteDocument, StyleRule } from '@core/page-tree'
import { getNodeDisplayName } from '@core/page-tree'
import { registry } from '@core/module-engine'
import type { Box, DistanceLabel, Guide, Handle, Rect } from '../../../../keijam'
import { effectKindFromProps, isCulled, layoutStyleVars, layoutToCss, previewLabel } from '../../../../keijam'
import { layoutContextFor, readNodeLayout } from './layoutBridge'
import styles from './KeijamEditor.module.css'

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export interface Preview {
  rects: Record<string, Rect>
  guides: Guide[]
  labels: DistanceLabel[]
  guideParentId: string
  shift: { nodeId: string; dx: number; dy: number } | null
}

interface NodeViewProps {
  nodeId: string
  nodes: Record<string, PageNode>
  rootId: string
  rules: Record<string, StyleRule> | undefined
  breakpointId: string
  isBase: boolean
  selectedIds: string[]
  hoverId: string | null
  preview: Preview | null
  editable: boolean
  visualComponents: SiteDocument['visualComponents'] | undefined
  frameWindow: Box
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>, nodeId: string, breakpointId: string) => void
  onHandlePointerDown: (event: ReactPointerEvent<HTMLDivElement>, nodeId: string, handle: Handle, breakpointId: string) => void
  onHover: (id: string | null) => void
}

export function NodeView(props: NodeViewProps) {
  const node = props.nodes[props.nodeId]
  if (!node) return null
  const context = layoutContextFor(node, props.nodes, props.rootId, props.rules, props.breakpointId, props.isBase)
  const layout = readNodeLayout(node, props.rules, context, props.breakpointId, props.isBase)
  const css = layoutToCss(layout, context)
  const previewRect = props.preview?.rects[node.id]
  if (previewRect && context.parent === 'free') {
    css.position = 'absolute'
    css.left = `${Math.round(previewRect.x)}px`
    css.top = `${Math.round(previewRect.y)}px`
    css.width = `${Math.round(previewRect.width)}px`
    css.height = `${Math.round(previewRect.height)}px`
  }
  const selected = props.selectedIds.includes(node.id)
  const fixedTopLevel = node.parentId === props.rootId
    && layout.placed
    && layout.width.mode === 'fixed'
    && layout.height.mode === 'fixed'
  const nodeBox = fixedTopLevel
    ? { x: layout.x, y: layout.y, width: layout.width.px, height: layout.height.px }
    : null
  if (!props.preview && !selected && props.hoverId !== node.id && isCulled(nodeBox, props.frameWindow)) return null
  const showHandles = selected && props.editable && !node.locked && node.id !== props.rootId && props.selectedIds.length === 1
  const shift = props.preview?.shift?.nodeId === node.id ? props.preview.shift : null
  const name = getNodeDisplayName(node, registry.get(node.moduleId), props.visualComponents)
  const src = typeof node.props.src === 'string' ? node.props.src : ''
  const codeLabel = previewLabel(attr(node, 'data-kj-values'))
  const effect = effectKindFromProps(node.props)
  const style = {
    ...layoutStyleVars(css),
    ...(shift ? { '--kj-shift-x': `${shift.dx}px`, '--kj-shift-y': `${shift.dy}px` } : {}),
  } as CSSProperties

  return (
    <div
      className={shift ? `${styles.item} ${styles.shift}` : styles.item}
      style={style}
      data-kj-node={node.id}
      data-selected={selected ? 'true' : 'false'}
      data-hover={props.hoverId === node.id ? 'true' : 'false'}
      data-hidden={node.hidden ? 'true' : 'false'}
      onPointerDown={(event) => props.onPointerDown(event, node.id, props.breakpointId)}
      onPointerEnter={() => props.onHover(node.id)}
      onPointerLeave={() => props.onHover(null)}
    >
      {node.moduleId === 'base.text' ? <span className={styles.text}>{String(node.props.text ?? '')}</span> : null}
      {codeLabel ? <span className={styles.text}>{codeLabel}</span> : null}
      {effect ? <span className={styles.placeholder}>{effect}</span> : null}
      {node.moduleId === 'base.image' ? (
        src
          ? <img className={styles.image} alt={name} src={src} />
          : <span className={styles.placeholder}>Image</span>
      ) : null}
      {node.moduleId !== 'base.text' && node.moduleId !== 'base.image' && node.moduleId !== 'base.container' && node.moduleId !== 'base.body' ? (
        <span className={styles.placeholder}>{name}</span>
      ) : null}
      {node.children.map((childId) => (
        <NodeView key={childId} {...props} nodeId={childId} />
      ))}
      {showHandles ? HANDLES.map((handle) => (
        <div
          key={handle}
          className={`${styles.handle} ${styles[handleClass(handle)]}`}
          onPointerDown={(event) => props.onHandlePointerDown(event, node.id, handle, props.breakpointId)}
        />
      )) : null}
      {props.preview && props.preview.guideParentId === node.id ? (
        <Guides guides={props.preview.guides} labels={props.preview.labels} />
      ) : null}
    </div>
  )
}

function Guides({ guides, labels }: { guides: Guide[]; labels: DistanceLabel[] }) {
  return (
    <>
      {guides.map((guide, index) => {
        const span = guide.to - guide.from
        const style = {
          '--kj-guide': `${guide.position}px`,
          '--kj-guide-from': span === 0 ? '0px' : `${guide.from}px`,
          '--kj-guide-span': span === 0 ? '100%' : `${Math.abs(span)}px`,
        } as CSSProperties
        return <div key={`${guide.orientation}-${index}`} className={guide.orientation === 'v' ? styles.guideV : styles.guideH} style={style} />
      })}
      {labels.map((label) => (
        <div
          key={`${label.x}-${label.y}-${label.text}`}
          className={styles.distance}
          style={{ '--kj-label-x': `${label.x}px`, '--kj-label-y': `${label.y}px` } as CSSProperties}
        >
          {label.text}
        </div>
      ))}
    </>
  )
}

function attr(node: PageNode, name: string): string {
  const raw = node.props.htmlAttributes
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ''
  const value = (raw as Record<string, unknown>)[name]
  return typeof value === 'string' ? value : ''
}

function handleClass(handle: Handle): 'handleN' | 'handleS' | 'handleE' | 'handleW' | 'handleNe' | 'handleNw' | 'handleSe' | 'handleSw' {
  if (handle === 'n') return 'handleN'
  if (handle === 's') return 'handleS'
  if (handle === 'e') return 'handleE'
  if (handle === 'w') return 'handleW'
  if (handle === 'ne') return 'handleNe'
  if (handle === 'nw') return 'handleNw'
  if (handle === 'se') return 'handleSe'
  return 'handleSw'
}
