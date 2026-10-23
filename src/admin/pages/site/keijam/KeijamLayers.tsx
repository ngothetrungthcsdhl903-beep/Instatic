import { useState, type CSSProperties } from 'react'
import type { PageNode } from '@core/page-tree'
import { getNodeDisplayName } from '@core/page-tree'
import { registry } from '@core/module-engine'
import { Button } from '@ui/components/Button'
import { Input } from '@ui/components/Input'
import { EyeOffSolidIcon } from 'pixel-art-icons/icons/eye-off-solid'
import { EyeSolidIcon } from 'pixel-art-icons/icons/eye-solid'
import { ImageSolidIcon } from 'pixel-art-icons/icons/image-solid'
import { PlusIcon } from 'pixel-art-icons/icons/plus'
import { SquareSolidIcon } from 'pixel-art-icons/icons/square-solid'
import { TextStartTIcon } from 'pixel-art-icons/icons/text-start-t'
import { useEditorStore, selectActiveCanvasPage } from '@site/store/store'
import { insertKeijamNode } from './layoutBridge'
import { cn } from '@ui/cn'
import styles from './KeijamEditor.module.css'

export function KeijamLayers() {
  const page = useEditorStore(selectActiveCanvasPage)
  const selectedIds = useEditorStore((s) => s.selectedNodeIds)
  const visualComponents = useEditorStore((s) => s.site?.visualComponents)
  if (!page) return <p className={styles.hint}>No page open.</p>
  return (
    <div className={styles.scroll}>
      <LayerRow
        nodeId={page.rootNodeId}
        nodes={page.nodes}
        depth={0}
        selectedIds={selectedIds}
        visualComponents={visualComponents}
      />
    </div>
  )
}

function LayerRow({
  nodeId,
  nodes,
  depth,
  selectedIds,
  visualComponents,
}: {
  nodeId: string
  nodes: Record<string, PageNode>
  depth: number
  selectedIds: string[]
  visualComponents: ReturnType<typeof useEditorStore.getState>['site'] extends infer S
    ? S extends { visualComponents?: infer V }
      ? V
      : undefined
    : undefined
}) {
  const node = nodes[nodeId]
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState('')
  if (!node) return null
  const selected = selectedIds.includes(node.id)
  const name = layerName(node, visualComponents)

  function commitName() {
    const next = draft.trim()
    if (next && next !== name) useEditorStore.getState().renameNode(node.id, next)
    setRenaming(false)
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={cn(styles.row, styles.layer, selected && styles.rowSelected)}
        style={{ '--kj-depth': String(depth) } as CSSProperties}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            useEditorStore.getState().selectNode(node.id)
          }
        }}
        onClick={(event) => {
          const mode = event.shiftKey ? 'range' : event.metaKey || event.ctrlKey ? 'toggle' : 'replace'
          useEditorStore.getState().selectNode(node.id, mode)
        }}
        onDoubleClick={() => {
          setDraft(name)
          setRenaming(true)
        }}
      >
        <span className={styles.rowLabel}>
          {renaming ? (
            <Input
              aria-label="Layer name"
              fieldSize="xs"
              value={draft}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitName()
                if (event.key === 'Escape') setRenaming(false)
              }}
              onClick={(event) => event.stopPropagation()}
            />
          ) : name}
        </span>
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={node.hidden ? 'Show layer' : 'Hide layer'}
          aria-pressed={node.hidden}
          onClick={(event) => {
            event.stopPropagation()
            useEditorStore.getState().toggleNodeHidden(node.id)
          }}
        >
          {node.hidden ? <EyeOffSolidIcon size={14} /> : <EyeSolidIcon size={14} />}
        </Button>
      </div>
      {node.children.map((childId) => (
        <LayerRow
          key={childId}
          nodeId={childId}
          nodes={nodes}
          depth={depth + 1}
          selectedIds={selectedIds}
          visualComponents={visualComponents}
        />
      ))}
    </>
  )
}

export function KeijamInsert({ activeBreakpointId, isBase }: { activeBreakpointId: string; isBase: boolean }) {
  const items = [
    { kind: 'frame' as const, label: 'Frame', icon: <SquareSolidIcon size={14} /> },
    { kind: 'text' as const, label: 'Text', icon: <TextStartTIcon size={14} /> },
    { kind: 'image' as const, label: 'Image', icon: <ImageSolidIcon size={14} /> },
  ]
  return (
    <div className={styles.scroll}>
      <p className={styles.section}>Insert</p>
      {items.map((item) => (
        <Button
          key={item.kind}
          variant="ghost"
          size="sm"
          className={styles.row}
          onClick={() => insertKeijamNode(item.kind, insertParentId(), activeBreakpointId, isBase)}
        >
          {item.icon}
          <span className={styles.rowLabel}>{item.label}</span>
          <PlusIcon size={12} />
        </Button>
      ))}
      <p className={styles.hint}>Frames stack or sit freely. Text and images drop onto the selected frame.</p>
    </div>
  )
}

function insertParentId(): string {
  const store = useEditorStore.getState()
  const page = selectActiveCanvasPage(store)
  if (!page) return ''
  const selected = store.selectedNodeId ? page.nodes[store.selectedNodeId] : undefined
  if (selected && (selected.id === page.rootNodeId || registry.get(selected.moduleId)?.canHaveChildren)) {
    return selected.id
  }
  if (selected?.parentId && page.nodes[selected.parentId]) return selected.parentId
  return page.rootNodeId
}

function layerName(
  node: PageNode,
  visualComponents: Parameters<typeof getNodeDisplayName>[2],
): string {
  if (node.label && node.label.length > 0) return node.label
  if (node.moduleId === 'base.container') return 'Frame'
  if (node.moduleId === 'base.text') return 'Text'
  if (node.moduleId === 'base.image') return 'Image'
  if (node.moduleId === 'base.body') return 'Page'
  return getNodeDisplayName(node, registry.get(node.moduleId), visualComponents)
}
