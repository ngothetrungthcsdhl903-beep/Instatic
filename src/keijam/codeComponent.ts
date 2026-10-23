/**
 * Framer-shaped code components.
 *
 * A component is one TSX file: a function, defaultProps, and
 * addPropertyControls. The editor reads that file. It does not execute it.
 * Publish lowers a small JSX subset (tags, style objects, props.*) to HTML.
 * Anything richer stays a property sheet so the page never needs a React
 * runtime. Overrides (withX higher-order functions) are recognized and stored,
 * and are not run.
 */

export type CodeControlType = 'string' | 'number' | 'boolean' | 'enum' | 'color'

export interface CodeControl {
  key: string
  type: CodeControlType
  title: string
  min?: number
  max?: number
  options?: string[]
}

export interface ParsedCodeComponent {
  kind: 'component' | 'override' | 'unknown'
  name: string
  controls: CodeControl[]
  defaults: Record<string, string | number | boolean>
  intrinsicWidth?: number
  intrinsicHeight?: number
  warnings: string[]
}

const CONTROL_TYPES = new Set<CodeControlType>(['string', 'number', 'boolean', 'enum', 'color'])
const PX_STYLE = new Set(['borderRadius', 'fontSize', 'padding', 'gap', 'width', 'height', 'top', 'left'])

export function parseCodeComponent(source: string): ParsedCodeComponent {
  const warnings: string[] = []
  const override = /export\s+function\s+(with[A-Za-z0-9_]*)/.exec(source)
  const controlsCall = /addPropertyControls\s*\(\s*([A-Za-z0-9_]+)\s*,/.exec(source)
  const fn = /export\s+default\s+function\s+([A-Za-z0-9_]+)/.exec(source)
    ?? /export\s+function\s+([A-Za-z0-9_]+)/.exec(source)
  const name = controlsCall?.[1] ?? fn?.[1] ?? override?.[1] ?? 'Component'
  const intrinsicWidth = readAnnotation(source, 'framerIntrinsicWidth')
  const intrinsicHeight = readAnnotation(source, 'framerIntrinsicHeight')

  if (!controlsCall) {
    if (override) {
      return {
        kind: 'override',
        name: override[1],
        controls: [],
        defaults: {},
        intrinsicWidth,
        intrinsicHeight,
        warnings: ['Code overrides wrap an existing layer. Keijam stores the file and does not execute it.'],
      }
    }
    return {
      kind: 'unknown',
      name,
      controls: [],
      defaults: {},
      intrinsicWidth,
      intrinsicHeight,
      warnings: ['No addPropertyControls call found.'],
    }
  }

  const bodyStart = source.indexOf('{', controlsCall.index + controlsCall[0].length - 1)
  const body = bodyStart >= 0 ? extractBalanced(source, bodyStart) : null
  const controls = body ? parseControls(body) : []
  if (!body) warnings.push('Property controls object did not parse.')
  const defaults = readDefaults(source, name)
  for (const control of controls) {
    if (defaults[control.key] === undefined && control.type !== 'string') {
      warnings.push(`Missing defaultProps.${control.key}.`)
    }
  }
  return {
    kind: 'component',
    name,
    controls,
    defaults,
    intrinsicWidth,
    intrinsicHeight,
    warnings,
  }
}

export function lowerCodeComponent(
  source: string,
  values: Record<string, string | number | boolean>,
): string {
  const parsed = parseCodeComponent(source)
  const resolved = { ...parsed.defaults, ...values }
  const jsx = parsed.kind === 'component' ? lowerJsx(source, resolved) : null
  if (jsx) return jsx
  return lowerSheet(parsed, resolved)
}

export function previewLabel(valuesJson: string, fallback = ''): string {
  const values = readValuesJson(valuesJson)
  for (const value of Object.values(values)) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return fallback
}

export function readValuesJson(raw: string): Record<string, string | number | boolean> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const values: Record<string, string | number | boolean> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        values[key] = value
      }
    }
    return values
  } catch {
    return {}
  }
}

export function componentFromDescription(description: string, name?: string): string {
  const ident = componentIdent(name, description)
  const text = description.toLowerCase()
  if (/\bbutton\b|\bcta\b/.test(text)) return buttonSource(ident, description)
  if (/\bcard\b/.test(text)) return cardSource(ident, description)
  if (/\bhero\b/.test(text)) return heroSource(ident, description)
  return sectionSource(ident, description)
}

