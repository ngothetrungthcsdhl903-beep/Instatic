/**
 * Keijam design-command schemas are the same objects the browser validates.
 * Adding a command means exporting its schema from `@core/ai` and listing it here.
 */
import { describe, expect, it } from 'bun:test'
import { keijamDesignTools } from '../../../server/ai/tools/keijam/designTools'
import {
  KeijamCreateComponentInputSchema,
  KeijamCreateNodeInputSchema,
  KeijamDeleteComponentInputSchema,
  KeijamDeleteNodeInputSchema,
  KeijamExportInputSchema,
  KeijamGenerateComponentInputSchema,
  KeijamGetNodeInputSchema,
  KeijamPasteComponentInputSchema,
  KeijamGetSelectionInputSchema,
  KeijamHistoryInputSchema,
  KeijamInsertComponentInputSchema,
  KeijamListComponentsInputSchema,
  KeijamListNodesInputSchema,
  KeijamSelectInputSchema,
  KeijamSetBreakpointInputSchema,
  KeijamSetLayoutInputSchema,
  KeijamSetSizingInputSchema,
  KeijamSetEffectInputSchema,
  KeijamSetMotionInputSchema,
  KeijamSetStyleInputSchema,
  KeijamUpdateNodeInputSchema,
  SetColorTokensInputSchema,
  SetFontTokensInputSchema,
  SetSpacingScaleInputSchema,
  SetTypeScaleInputSchema,
} from '@core/ai'

const EXPECTED_SCHEMA_BY_TOOL = {
  keijam_create_node: KeijamCreateNodeInputSchema,
  keijam_update_node: KeijamUpdateNodeInputSchema,
  keijam_delete_node: KeijamDeleteNodeInputSchema,
  keijam_set_layout: KeijamSetLayoutInputSchema,
  keijam_set_sizing: KeijamSetSizingInputSchema,
  keijam_set_style: KeijamSetStyleInputSchema,
  keijam_set_breakpoint: KeijamSetBreakpointInputSchema,
  keijam_select: KeijamSelectInputSchema,
  keijam_get_selection: KeijamGetSelectionInputSchema,
  keijam_get_node: KeijamGetNodeInputSchema,
  keijam_list_nodes: KeijamListNodesInputSchema,
  keijam_create_component: KeijamCreateComponentInputSchema,
  keijam_insert_component: KeijamInsertComponentInputSchema,
  keijam_delete_component: KeijamDeleteComponentInputSchema,
  keijam_list_components: KeijamListComponentsInputSchema,
  keijam_set_color_tokens: SetColorTokensInputSchema,
  keijam_set_font_tokens: SetFontTokensInputSchema,
  keijam_set_type_scale: SetTypeScaleInputSchema,
  keijam_set_spacing_scale: SetSpacingScaleInputSchema,
  keijam_generate_component: KeijamGenerateComponentInputSchema,
  keijam_paste_component: KeijamPasteComponentInputSchema,
  keijam_set_effect: KeijamSetEffectInputSchema,
  keijam_set_motion: KeijamSetMotionInputSchema,
  keijam_export: KeijamExportInputSchema,
  keijam_undo: KeijamHistoryInputSchema,
  keijam_redo: KeijamHistoryInputSchema,
} as const

describe('keijam design-command schema SSOT', () => {
  it('every command reuses the exact leaf schema object', () => {
    for (const tool of keijamDesignTools) {
      const expected = EXPECTED_SCHEMA_BY_TOOL[tool.name as keyof typeof EXPECTED_SCHEMA_BY_TOOL]
      expect(expected, `no expected schema mapped for tool "${tool.name}"`).toBeDefined()
      expect(tool.inputSchema).toBe(expected)
    }
  })

  it('the map covers every command', () => {
    expect(keijamDesignTools.map((tool) => tool.name).sort()).toEqual(
      Object.keys(EXPECTED_SCHEMA_BY_TOOL).sort(),
    )
  })
})
