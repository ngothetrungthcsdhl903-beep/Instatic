/**
 * Code panel: one TSX file, property controls on the right, paste a Framer component.
 */

import { useState } from 'react'
import type { SiteFile } from '@core/files/schemas'
import { getErrorMessage } from '@core/utils/errorMessage'
import { Button } from '@ui/components/Button'
import { ColorInput } from '@ui/components/ColorInput'
import { Input } from '@ui/components/Input'
import { useEditorStore, selectActiveCanvasPage } from '@site/store/store'
import {
  componentIdent,
  parseCodeComponent,
  readValuesJson,
  type CodeControl,
} from '../../../../keijam'
import styles from './KeijamEditor.module.css'

const EMPTY_FILES: SiteFile[] = []

export function KeijamCode() {
  const page = useEditorStore(selectActiveCanvasPage)
  const files = useEditorStore((state) => state.site?.files ?? EMPTY_FILES)
  const selectedId = useEditorStore((state) => state.selectedNodeId)
  const node = selectedId && page ? page.nodes[selectedId] : undefined
  const fileId = node ? attr(node.props.htmlAttributes, 'data-kj-code') : ''
  const file = files.find((item) => item.id === fileId)
  const selectionKey = selectedId ?? 'none'
  const [noticeFor, setNoticeFor] = useState<{ id: string; text: string } | null>(null)
  const notice = noticeFor?.id === selectionKey ? noticeFor.text : ''
  return (
    <CodeDraft
      key={`${selectionKey}:${file?.updatedAt ?? 0}`}
      nodeId={node?.id ?? null}
      file={file}
      source={file?.content ?? ''}
      valuesJson={node ? attr(node.props.htmlAttributes, 'data-kj-values') : ''}
      notice={notice}
      onNotice={(text) => setNoticeFor({ id: selectionKey, text })}
    />
  )
}

function CodeDraft(props: {
  nodeId: string | null
  file: SiteFile | undefined
  source: string
  valuesJson: string
  notice: string
  onNotice: (text: string) => void
}) {
  const [source, setSource] = useState(props.source)
  const parsed = parseCodeComponent(source)
  const values = { ...parsed.defaults, ...readValuesJson(props.valuesJson) }

  function save() {
    const ident = componentIdent(undefined, parsed.name)
    const store = useEditorStore.getState()
    const page = selectActiveCanvasPage(store)
    if (!page) return
    let nodeId = props.nodeId
    if (!nodeId) {
      nodeId = store.insertNode('base.container', { tag: 'div' }, page.rootNodeId)
      if (!nodeId) return
    }
    try {
      const fileId = props.file?.id ?? store.createFile(`src/components/${ident}.tsx`, 'component', source)
      if (props.file) store.updateFileContent(fileId, source)
      writeAttr(nodeId, 'data-kj-code', fileId)
      writeAttr(nodeId, 'data-kj-values', JSON.stringify({ ...parsed.defaults }))
      store.selectNode(nodeId)
      props.onNotice(parsed.kind === 'override'
        ? 'Override stored. It is not executed.'
        : parsed.warnings[0] || 'Saved.')
    } catch (err) {
      props.onNotice(getErrorMessage(err, 'Could not save the component.'))
    }
  }

  function setValue(key: string, value: string | number | boolean) {
    if (!props.nodeId) return
    const next = { ...values, [key]: value }
    writeAttr(props.nodeId, 'data-kj-values', JSON.stringify(next))
  }

  return (
    <div className={styles.scroll}>
      <p className={styles.section}>Code</p>
      <p className={styles.hint}>
        One TSX file. Property controls appear here. Paste a Framer component or override, then save.
      </p>
      <textarea
        className={styles.codeInput}
        aria-label="Component source"
        spellCheck={false}
        value={source}
        onChange={(event) => setSource(event.target.value)}
      />
      <div className={styles.field}>
        <Button variant="secondary" size="xs" onClick={save}>Save</Button>
      </div>
      {props.notice ? <p className={styles.hint} role="status">{props.notice}</p> : null}
      {parsed.kind === 'component' ? (
        <>
          <p className={styles.section}>{parsed.name}</p>
          {parsed.controls.map((control) => (
            <ControlRow key={control.key} control={control} value={values[control.key]} onChange={(value) => setValue(control.key, value)} />
          ))}
        </>
      ) : null}
      {parsed.warnings.length > 0 && parsed.kind !== 'component' ? (
        <p className={styles.hint}>{parsed.warnings[0]}</p>
      ) : null}
    </div>
  )
}

function ControlRow(props: {
  control: CodeControl
  value: string | number | boolean | undefined
  onChange: (value: string | number | boolean) => void
}) {
  const { control } = props
  if (control.type === 'boolean') {
    const checked = props.value === true
    return (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{control.title}</span>
        <Button variant="secondary" size="xs" pressed={checked} aria-pressed={checked} onClick={() => props.onChange(!checked)}>
          {checked ? 'On' : 'Off'}
        </Button>
      </label>
    )
  }
  if (control.type === 'color') {
    return (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{control.title}</span>
        <ColorInput
          aria-label={control.title}
          fieldSize="xs"
          value={typeof props.value === 'string' ? props.value : '#000000'}
          onChange={(event) => props.onChange(event.target.value)}
        />
      </label>
    )
  }
  if (control.type === 'enum' && control.options) {
    return (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{control.title}</span>
        <div className={styles.seg}>
          {control.options.map((option) => (
            <Button
              key={option}
              variant="secondary"
              size="xs"
              pressed={props.value === option}
              aria-label={option}
              onClick={() => props.onChange(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      </label>
    )
  }
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{control.title}</span>
      <Input
        aria-label={control.title}
        fieldSize="xs"
        type={control.type === 'number' ? 'number' : 'text'}
        value={props.value === undefined ? '' : String(props.value)}
        onChange={(event) => {
          if (control.type === 'number') props.onChange(Number(event.target.value))
          else props.onChange(event.target.value)
        }}
      />
    </label>
  )
}

function attr(value: unknown, name: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const current = (value as Record<string, unknown>)[name]
  return typeof current === 'string' ? current : ''
}

function writeAttr(nodeId: string, name: string, value: string): void {
  const page = selectActiveCanvasPage(useEditorStore.getState())
  const node = page?.nodes[nodeId]
  if (!node) return
  const raw = node.props.htmlAttributes
  const attrs: Record<string, string> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, current] of Object.entries(raw)) {
      if (typeof current === 'string') attrs[key] = current
    }
  }
  attrs[name] = value
  useEditorStore.getState().updateNodeProps(nodeId, { htmlAttributes: attrs })
}