export function componentIdent(name: string | undefined, description: string): string {
  const raw = (name?.trim() || description.trim().split(/\s+/).slice(0, 3).join(' ') || 'Component')
  const parts = raw.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  const pascal = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  const ident = pascal.replace(/^[0-9]+/, '')
  return /^[A-Za-z_]/.test(ident) ? ident : `K${ident || 'Component'}`
}

function buttonSource(name: string, description: string): string {
  const label = clip(description, 'Continue')
  return `import { addPropertyControls, ControlType } from "framer"

export default function ${name}(props) {
  return (
    <button style={{ background: props.fill, color: props.ink, borderRadius: props.radius }}>
      {props.label}
    </button>
  )
}

${name}.defaultProps = {
  label: ${JSON.stringify(label)},
  fill: "#0A66E0",
  ink: "#ffffff",
  radius: 8,
}

addPropertyControls(${name}, {
  label: { type: ControlType.String, title: "Label" },
  fill: { type: ControlType.Color, title: "Fill" },
  ink: { type: ControlType.Color, title: "Ink" },
  radius: { type: ControlType.Number, title: "Radius", min: 0, max: 40 },
})
`
}

function cardSource(name: string, description: string): string {
  return `import { addPropertyControls, ControlType } from "framer"

export default function ${name}(props) {
  return (
    <section style={{ background: props.tone, borderRadius: props.radius }}>
      <h2>{props.title}</h2>
      <p>{props.body}</p>
    </section>
  )
}

${name}.defaultProps = {
  title: ${JSON.stringify(clip(description, 'Card'))},
  body: "Supporting text",
  tone: "#f4f4f5",
  radius: 12,
}

addPropertyControls(${name}, {
  title: { type: ControlType.String, title: "Title" },
  body: { type: ControlType.String, title: "Body" },
  tone: { type: ControlType.Color, title: "Tone" },
  radius: { type: ControlType.Number, title: "Radius", min: 0, max: 32 },
})
`
}

function heroSource(name: string, description: string): string {
  return `import { addPropertyControls, ControlType } from "framer"

export default function ${name}(props) {
  return (
    <section style={{ background: props.fill, textAlign: props.align }}>
      <h1>{props.heading}</h1>
      <p>{props.subtext}</p>
    </section>
  )
}

${name}.defaultProps = {
  heading: ${JSON.stringify(clip(description, 'Hero'))},
  subtext: "A short line under the heading",
  fill: "#f4f4f5",
  align: "left",
}

addPropertyControls(${name}, {
  heading: { type: ControlType.String, title: "Heading" },
  subtext: { type: ControlType.String, title: "Subtext" },
  fill: { type: ControlType.Color, title: "Fill" },
  align: { type: ControlType.Enum, title: "Align", options: ["left", "center", "right"] },
})
`
}

function sectionSource(name: string, description: string): string {
  return `import { addPropertyControls, ControlType } from "framer"

export default function ${name}(props) {
  return (
    <section style={{ background: props.fill }}>
      <h2>{props.heading}</h2>
      <p>{props.text}</p>
    </section>
  )
}

${name}.defaultProps = {
  heading: ${JSON.stringify(clip(description, 'Section'))},
  text: "Describe the section",
  fill: "#ffffff",
}

addPropertyControls(${name}, {
  heading: { type: ControlType.String, title: "Heading" },
  text: { type: ControlType.String, title: "Text" },
  fill: { type: ControlType.Color, title: "Fill" },
})
`
}

function clip(description: string, fallback: string): string {
  const clean = description.replace(/\s+/g, ' ').trim()
  if (!clean) return fallback
  return clean.length > 80 ? `${clean.slice(0, 77)}...` : clean
}

function readAnnotation(source: string, name: string): number | undefined {
  const match = new RegExp(`@${name}\\s+(\\d+)`).exec(source)
  return match ? Number(match[1]) : undefined
}

function readDefaults(source: string, name: string): Record<string, string | number | boolean> {
  const match = new RegExp(`${name}\\.defaultProps\\s*=\\s*\\{`).exec(source)
  if (!match) return {}
  const body = extractBalanced(source, match.index + match[0].length - 1)
  if (!body) return {}
  const defaults: Record<string, string | number | boolean> = {}
  for (const entry of splitTop(body)) {
    const sep = entry.indexOf(':')
    if (sep < 0) continue
    const key = entry.slice(0, sep).trim()
    const value = parseLiteral(entry.slice(sep + 1).trim())
    if (key && value !== undefined) defaults[key] = value
  }
  return defaults
}

