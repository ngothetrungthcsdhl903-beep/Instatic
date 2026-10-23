import { useState, type ReactNode } from 'react'
import type { PageNode } from '@core/page-tree'
import { Button } from '@ui/components/Button'
import { ColorInput } from '@ui/components/ColorInput'
import { Input } from '@ui/components/Input'
import { useEditorStore, selectActiveCanvasPage } from '@site/store/store'
import type { AxisSize, KeijamLayout, LayoutMode, StackDirection } from '../../../../keijam'
import { effectKindFromProps, type EffectKind } from '../../../../keijam'
import {
  commitLayout,
  layoutContextFor,
  readNodeLayout,
} from './layoutBridge'
import styles from './KeijamEditor.module.css'

interface PanelProps {
  activeBreakpointId: string
  isBase: boolean
}

export function KeijamProperties({ activeBreakpointId, isBase }: PanelProps) {
  const page = useEditorStore(selectActiveCanvasPage)
  const rules = useEditorStore((s) => s.site?.styleRules)
  const selectedId = useEditorStore((s) => s.selectedNodeId)
  const node = selectedId && page ? page.nodes[selectedId] : undefined
  if (!page || !node) return <p className={styles.hint}>Select a layer on the canvas.</p>
  const selected = node

  const context = layoutContextFor(selected, page.nodes, page.rootNodeId, rules, activeBreakpointId, isBase)
  const layout = readNodeLayout(selected, rules, context, activeBreakpointId, isBase)
  const container = selected.id === page.rootNodeId || selected.moduleId === 'base.container'

  function commit(next: KeijamLayout) {
    commitLayout(selected.id, next, context, activeBreakpointId, isBase)
  }

  function setMode(mode: LayoutMode) {
    commit({ ...layout, mode })
    if (!page) return
    for (const childId of selected.children) {
      const child = page.nodes[childId]
      if (!child) continue
      const childContext = { parent: mode, parentDirection: layout.direction }
      const childLayout = readNodeLayout(child, rules, { parent: layout.mode, parentDirection: layout.direction }, activeBreakpointId, isBase)
      commitLayout(childId, { ...childLayout, placed: mode === 'free' ? childLayout.placed : false }, childContext, activeBreakpointId, isBase)
    }
  }

  function setDirection(direction: StackDirection) {
    commit({ ...layout, direction })
    if (layout.mode !== 'stack' || !page) return
    for (const childId of selected.children) {
      const child = page.nodes[childId]
      if (!child) continue
      const childLayout = readNodeLayout(child, rules, { parent: 'stack', parentDirection: layout.direction }, activeBreakpointId, isBase)
      commitLayout(childId, childLayout, { parent: 'stack', parentDirection: direction }, activeBreakpointId, isBase)
    }
  }

  return (
    <div className={styles.scroll}>
      <p className={styles.section}>{isBase ? 'Design' : 'Breakpoint override'}</p>
      {container ? (
        <>
          <Field label="Layout">
            <Seg
              value={layout.mode}
              options={[{ value: 'free', label: 'Free' }, { value: 'stack', label: 'Stack' }]}
              onChange={setMode}
            />
          </Field>
          {layout.mode === 'stack' ? (
            <>
              <Field label="Direction">
                <Seg
                  value={layout.direction}
                  options={[{ value: 'column', label: 'Vertical' }, { value: 'row', label: 'Horizontal' }]}
                  onChange={setDirection}
                />
              </Field>
              <Field label="Align">
                <Seg
                  value={layout.align}
                  options={[
                    { value: 'start', label: 'Start' },
                    { value: 'center', label: 'Center' },
                    { value: 'end', label: 'End' },
                    { value: 'stretch', label: 'Stretch' },
                  ]}
                  onChange={(align) => commit({ ...layout, align })}
                />
              </Field>
              <Field label="Distribute">
                <Seg
                  value={layout.distribute}
                  options={[
                    { value: 'start', label: 'Start' },
                    { value: 'center', label: 'Center' },
                    { value: 'end', label: 'End' },
                    { value: 'space-between', label: 'Space' },
                  ]}
                  onChange={(distribute) => commit({ ...layout, distribute })}
                />
              </Field>
              <Field label="Wrap">
                <Seg
                  value={layout.wrap ? 'yes' : 'no'}
                  options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
                  onChange={(value) => commit({ ...layout, wrap: value === 'yes' })}
                />
              </Field>
              <Field label="Gap">
                <Num label="Gap" value={layout.gap} onCommit={(gap) => commit({ ...layout, gap })} />
              </Field>
              <Field label="Padding">
                <div className={styles.quad}>
                  <Num label="Padding top" value={layout.paddingTop} onCommit={(paddingTop) => commit({ ...layout, paddingTop })} />
                  <Num label="Padding right" value={layout.paddingRight} onCommit={(paddingRight) => commit({ ...layout, paddingRight })} />
                  <Num label="Padding bottom" value={layout.paddingBottom} onCommit={(paddingBottom) => commit({ ...layout, paddingBottom })} />
                  <Num label="Padding left" value={layout.paddingLeft} onCommit={(paddingLeft) => commit({ ...layout, paddingLeft })} />
                </div>
              </Field>
            </>
          ) : null}
        </>
      ) : null}

      <p className={styles.section}>Size</p>
      <SizeField label="Width" axis={layout.width} onCommit={(width) => commit({ ...layout, width })} />
      <SizeField label="Height" axis={layout.height} onCommit={(height) => commit({ ...layout, height })} />

      {context.parent === 'free' && node.id !== page.rootNodeId ? (
        <>
          <p className={styles.section}>Position</p>
          <Field label="X">
            <Num label="X" value={layout.x} onCommit={(x) => commit({ ...layout, placed: true, x })} />
          </Field>
          <Field label="Y">
            <Num label="Y" value={layout.y} onCommit={(y) => commit({ ...layout, placed: true, y })} />
          </Field>
        </>
      ) : null}

      <p className={styles.section}>Fill</p>
      <Field label="Color">
        <ColorInput
          aria-label="Fill"
          fieldSize="xs"
          value={layout.backgroundColor ?? '#f4f4f5'}
          onChange={(event) => commit({ ...layout, backgroundColor: event.target.value })}
        />
      </Field>
      <Field label="Radius">
        <Num label="Radius" value={layout.radius ?? 0} onCommit={(radius) => commit({ ...layout, radius })} />
      </Field>
      <Field label="Opacity">
        <Num label="Opacity" value={Math.round((layout.opacity ?? 1) * 100)} onCommit={(value) => commit({ ...layout, opacity: clamp01(value / 100) })} />
      </Field>

      {selected.moduleId === 'base.text' ? <TextFields node={selected} layout={layout} commit={commit} /> : null}
      {selected.moduleId === 'base.image' ? <ImageFields node={selected} layout={layout} commit={commit} /> : null}

      {selected.id !== page.rootNodeId ? (
        <>
          <p className={styles.section}>Effect</p>
          <Field label="Plugin">
            <Seg
              value={effectKindFromProps(selected.props) ?? 'none'}
              options={[
                { value: 'none', label: 'None' },
                { value: 'webgl', label: 'WebGL' },
                { value: 'three', label: 'Three' },
                { value: 'gsap', label: 'GSAP' },
              ]}
              onChange={(effect) => setEffect(selected.id, effect)}
            />
          </Field>
          <p className={styles.hint}>WebGL, Three.js, and GSAP load only on pages that use them.</p>
        </>
      ) : null}
    </div>
  )
}

