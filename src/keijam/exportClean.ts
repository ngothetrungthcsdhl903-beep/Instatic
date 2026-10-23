/**
 * Clean HTML + CSS export. No hole runtime, no loop runtime, no import map,
 * no module script. Dynamic nodes render inline. The gzip budget is the
 * published document, not the editor bundle.
 */

import type { IModuleRegistry } from '@core/module-engine'
import type { Page, SiteDocument } from '@core/page-tree'
import { publishPage } from '@core/publisher'
import { lowerCodeComponent, readValuesJson } from './codeComponent'
import { effectScriptTags, effectsOnPage } from './effects'
import { MOTION_FILE_PATH, exportMotion, parseMotionDocument } from './motion'

export const CLEAN_EXPORT_GZIP_BUDGET = 80 * 1024

export interface CleanExport {
  filename: string
  html: string
  gzipBytes: number
  withinBudget: boolean
}

const SCRIPT_TAG = /<script\b[^>]*>[\s\S]*?<\/script>/gi
const HOLE_TAG = /<\/?instatic-hole\b[^>]*>/gi

export async function exportCleanDocument(
  page: Page,
  site: SiteDocument,
  registry: IModuleRegistry,
): Promise<CleanExport> {
  const published = publishPage(page, site, registry, {
    runtime: 'static',
    dynamicNodes: 'inline',
    cssEmission: 'inline',
  })
  const stripped = published.html.replace(SCRIPT_TAG, '').replace(HOLE_TAG, '')
  const html = decorateCleanHtml(stripped, page, site)
  const gzipBytes = await gzipByteLength(html)
  return {
    filename: published.filename,
    html,
    gzipBytes,
    withinBudget: gzipBytes <= CLEAN_EXPORT_GZIP_BUDGET,
  }
}

function decorateCleanHtml(html: string, page: Page, site: SiteDocument): string {
  let next = html
  for (const node of Object.values(page.nodes)) {
    const attrs = node.props.htmlAttributes
    if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) continue
    const bag = attrs as Record<string, unknown>
    const fileId = bag['data-kj-code']
    if (typeof fileId !== 'string') continue
    const file = site.files.find((item) => item.id === fileId)
    if (!file?.content) continue
    const values = readValuesJson(typeof bag['data-kj-values'] === 'string' ? bag['data-kj-values'] : '')
    next = injectAfter(next, `data-kj-code="${fileId}"`, lowerCodeComponent(file.content, values))
  }

  const motionFile = site.files.find((item) => item.path === MOTION_FILE_PATH)
  const motion = parseMotionDocument(motionFile?.content)
  const css: string[] = []
  const json: string[] = []
  let runtime: string | null = null
  for (const [nodeId, machine] of Object.entries(motion.byNodeId)) {
    if (!page.nodes[nodeId]) continue
    const exported = exportMotion(nodeId, machine)
    if (exported.css) css.push(exported.css)
    if (exported.json) json.push(exported.json)
    if (exported.script) runtime = exported.script
  }
  if (css.length > 0 && next.includes('</head>')) {
    next = next.replace('</head>', `<style>${css.join('')}</style></head>`)
  }

  const tags = [
    runtime && json.length > 0
      ? `<script type="application/json" id="kj-motion">[${json.join(',')}]</script><script type="module">${runtime}</script>`
      : '',
    effectScriptTags(effectsOnPage(page.nodes)),
  ].join('')
  if (!tags) return next
  return next.includes('</body>') ? next.replace('</body>', `${tags}</body>`) : `${next}${tags}`
}

function injectAfter(html: string, marker: string, fragment: string): string {
  const at = html.indexOf(marker)
  if (at < 0) return html
  const close = html.indexOf('>', at)
  if (close < 0) return html
  return `${html.slice(0, close + 1)}${fragment}${html.slice(close + 1)}`
}

/** Browser-safe gzip length. `CompressionStream` exists in Bun and in the editor. */
export async function gzipByteLength(text: string): Promise<number> {
  const compressed = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  const bytes = await new Response(compressed).arrayBuffer()
  return bytes.byteLength
}
