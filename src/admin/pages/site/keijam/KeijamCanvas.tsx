import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Button } from '@ui/components/Button'
import type { Breakpoint, PageNode, SiteDocument, StyleRule } from '@core/page-tree'
import { getNodeDisplayName } from '@core/page-tree'
import { registry } from '@core/module-engine'
import { useEditorStore, selectActiveCanvasPage } from '@site/store/store'
import type { Box, Handle, Guide, DistanceLabel, PaintStamp, Rect, View } from '../../../../keijam'
import {
  boundsOf,
  decodeStamps,
  dirtyIds,
  encodeStamps,
  insertionIndex,
  isCulled,
  layoutStyleVars,
  layoutToCss,
  paintSignature,
  placeFrames,
  resizeRect,
  screenBox,
  snapMove,
  snapResize,
  visibleFrameWindow,
  zoomAtPoint,
  zoomToFit,
} from '../../../../keijam'
import {
  commitLayout,
  layoutContextFor,
  layoutWithRect,
  readNodeLayout,
} from './layoutBridge'
import styles from './KeijamEditor.module.css'

const EMPTY_BREAKPOINTS: Breakpoint[] = []
const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const FRAME_LABEL_OFFSET = 36

interface Preview {
  rects: Record<string, Rect>
  guides: Guide[]
  labels: DistanceLabel[]
  guideParentId: string
  shift: { nodeId: string; dx: number; dy: number } | null
}

interface KeijamCanvasProps {
  editable: boolean
  activeBreakpointId: string
  onActivate: (breakpointId: string) => void
}

