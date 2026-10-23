/**
 * Clean HTML + CSS export. No hole runtime, no loop runtime, no import map,
 * no module script. Dynamic nodes render inline. The gzip budget is the
 * published document, not the editor bundle.
 */

import type { IModuleRegistry } from '@core/module-engine'
import type { Page, SiteDocument } from '@core/page-tree'
import { publishPage } from '@core/publisher'

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
  const html = published.html.replace(SCRIPT_TAG, '').replace(HOLE_TAG, '')
  const gzipBytes = await gzipByteLength(html)
  return {
    filename: published.filename,
    html,
    gzipBytes,
    withinBudget: gzipBytes <= CLEAN_EXPORT_GZIP_BUDGET,
  }
}

/** Browser-safe gzip length. `CompressionStream` exists in Bun and in the editor. */
export async function gzipByteLength(text: string): Promise<number> {
  const compressed = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  const bytes = await new Response(compressed).arrayBuffer()
  return bytes.byteLength
}
