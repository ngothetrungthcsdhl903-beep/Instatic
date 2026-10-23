/**
 * Live editor store for code that must not import `store.ts`.
 * The store registers itself here after construction.
 */

import type { EditorStore } from '@site/store/types'
import { getAgentStoreApi } from './storeRef'

export function editorState(): EditorStore {
  return getAgentStoreApi<EditorStore>().getState()
}