function setEffect(nodeId: string, effect: EffectKind | 'none'): void {
  const node = useEditorStore.getState().site
    ? selectActiveCanvasPage(useEditorStore.getState())?.nodes[nodeId]
    : undefined
  if (!node) return
  const raw = node.props.htmlAttributes
  const attrs: Record<string, string> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') attrs[key] = value
    }
  }
  if (effect === 'none') delete attrs['data-kj-effect']
  else attrs['data-kj-effect'] = effect
  useEditorStore.getState().updateNodeProps(nodeId, { htmlAttributes: attrs })
}

function TextFields({ node, layout, commit }: { node: PageNode; layout: KeijamLayout; commit: (next: KeijamLayout) => void }) {
  return (
    <>
      <p className={styles.section}>Text</p>
      <Field label="Content">
        <Input
          aria-label="Text"
          fieldSize="xs"
          value={String(node.props.text ?? '')}
          onChange={(event) => useEditorStore.getState().updateNodeProps(node.id, { text: event.target.value })}
        />
      </Field>
      <Field label="Size">
        <Num label="Font size" value={layout.fontSize ?? 16} onCommit={(fontSize) => commit({ ...layout, fontSize })} />
      </Field>
      <Field label="Weight">
        <Num label="Font weight" value={layout.fontWeight ?? 400} onCommit={(fontWeight) => commit({ ...layout, fontWeight })} />
      </Field>
      <Field label="Align">
        <Seg
          value={layout.textAlign ?? 'left'}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(textAlign) => commit({ ...layout, textAlign })}
        />
      </Field>
      <Field label="Color">
        <ColorInput
          aria-label="Text color"
          fieldSize="xs"
          value={layout.color ?? '#1c1c1c'}
          onChange={(event) => commit({ ...layout, color: event.target.value })}
        />
      </Field>
    </>
  )
}

function ImageFields({ node, layout, commit }: { node: PageNode; layout: KeijamLayout; commit: (next: KeijamLayout) => void }) {
  return (
    <>
      <p className={styles.section}>Image</p>
      <Field label="Source">
        <Input
          aria-label="Image URL"
          fieldSize="xs"
          value={typeof node.props.src === 'string' ? node.props.src : ''}
          placeholder="https://"
          onChange={(event) => useEditorStore.getState().updateNodeProps(node.id, { src: event.target.value })}
        />
      </Field>
      <Field label="Fit">
        <Seg
          value={layout.objectFit ?? 'cover'}
          options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }]}
          onChange={(objectFit) => commit({ ...layout, objectFit })}
        />
      </Field>
    </>
  )
}

function SizeField({ label, axis, onCommit }: { label: string; axis: AxisSize; onCommit: (next: AxisSize) => void }) {
  return (
    <>
      <Field label={label}>
        <Seg
          value={axis.mode}
          options={[
            { value: 'fixed', label: 'Fixed' },
            { value: 'fill', label: 'Fill' },
            { value: 'fit', label: 'Fit' },
          ]}
          onChange={(mode) => onCommit({ ...axis, mode })}
        />
      </Field>
      {axis.mode === 'fixed' ? (
        <Field label=" ">
          <Num label={`${label} pixels`} value={axis.px} onCommit={(px) => onCommit({ mode: 'fixed', px })} />
        </Field>
      ) : null}
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <div className={styles.seg}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant="secondary"
          size="xs"
          pressed={option.value === value}
          aria-label={option.label}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

function Num(props: { label: string; value: number; onCommit: (next: number) => void }) {
  return <NumField key={props.value} {...props} />
}

function NumField({ label, value, onCommit }: { label: string; value: number; onCommit: (next: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  return (
    <Input
      aria-label={label}
      fieldSize="xs"
      type="number"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = Number(draft)
        if (Number.isFinite(next)) onCommit(next)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(1, Math.max(0, value))
}