function parseControls(body: string): CodeControl[] {
  const controls: CodeControl[] = []
  for (const entry of splitTop(body)) {
    const sep = entry.indexOf(':')
    if (sep < 0) continue
    const key = entry.slice(0, sep).trim()
    const value = entry.slice(sep + 1).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || !value.startsWith('{')) continue
    const inner = extractBalanced(value, 0)
    if (inner === null) continue
    const typeMatch = /ControlType\.(String|Number|Boolean|Enum|Color)/.exec(inner)
    if (!typeMatch) continue
    const type = typeMatch[1].toLowerCase() as CodeControlType
    if (!CONTROL_TYPES.has(type)) continue
    const title = /title\s*:\s*["']([^"']*)["']/.exec(inner)?.[1] ?? key
    const min = readNumber(inner, 'min')
    const max = readNumber(inner, 'max')
    const options = readOptions(inner)
    controls.push({
      key,
      type,
      title,
      ...(min !== undefined ? { min } : {}),
      ...(max !== undefined ? { max } : {}),
      ...(options ? { options } : {}),
    })
  }
  return controls
}

function readNumber(source: string, key: string): number | undefined {
  const match = new RegExp(`${key}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(source)
  return match ? Number(match[1]) : undefined
}

function readOptions(source: string): string[] | undefined {
  const match = /options\s*:\s*\[([^\]]*)\]/.exec(source)
  if (!match) return undefined
  const options = [...match[1].matchAll(/["']([^"']*)["']/g)].map((item) => item[1])
  return options.length > 0 ? options : undefined
}

function parseLiteral(raw: string): string | number | boolean | undefined {
  const value = raw.replace(/,\s*$/, '').trim()
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value)
  const quoted = /^["']([\s\S]*)["']$/.exec(value)
  if (quoted) return quoted[1]
  return undefined
}

function extractBalanced(source: string, openIndex: number): string | null {
  if (source[openIndex] !== '{') return null
  let depth = 0
  let quote: '"' | "'" | '`' | null = null
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (char === '\\') {
        index += 1
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(openIndex + 1, index)
    }
  }
  return null
}

function splitTop(body: string): string[] {
  const parts: string[] = []
  let start = 0
  let depth = 0
  let quote: '"' | "'" | '`' | null = null
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]
    if (quote) {
      if (char === '\\') {
        index += 1
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '{' || char === '[' || char === '(') depth += 1
    if (char === '}' || char === ']' || char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      parts.push(body.slice(start, index))
      start = index + 1
    }
  }
  const last = body.slice(start).trim()
  if (last) parts.push(body.slice(start))
  return parts.map((part) => part.trim()).filter(Boolean)
}

interface JsxElement {
  tag: string
  style: Record<string, string>
  texts: string[]
  children: JsxElement[]
}

