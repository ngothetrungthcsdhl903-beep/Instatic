/**
 * Canvas page selectors. Kept out of `store.ts` so design-surface code can
 * read the active page without importing the store module (that import
 * cycles back through the agent executor).
 */

import type { Page } from '@core/page-tree'
import { flattenVCToVirtualPage } from '@core/visualComponents'
import type { EditorStore } from './types'

let activePageCache: { site: object; activePageId: string; page: Page | null } | null = null

/** Select the active page from the site (one `pages` scan per store update). */
export const selectActivePage = (state: EditorStore): Page | null => {
  const { site, activePageId } = state
  if (!site || !activePageId) return null
  if (
    activePageCache &&
    activePageCache.site === site &&
    activePageCache.activePageId === activePageId
  ) {
    return activePageCache.page
  }
  const page = site.pages.find((candidate) => candidate.id === activePageId) ?? null
  activePageCache = { site, activePageId, page }
  return page
}

const virtualPageCache = new WeakMap<object, Page>()

/**
 * Select the current canvas document as a Page.
 *
 * Page mode returns the active page. Visual-component mode returns a virtual
 * page built from that component's tree, memoised on the component object.
 */
export const selectActiveCanvasPage = (state: EditorStore): Page | null => {
  const { activeDocument } = state
  if (!activeDocument || activeDocument.kind === 'page') return selectActivePage(state)
  if (activeDocument.kind !== 'visualComponent') return null
  const component = state.site?.visualComponents?.find((candidate) => candidate.id === activeDocument.vcId) ?? null
  if (!component) return null
  const cached = virtualPageCache.get(component)
  if (cached) return cached
  const virtualPage = flattenVCToVirtualPage(component)
  virtualPageCache.set(component, virtualPage)
  return virtualPage
}
