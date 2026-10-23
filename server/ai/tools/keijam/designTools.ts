/**
 * Keijam design commands. Browser-executed against the open Site editor,
 * same bridge as the other site write tools. Input schemas live in
 * `@core/ai` and are the objects the executor validates.
 */

import type { CoreCapability } from '@core/capabilities'
import {
  KeijamCreateComponentInputSchema,
  KeijamCreateNodeInputSchema,
  KeijamDeleteComponentInputSchema,
  KeijamDeleteNodeInputSchema,
  KeijamExportInputSchema,
  KeijamGetNodeInputSchema,
  KeijamGetSelectionInputSchema,
  KeijamHistoryInputSchema,
  KeijamInsertComponentInputSchema,
  KeijamListComponentsInputSchema,
  KeijamListNodesInputSchema,
  KeijamSelectInputSchema,
  KeijamSetBreakpointInputSchema,
  KeijamSetLayoutInputSchema,
  KeijamSetSizingInputSchema,
  KeijamSetStyleInputSchema,
  KeijamUpdateNodeInputSchema,
  SetColorTokensInputSchema,
  SetFontTokensInputSchema,
  SetSpacingScaleInputSchema,
  SetTypeScaleInputSchema,
} from '@core/ai'
import type { AiTool } from '../types'

const STRUCTURE: readonly CoreCapability[] = ['site.structure.edit']
const STYLE: readonly CoreCapability[] = ['site.style.edit']
const EDIT: readonly CoreCapability[] = ['site.structure.edit', 'site.style.edit']

function tool(
  name: string,
  description: string,
  inputSchema: AiTool['inputSchema'],
  requiredCapabilities?: readonly CoreCapability[],
): AiTool {
  return {
    name,
    description,
    scope: 'site',
    execution: 'browser',
    inputSchema,
    ...(requiredCapabilities ? { requiredCapabilities } : {}),
  }
}

const VERIFY = ' Returns a before/after diff and a snapshot of the affected nodes. When the Keijam canvas is open, a screenshot of the node is attached so you can confirm the result before the next edit. Undo and redo share the canvas history.'

export const keijamDesignTools: AiTool[] = [
  tool(
    'keijam_create_node',
    'Create a Keijam frame, text, or image. Frames are free or stack parents. Pass layout (mode, direction, gap, padding, align, distribute, x, y, width, height) and style (color, background, radius, type). parentId defaults to the selection when it can hold children, otherwise the page root.' + VERIFY,
    KeijamCreateNodeInputSchema,
    STRUCTURE,
  ),
  tool(
    'keijam_update_node',
    'Update a node\'s name, text, image src, layout, and style in one call. Omitted fields stay as they are.' + VERIFY,
    KeijamUpdateNodeInputSchema,
    STRUCTURE,
  ),
  tool(
    'keijam_delete_node',
    'Delete a node and its children.' + VERIFY,
    KeijamDeleteNodeInputSchema,
    STRUCTURE,
  ),
  tool(
    'keijam_set_layout',
    'Set auto-layout. mode "stack" is CSS flex (direction row or column, gap, padding, align start|center|end|stretch, distribute start|center|end|space-between, wrap). mode "free" places children with x and y. Pass breakpointId to write a narrower frame instead of the base.' + VERIFY,
    KeijamSetLayoutInputSchema,
    EDIT,
  ),
  tool(
    'keijam_set_sizing',
    'Set width and height. Each axis is fixed (px), fill, or fit.' + VERIFY,
    KeijamSetSizingInputSchema,
    EDIT,
  ),
  tool(
    'keijam_set_style',
    'Set paint and type on a node: backgroundColor, color, radius, opacity, fontSize, fontWeight, textAlign, objectFit. Prefer token references such as var(--color) when a token exists.' + VERIFY,
    KeijamSetStyleInputSchema,
    STYLE,
  ),
  tool(
    'keijam_set_breakpoint',
    'Write layout and style as an override on one breakpoint and show that frame. The widest breakpoint is the base rule; narrower ones become context overrides.' + VERIFY,
    KeijamSetBreakpointInputSchema,
    EDIT,
  ),
  tool(
    'keijam_select',
    'Replace the canvas selection. Pass an empty nodeIds array to clear it. Does not change the document.',
    KeijamSelectInputSchema,
  ),
  tool(
    'keijam_get_selection',
    'Read the current selection and each selected node\'s layout snapshot.',
    KeijamGetSelectionInputSchema,
  ),
  tool(
    'keijam_get_node',
    'Read one node: name, text, src, parent, children, and its Keijam layout.',
    KeijamGetNodeInputSchema,
  ),
  tool(
    'keijam_list_nodes',
    'List nodes on the open page. Optional parentId limits the list to direct children. Optional query matches name, text, or id.',
    KeijamListNodesInputSchema,
  ),
  tool(
    'keijam_create_component',
    'Create a visual component. Pass nodeId to convert that node into the component; omit it to create an empty component.' + VERIFY,
    KeijamCreateComponentInputSchema,
    STRUCTURE,
  ),
  tool(
    'keijam_insert_component',
    'Insert an instance of a visual component. Slot fills are real child nodes, not a separate content bag.' + VERIFY,
    KeijamInsertComponentInputSchema,
    STRUCTURE,
  ),
  tool(
    'keijam_delete_component',
    'Delete a visual component definition and its instances.' + VERIFY,
    KeijamDeleteComponentInputSchema,
    STRUCTURE,
  ),
  tool(
    'keijam_list_components',
    'List visual components on the open site as id and name.',
    KeijamListComponentsInputSchema,
  ),
  tool(
    'keijam_set_color_tokens',
    'Create or update color tokens (slug, lightValue, optional darkValue). Same write as site_set_color_tokens, on the shared editor history.',
    SetColorTokensInputSchema,
    STYLE,
  ),
  tool(
    'keijam_set_font_tokens',
    'Create or update font tokens. Pass googleFamily to install a web font. Same write as site_set_font_tokens.',
    SetFontTokensInputSchema,
    STYLE,
  ),
  tool(
    'keijam_set_type_scale',
    'Create or update the type scale that generates --text-* variables. Same write as site_set_type_scale.',
    SetTypeScaleInputSchema,
    STYLE,
  ),
  tool(
    'keijam_set_spacing_scale',
    'Create or update the spacing scale that generates --space-* variables. Same write as site_set_spacing_scale.',
    SetSpacingScaleInputSchema,
    STYLE,
  ),
  tool(
    'keijam_export',
    'Export the open page as one HTML document with CSS inlined and no runtime script, no hole runtime, and no import map. The response includes gzipBytes and withinBudget (80 KB gzip).',
    KeijamExportInputSchema,
  ),
  tool(
    'keijam_undo',
    'Undo the latest editor step. This is the same history as the toolbar and keyboard shortcut, shared with manual edits.' + VERIFY,
    KeijamHistoryInputSchema,
    EDIT,
  ),
  tool(
    'keijam_redo',
    'Redo the latest undone editor step. Same history as the toolbar.' + VERIFY,
    KeijamHistoryInputSchema,
    EDIT,
  ),
]