function lowerJsx(source: string, values: Record<string, string | number | boolean>): string | null {
  const returnAt = source.search(/return\s*\(/)
  if (returnAt < 0) return null
  const start = source.indexOf('<', returnAt)
  if (start < 0) return null
  const parsed = parseElement(source, start, values)
  if (!parsed) return null
  return renderElement(parsed.element)
}

function parseElement(
  source: string,
  start: number,
  values: Record<string, string | number | boolean>,
): { element: JsxElement; index: number } | null {
  if (source[start] !== '<') return null
  let index = start + 1
  const tag = readIdent(source, index)
  if (!tag || !/^[a-z][a-z0-9]*$/.test(tag.ident)) return null
  index = tag.index
  const style: Record<string, string> = {}
  while (index < source.length) {
    index = skipSpace(source, index)
    if (source.startsWith('/>', index)) {
      return { element: { tag: tag.ident, style, texts: [], children: [] }, index: index + 2 }
    }
    if (source[index] === '>') {
      index += 1
      break
    }
    const attr = readIdent(source, index)
    if (!attr) return null
    index = skipSpace(source, attr.index)
    if (source[index] !== '=') return null
    index += 1
    index = skipSpace(source, index)
    if (attr.ident === 'style' && source[index] === '{') {
      let styleIndex = index
      const inner = skipSpace(source, index + 1)
      if (source[inner] === '{') styleIndex = inner
      const styleBody = extractBalanced(source, styleIndex)
      if (styleBody === null) return null
      Object.assign(style, parseStyle(styleBody, values))
      index = skipSpace(source, styleIndex + styleBody.length + 2)
      if (source[index] === '}') index += 1
      continue
    }
    if (source[index] === '{') {
      const end = source.indexOf('}', index)
      if (end < 0) return null
      index = end + 1
      continue
    }
    const literal = readQuoted(source, index)
    if (!literal) return null
    index = literal.index
  }
  const texts: string[] = []
  const children: JsxElement[] = []
  while (index < source.length) {
    if (source.startsWith(`</${tag.ident}`, index)) {
      const close = source.indexOf('>', index)
      if (close < 0) return null
      return { element: { tag: tag.ident, style, texts, children }, index: close + 1 }
    }
    if (source[index] === '<') {
      const child = parseElement(source, index, values)
      if (!child) return null
      children.push(child.element)
      index = child.index
      continue
    }
    if (source[index] === '{') {
      const end = source.indexOf('}', index)
      if (end < 0) return null
      const expr = source.slice(index + 1, end).trim()
      const prop = /^props\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(expr)
      if (prop && values[prop[1]] !== undefined) texts.push(String(values[prop[1]]))
      index = end + 1
      continue
    }
    const next = indexOfAny(source, index, ['<', '{'])
    const text = source.slice(index, next).replace(/\s+/g, ' ').trim()
    if (text) texts.push(text)
    index = next
  }
  return null
}

function parseStyle(body: string, values: Record<string, string | number | boolean>): Record<string, string> {
  const style: Record<string, string> = {}
  for (const entry of splitTop(body)) {
    const sep = entry.indexOf(':')
    if (sep < 0) continue
    const key = entry.slice(0, sep).trim()
    const raw = entry.slice(sep + 1).trim()
    const prop = /^props\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(raw)
    const literal = parseLiteral(raw)
    const value = prop ? values[prop[1]] : literal
    if (value === undefined || typeof value === 'boolean') continue
    const cssValue = typeof value === 'number' && PX_STYLE.has(key) ? `${value}px` : String(value)
    style[cssName(key)] = cssValue
  }
  return style
}

function renderElement(element: JsxElement): string {
  const style = Object.entries(element.style)
    .map(([key, value]) => `${key}:${escapeHtml(value)}`)
    .join(';')
  const attrs = style ? ` style="${style}"` : ''
  const inner = [...element.texts.map(escapeHtml), ...element.children.map(renderElement)].join('')
  return `<${element.tag}${attrs}>${inner}</${element.tag}>`
}

function lowerSheet(
  parsed: ParsedCodeComponent,
  values: Record<string, string | number | boolean>,
): string {
  const texts = parsed.controls
    .filter((control) => control.type === 'string')
    .map((control) => values[control.key])
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
  const color = parsed.controls
    .filter((control) => control.type === 'color')
    .map((control) => values[control.key])
    .find((value): value is string => typeof value === 'string')
  const style = color ? ` style="background:${escapeHtml(color)}"` : ''
  const body = texts.map((text) => `<p>${escapeHtml(text)}</p>`).join('')
  return `<section${style}>${body}</section>`
}

function cssName(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function readIdent(source: string, index: number): { ident: string; index: number } | null {
  const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(index))
  if (!match) return null
  return { ident: match[0], index: index + match[0].length }
}

function readQuoted(source: string, index: number): { index: number } | null {
  const quote = source[index]
  if (quote !== '"' && quote !== "'") return null
  for (let cursor = index + 1; cursor < source.length; cursor += 1) {
    if (source[cursor] === '\\') {
      cursor += 1
      continue
    }
    if (source[cursor] === quote) return { index: cursor + 1 }
  }
  return null
}

function skipSpace(source: string, index: number): number {
  while (index < source.length && /\s/.test(source[index])) index += 1
  return index
}

function indexOfAny(source: string, index: number, chars: string[]): number {
  let nearest = source.length
  for (const char of chars) {
    const found = source.indexOf(char, index)
    if (found >= 0 && found < nearest) nearest = found
  }
  return nearest
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
