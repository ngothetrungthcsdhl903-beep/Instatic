import { useEffect, useState } from 'react'
import type { Breakpoint } from '@core/page-tree'
import { Button } from '@ui/components/Button'
import { ListBoxSolidIcon } from 'pixel-art-icons/icons/list-box-solid'
import { PlusIcon } from 'pixel-art-icons/icons/plus'
import { RedoIcon } from 'pixel-art-icons/icons/redo'
import { UndoIcon } from 'pixel-art-icons/icons/undo'
import { useEditorStore, selectActiveCanvasPage } from '@site/store/store'
import { PRODUCT_NAME } from '../../../../keijam'
import { KeijamCanvas } from './KeijamCanvas'
import { KeijamInsert, KeijamLayers } from './KeijamLayers'
import { KeijamInteractions, KeijamProperties } from './KeijamProperties'
import { nudgeSelected } from './layoutBridge'
import styles from './KeijamEditor.module.css'

const NO_BREAKPOINTS: Breakpoint[] = []

interface KeijamEditorProps {
  editable: boolean
  loadError: string | null
  onUseClassic: () => void
}

export function KeijamEditor({ editable, loadError, onUseClassic }: KeijamEditorProps) {
  const breakpoints = useEditorStore((s) => s.site?.breakpoints ?? NO_BREAKPOINTS)
  const widest = breakpoints.reduce<Breakpoint | null>(
    (best, item) => (!best || item.width > best.width ? item : best),
    null,
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [leftTab, setLeftTab] = useState<'layers' | 'insert'>('layers')
  const [rightTab, setRightTab] = useState<'design' | 'prototype'>('design')
  const active = breakpoints.find((item) => item.id === activeId) ?? widest
  const activeBreakpointId = active?.id ?? 'desktop'
  const isBase = !widest || activeBreakpointId === widest.id

  useEffect(() => {
    const previous = document.title
    document.title = PRODUCT_NAME
    return () => {
      document.title = previous
    }
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target)) return
      const store = useEditorStore.getState()
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) store.redo()
        else store.undo()
        return
      }
      if (!editable) return
      if (meta && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        if (store.selectedNodeId) store.duplicateNode(store.selectedNodeId)
        return
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        const page = selectActiveCanvasPage(store)
        if (!page) return
        const ids = store.selectedNodeIds.filter((id) => id !== page.rootNodeId)
        if (ids.length === 0) return
        event.preventDefault()
        for (const id of ids) store.deleteNode(id)
        return
      }
      const direction = event.key === 'ArrowLeft'
        ? 'left'
        : event.key === 'ArrowRight'
          ? 'right'
          : event.key === 'ArrowUp'
            ? 'up'
            : event.key === 'ArrowDown'
              ? 'down'
              : null
      if (!direction) return
      event.preventDefault()
      nudgeSelected(direction, event.shiftKey ? 10 : 1, activeBreakpointId, isBase)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeBreakpointId, editable, isBase])

  return (
    <div className={styles.shell}>
      <header className={styles.toolbar} data-k-material="regular">
        <span className={styles.brand}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.word}>{PRODUCT_NAME}</span>
        </span>
        <Button variant="ghost" size="xs" iconOnly aria-label="Undo" onClick={() => useEditorStore.getState().undo()}>
          <UndoIcon size={14} />
        </Button>
        <Button variant="ghost" size="xs" iconOnly aria-label="Redo" onClick={() => useEditorStore.getState().redo()}>
          <RedoIcon size={14} />
        </Button>
        <span className={styles.toolbarSpacer} />
        <span className={styles.zoomReadout}>{active?.label ?? 'Desktop'}</span>
        <span className={styles.toolbarSpacer} />
        <Button variant="ghost" size="xs" onClick={onUseClassic}>Classic</Button>
      </header>

      <aside className={`${styles.panel} ${styles.panelLeft}`} data-k-material="regular" aria-label="Layers and insert">
        <div className={styles.tabs}>
          <Button variant="ghost" size="sm" className={styles.tab} pressed={leftTab === 'layers'} onClick={() => setLeftTab('layers')}>
            <ListBoxSolidIcon size={14} />
            Layers
          </Button>
          <Button variant="ghost" size="sm" className={styles.tab} pressed={leftTab === 'insert'} onClick={() => setLeftTab('insert')}>
            <PlusIcon size={14} />
            Insert
          </Button>
        </div>
        {leftTab === 'layers' ? <KeijamLayers /> : <KeijamInsert activeBreakpointId={activeBreakpointId} isBase={isBase} />}
      </aside>

      {loadError ? (
        <section className={styles.viewport} role="alert">
          <p className={styles.empty}>{loadError}</p>
        </section>
      ) : (
        <KeijamCanvas
          editable={editable}
          activeBreakpointId={activeBreakpointId}
          onActivate={setActiveId}
        />
      )}

      <aside className={`${styles.panel} ${styles.panelRight}`} data-k-material="regular" aria-label="Properties">
        <div className={styles.tabs}>
          <Button variant="ghost" size="sm" className={styles.tab} pressed={rightTab === 'design'} onClick={() => setRightTab('design')}>
            Design
          </Button>
          <Button variant="ghost" size="sm" className={styles.tab} pressed={rightTab === 'prototype'} onClick={() => setRightTab('prototype')}>
            Prototype
          </Button>
        </div>
        {rightTab === 'design'
          ? <KeijamProperties activeBreakpointId={activeBreakpointId} isBase={isBase} />
          : <KeijamInteractions activeBreakpointId={activeBreakpointId} isBase={isBase} />}
      </aside>
    </div>
  )
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, [contenteditable="true"]'))
}