export function KeijamCanvas({ editable, activeBreakpointId, onActivate }: KeijamCanvasProps) {
  const page = useEditorStore(selectActiveCanvasPage)
  const rules = useEditorStore((s) => s.site?.styleRules)
  const breakpoints = useEditorStore((s) => s.site?.breakpoints ?? EMPTY_BREAKPOINTS)
  const selectedIds = useEditorStore((s) => s.selectedNodeIds)
  const visualComponents = useEditorStore((s) => s.site?.visualComponents)
  const viewportRef = useRef<HTMLDivElement>(null)
  const paintedRef = useRef<PaintStamp[]>([])
  const [viewport, setViewport] = useState<Box>({ x: 0, y: 0, width: 0, height: 0 })
  const [view, setView] = useState<View>({ zoom: 0.8, panX: 48, panY: 72 })
  const viewRef = useRef(view)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  const spaceRef = useRef(false)
  const dragRef = useRef<Drag | null>(null)

  const frames = breakpoints.length > 0
    ? breakpoints
    : [{ id: 'desktop', label: 'Desktop', width: 1200, icon: 'monitor' }]
  const rootIsBase = breakpoints.length === 0 || activeBreakpointId === widestId(breakpoints)
  const rootLayout = page
    ? readNodeLayout(page.nodes[page.rootNodeId], rules, { parent: 'canvas', parentDirection: 'column' }, activeBreakpointId, rootIsBase)
    : null
  const frameHeight = rootLayout?.height.mode === 'fixed' ? rootLayout.height.px : 800
  const placed = placeFrames(frames.map((frame) => ({ id: frame.id, width: frame.width, height: frameHeight })), 96)

  const stampKey = encodeStamps(page ? collectStamps(page, rules, frames, new Set(selectedIds)) : [])
  useEffect(() => {
    const next = decodeStamps(stampKey)
    const dirty = new Set(dirtyIds(paintedRef.current, next))
    paintedRef.current = next
    const root = viewportRef.current
    if (!root) return
    for (const el of root.querySelectorAll<HTMLElement>('[data-kj-node]')) {
      const frameId = el.closest<HTMLElement>('[data-kj-frame]')?.dataset.kjFrame ?? ''
      const nodeId = el.dataset.kjNode ?? ''
      el.dataset.kjDirty = dirty.has(`${frameId}:${nodeId}`) ? 'true' : 'false'
    }
  }, [stampKey])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => setViewport({ x: 0, y: 0, width: el.clientWidth, height: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const current = viewRef.current
      const next = zoomAtPoint(
        current.zoom,
        current.panX,
        current.panY,
        event.clientX - rect.left,
        event.clientY - rect.top,
        current.zoom * (event.deltaY > 0 ? 0.92 : 1.08),
      )
      viewRef.current = next
      setView(next)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTyping(event.target)) {
        spaceRef.current = true
        setPanning(true)
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spaceRef.current = false
        setPanning(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const zoom = viewRef.current.zoom || 1
      const dx = (event.clientX - drag.startX) / zoom
      const dy = (event.clientY - drag.startY) / zoom
      if (drag.kind === 'pan') {
        const next = { ...viewRef.current, panX: drag.panX + (event.clientX - drag.startX), panY: drag.panY + (event.clientY - drag.startY) }
        viewRef.current = next
        setView(next)
        return
      }
      if (drag.kind === 'reorder') {
        setPreview({
          rects: {},
          guides: [],
          labels: [],
          guideParentId: drag.parentId,
          shift: { nodeId: drag.nodeId, dx, dy },
        })
        return
      }
      if (drag.kind === 'move') {
        const primary = drag.origins[drag.nodeIds[0]]
        if (!primary) return
        const snapped = snapMove(
          { ...primary, x: primary.x + dx, y: primary.y + dy },
          drag.obstacles,
          drag.parentRect,
        )
        const appliedX = snapped.rect.x - primary.x
        const appliedY = snapped.rect.y - primary.y
        const rects: Record<string, Rect> = {}
        for (const id of drag.nodeIds) {
          const origin = drag.origins[id]
          if (!origin) continue
          rects[id] = { ...origin, x: origin.x + appliedX, y: origin.y + appliedY }
        }
        setPreview({ rects, guides: snapped.guides, labels: snapped.labels, guideParentId: drag.parentId, shift: null })
        return
      }
      const resized = snapResize(
        resizeRect(drag.origin, drag.handle, dx, dy),
        drag.handle,
        drag.obstacles,
        drag.parentRect,
      )
      setPreview({
        rects: { [drag.nodeId]: resized.rect },
        guides: resized.guides,
        labels: resized.labels,
        guideParentId: drag.parentId,
        shift: null,
      })
    }
    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current
      dragRef.current = null
      setPreview(null)
      if (!drag || drag.kind === 'pan') return
      const zoom = viewRef.current.zoom || 1
      const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 3
      if (!moved) return
      const store = useEditorStore.getState()
      const current = selectActiveCanvasPage(store)
      if (!current) return
      const styleRules = store.site?.styleRules
      const frameIsBase = breakpoints.length === 0 || drag.breakpointId === widestId(breakpoints)
      if (drag.kind === 'reorder') {
        const frame = frameElement(drag.breakpointId)
        const parentEl = frame ? nodeElement(frame, drag.parentId) : null
        if (!parentEl) return
        const siblings = current.nodes[drag.parentId]?.children ?? []
        const starts: number[] = []
        const sizes: number[] = []
        for (const siblingId of siblings) {
          if (siblingId === drag.nodeId) continue
          const el = nodeElement(parentEl, siblingId)
          if (!el) continue
          const rect = measure(el, parentEl, zoom)
          starts.push(rect.y)
          sizes.push(rect.height)
        }
        const pointer = (event.clientY - parentEl.getBoundingClientRect().top) / zoom
        const index = insertionIndex(pointer, starts, sizes)
        store.moveNode(drag.nodeId, drag.parentId, index)
        return
      }
      const dx = (event.clientX - drag.startX) / zoom
      const dy = (event.clientY - drag.startY) / zoom
      if (drag.kind === 'move') {
        const primary = drag.origins[drag.nodeIds[0]]
        if (!primary) return
        const snapped = snapMove({ ...primary, x: primary.x + dx, y: primary.y + dy }, drag.obstacles, drag.parentRect)
        const appliedX = snapped.rect.x - primary.x
        const appliedY = snapped.rect.y - primary.y
        for (const id of drag.nodeIds) {
          const origin = drag.origins[id]
          const node = current.nodes[id]
          if (!origin || !node) continue
          const context = layoutContextFor(node, current.nodes, current.rootNodeId, styleRules, drag.breakpointId, frameIsBase)
          const layout = readNodeLayout(node, styleRules, context, drag.breakpointId, frameIsBase)
          commitLayout(id, layoutWithRect(layout, { ...origin, x: origin.x + appliedX, y: origin.y + appliedY }, false), context, drag.breakpointId, frameIsBase)
        }
        return
      }
      const node = current.nodes[drag.nodeId]
      if (!node) return
      const resized = snapResize(resizeRect(drag.origin, drag.handle, dx, dy), drag.handle, drag.obstacles, drag.parentRect)
      const context = layoutContextFor(node, current.nodes, current.rootNodeId, styleRules, drag.breakpointId, frameIsBase)
      const layout = readNodeLayout(node, styleRules, context, drag.breakpointId, frameIsBase)
      commitLayout(drag.nodeId, layoutWithRect(layout, resized.rect, true), context, drag.breakpointId, frameIsBase)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [breakpoints])

  function fit() {
    const el = viewportRef.current
    if (!el) return
    const content = boundsOf(placed.map((frame) => ({ x: frame.x, y: 0, width: frame.width, height: frame.height + 32 })))
    const next = zoomToFit({ width: el.clientWidth, height: el.clientHeight }, content, 48)
    viewRef.current = next
    setView(next)
  }

  function zoomBy(factor: number) {
    const el = viewportRef.current
    if (!el) return
    const current = viewRef.current
    const next = zoomAtPoint(current.zoom, current.panX, current.panY, el.clientWidth / 2, el.clientHeight / 2, current.zoom * factor)
    viewRef.current = next
    setView(next)
  }

  function onViewportPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button === 1 || spaceRef.current) {
      dragRef.current = {
        kind: 'pan',
        startX: event.clientX,
        startY: event.clientY,
        panX: viewRef.current.panX,
        panY: viewRef.current.panY,
      }
      return
    }
    if (event.target === event.currentTarget) {
      useEditorStore.getState().selectNode(null)
    }
  }

  function onNodePointerDown(event: ReactPointerEvent<HTMLDivElement>, nodeId: string, breakpointId: string) {
    if (event.button !== 0) return
    event.stopPropagation()
    onActivate(breakpointId)
    if (spaceRef.current) {
      dragRef.current = {
        kind: 'pan',
        startX: event.clientX,
        startY: event.clientY,
        panX: viewRef.current.panX,
        panY: viewRef.current.panY,
      }
      return
    }
    const store = useEditorStore.getState()
    if (event.shiftKey) store.selectNode(nodeId, 'range')
    else if (event.metaKey || event.ctrlKey) store.selectNode(nodeId, 'toggle')
    else if (!store.selectedNodeIds.includes(nodeId)) store.selectNode(nodeId)
    if (!editable || !page || nodeId === page.rootNodeId) return
    const node = page.nodes[nodeId]
    if (!node || node.locked) return
    const frame = frameElement(breakpointId)
    const parentId = node.parentId
    if (!frame || !parentId) return
    const parentEl = nodeElement(frame, parentId)
    const self = nodeElement(frame, nodeId)
    if (!parentEl || !self) return
    const zoom = viewRef.current.zoom || 1
    const draggingOnBase = breakpoints.length === 0 || breakpointId === widestId(breakpoints)
    const context = layoutContextFor(node, page.nodes, page.rootNodeId, rules, breakpointId, draggingOnBase)
    if (context.parent === 'stack') {
      dragRef.current = { kind: 'reorder', nodeId, parentId, startX: event.clientX, startY: event.clientY, breakpointId }
      return
    }
    const ids = useEditorStore.getState().selectedNodeIds.filter((id) => page.nodes[id]?.parentId === parentId)
    const dragging = ids.includes(nodeId) ? ids : [nodeId]
    const origins: Record<string, Rect> = {}
    for (const id of dragging) {
      const el = nodeElement(frame, id)
      if (el) origins[id] = measure(el, parentEl, zoom)
    }
    const obstacles: Rect[] = []
    for (const siblingId of page.nodes[parentId]?.children ?? []) {
      if (dragging.includes(siblingId)) continue
      const el = nodeElement(frame, siblingId)
      if (el) obstacles.push(measure(el, parentEl, zoom))
    }
    dragRef.current = {
      kind: 'move',
      parentId,
      parentRect: { x: 0, y: 0, width: parentEl.clientWidth, height: parentEl.clientHeight },
      nodeIds: dragging,
      origins,
      obstacles,
      startX: event.clientX,
      startY: event.clientY,
      breakpointId,
    }
  }

  function onHandlePointerDown(event: ReactPointerEvent<HTMLDivElement>, nodeId: string, handle: Handle, breakpointId: string) {
    event.stopPropagation()
    event.preventDefault()
    if (!editable || !page) return
    onActivate(breakpointId)
    const node = page.nodes[nodeId]
    const frame = frameElement(breakpointId)
    if (!node?.parentId || !frame || node.locked) return
    const parentEl = nodeElement(frame, node.parentId)
    const self = nodeElement(frame, nodeId)
    if (!parentEl || !self) return
    const zoom = viewRef.current.zoom || 1
    const obstacles: Rect[] = []
    for (const siblingId of page.nodes[node.parentId]?.children ?? []) {
      if (siblingId === nodeId) continue
      const el = nodeElement(frame, siblingId)
      if (el) obstacles.push(measure(el, parentEl, zoom))
    }
    dragRef.current = {
      kind: 'resize',
      nodeId,
      handle,
      parentId: node.parentId,
      parentRect: { x: 0, y: 0, width: parentEl.clientWidth, height: parentEl.clientHeight },
      origin: measure(self, parentEl, zoom),
      obstacles,
      startX: event.clientX,
      startY: event.clientY,
      breakpointId,
    }
  }

  if (!page) {
    return <div className={styles.viewport}><p className={styles.empty}>Open a page to design.</p></div>
  }

  const worldStyle = {
    '--kj-pan-x': `${view.panX}px`,
    '--kj-pan-y': `${view.panY}px`,
    '--kj-zoom': String(view.zoom),
  } as CSSProperties

  return (
    <div
      ref={viewportRef}
      className={panning ? `${styles.viewport} ${styles.viewportPanning}` : styles.viewport}
      onPointerDown={onViewportPointerDown}
      role="application"
      aria-label="Keijam canvas"
    >
      <div className={styles.world} style={worldStyle}>
        {placed.map((frame) => {
          const source = frames.find((item) => item.id === frame.id)
          const active = frame.id === activeBreakpointId
          const frameStyle = {
            '--kj-frame-x': `${frame.x}px`,
            '--kj-frame-y': `${FRAME_LABEL_OFFSET}px`,
            '--kj-frame-w': `${frame.width}px`,
            '--kj-frame-h': `${frame.height}px`,
          } as CSSProperties
          const frameOrigin = { x: frame.x, y: FRAME_LABEL_OFFSET }
          const frameScreen = screenBox(
            { x: 0, y: 0, width: frame.width, height: frame.height },
            view,
            frameOrigin,
          )
          const culledFrame = isCulled(frameScreen, viewport)
          return (
            <div key={frame.id} className={styles.frameWrap} style={frameStyle}>
              <div className={active ? `${styles.frameLabel} ${styles.frameLabelActive}` : styles.frameLabel}>
                {source?.label ?? frame.id} · {frame.width}
              </div>
              <div
                className={active ? `${styles.frame} ${styles.frameActive}` : styles.frame}
                data-kj-frame={frame.id}
                data-kj-culled={culledFrame ? 'true' : 'false'}
              >
                {culledFrame ? null : (
                  <NodeView
                    nodeId={page.rootNodeId}
                    nodes={page.nodes}
                    rootId={page.rootNodeId}
                    rules={rules}
                    breakpointId={frame.id}
                    isBase={breakpoints.length === 0 || frame.id === widestId(breakpoints)}
                    selectedIds={selectedIds}
                    hoverId={hoverId}
                    preview={preview}
                    editable={editable}
                    visualComponents={visualComponents}
                    frameWindow={visibleFrameWindow(view, viewport, frameOrigin)}
                    onPointerDown={onNodePointerDown}
                    onHandlePointerDown={onHandlePointerDown}
                    onHover={setHoverId}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className={styles.zoomBar} data-k-material="thin">
        <Button variant="ghost" size="xs" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.1)}>−</Button>
        <span className={styles.zoomReadout}>{Math.round(view.zoom * 100)}%</span>
        <Button variant="ghost" size="xs" aria-label="Zoom in" onClick={() => zoomBy(1.1)}>+</Button>
        <Button variant="ghost" size="xs" aria-label="Zoom to fit" onClick={fit}>Fit</Button>
      </div>
    </div>
  )
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

function NodeView(props: NodeViewProps) {
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

function frameElement(breakpointId: string): HTMLElement | null {
  return document.querySelector(`[data-kj-frame="${CSS.escape(breakpointId)}"]`)
}

function nodeElement(scope: ParentNode, nodeId: string): HTMLElement | null {
  return scope.querySelector(`[data-kj-node="${CSS.escape(nodeId)}"]`)
}

function measure(el: HTMLElement, parent: HTMLElement, zoom: number): Rect {
  const child = el.getBoundingClientRect()
  const box = parent.getBoundingClientRect()
  const scale = zoom || 1
  return {
    x: (child.left - box.left) / scale,
    y: (child.top - box.top) / scale,
    width: child.width / scale,
    height: child.height / scale,
  }
}

function collectStamps(
  page: { nodes: Record<string, PageNode>; rootNodeId: string },
  rules: Record<string, StyleRule> | undefined,
  frames: readonly { id: string; width: number }[],
  selected: ReadonlySet<string>,
): PaintStamp[] {
  const out: PaintStamp[] = []
  for (const frame of frames) {
    const isBase = frame.id === widestId(frames)
    const visit = (id: string) => {
      const node = page.nodes[id]
      if (!node) return
      const context = layoutContextFor(node, page.nodes, page.rootNodeId, rules, frame.id, isBase)
      const layout = readNodeLayout(node, rules, context, frame.id, isBase)
      out.push({
        id: `${frame.id}:${node.id}`,
        signature: paintSignature({
          layout,
          text: typeof node.props.text === 'string' ? node.props.text : '',
          src: typeof node.props.src === 'string' ? node.props.src : '',
          hidden: Boolean(node.hidden),
          childIds: node.children,
          selected: selected.has(node.id),
        }),
      })
      for (const childId of node.children) visit(childId)
    }
    visit(page.rootNodeId)
  }
  return out
}

function widestId(breakpoints: readonly { id: string; width: number }[]): string {
  let best = breakpoints[0]
  for (const breakpoint of breakpoints) {
    if (!best || breakpoint.width > best.width) best = breakpoint
  }
  return best?.id ?? 'desktop'
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, [contenteditable="true"]'))
}

type Drag =
  | {
      kind: 'move'
      parentId: string
      parentRect: Rect
      nodeIds: string[]
      origins: Record<string, Rect>
      obstacles: Rect[]
      startX: number
      startY: number
      breakpointId: string
    }
  | {
      kind: 'resize'
      nodeId: string
      handle: Handle
      parentId: string
      parentRect: Rect
      origin: Rect
      obstacles: Rect[]
      startX: number
      startY: number
      breakpointId: string
    }
  | {
      kind: 'reorder'
      nodeId: string
      parentId: string
      startX: number
      startY: number
      breakpointId: string
    }
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number }
