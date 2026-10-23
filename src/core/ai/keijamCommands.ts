/**
 * Keijam design-command input schemas — the single source of truth.
 *
 * Advertised by the MCP / site tool registry and validated again by the
 * browser executor. The shapes follow the Keijam layout model (free or
 * stack, fixed / fill / fit). OpenPencil's tool list was a reference for
 * which operations an agent needs; these names and fields are Keijam's.
 */

import { Type, type Static } from '@core/utils/typeboxHelpers'

const BreakpointId = Type.Optional(Type.String({ minLength: 1 }))

export const KeijamSizingSchema = Type.Object({
  mode: Type.Union([Type.Literal('fixed'), Type.Literal('fill'), Type.Literal('fit')]),
  px: Type.Optional(Type.Number({ minimum: 0 })),
})

export const KeijamLayoutPatchSchema = Type.Object({
  mode: Type.Optional(Type.Union([Type.Literal('free'), Type.Literal('stack')])),
  direction: Type.Optional(Type.Union([Type.Literal('row'), Type.Literal('column')])),
  gap: Type.Optional(Type.Number({ minimum: 0 })),
  padding: Type.Optional(Type.Number({ minimum: 0 })),
  paddingTop: Type.Optional(Type.Number({ minimum: 0 })),
  paddingRight: Type.Optional(Type.Number({ minimum: 0 })),
  paddingBottom: Type.Optional(Type.Number({ minimum: 0 })),
  paddingLeft: Type.Optional(Type.Number({ minimum: 0 })),
  align: Type.Optional(Type.Union([
    Type.Literal('start'),
    Type.Literal('center'),
    Type.Literal('end'),
    Type.Literal('stretch'),
  ])),
  distribute: Type.Optional(Type.Union([
    Type.Literal('start'),
    Type.Literal('center'),
    Type.Literal('end'),
    Type.Literal('space-between'),
  ])),
  wrap: Type.Optional(Type.Boolean()),
  x: Type.Optional(Type.Number()),
  y: Type.Optional(Type.Number()),
  width: Type.Optional(KeijamSizingSchema),
  height: Type.Optional(KeijamSizingSchema),
})

export const KeijamStylePatchSchema = Type.Object({
  backgroundColor: Type.Optional(Type.String()),
  color: Type.Optional(Type.String()),
  radius: Type.Optional(Type.Number({ minimum: 0 })),
  opacity: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  fontSize: Type.Optional(Type.Number({ minimum: 0 })),
  fontWeight: Type.Optional(Type.Number({ minimum: 1 })),
  textAlign: Type.Optional(Type.Union([
    Type.Literal('left'),
    Type.Literal('center'),
    Type.Literal('right'),
  ])),
  objectFit: Type.Optional(Type.Union([Type.Literal('cover'), Type.Literal('contain')])),
})

export const KeijamCreateNodeInputSchema = Type.Object({
  kind: Type.Union([Type.Literal('frame'), Type.Literal('text'), Type.Literal('image')]),
  parentId: Type.Optional(Type.String({ minLength: 1 })),
  index: Type.Optional(Type.Integer({ minimum: 0 })),
  name: Type.Optional(Type.String()),
  text: Type.Optional(Type.String()),
  src: Type.Optional(Type.String()),
  layout: Type.Optional(KeijamLayoutPatchSchema),
  style: Type.Optional(KeijamStylePatchSchema),
  breakpointId: BreakpointId,
})

export const KeijamUpdateNodeInputSchema = Type.Object({
  nodeId: Type.String({ minLength: 1 }),
  name: Type.Optional(Type.String()),
  text: Type.Optional(Type.String()),
  src: Type.Optional(Type.String()),
  layout: Type.Optional(KeijamLayoutPatchSchema),
  style: Type.Optional(KeijamStylePatchSchema),
  breakpointId: BreakpointId,
})

export const KeijamDeleteNodeInputSchema = Type.Object({
  nodeId: Type.String({ minLength: 1 }),
})

export const KeijamSetLayoutInputSchema = Type.Object({
  nodeId: Type.String({ minLength: 1 }),
  layout: KeijamLayoutPatchSchema,
  breakpointId: BreakpointId,
})

export const KeijamSetSizingInputSchema = Type.Object({
  nodeId: Type.String({ minLength: 1 }),
  width: Type.Optional(KeijamSizingSchema),
  height: Type.Optional(KeijamSizingSchema),
  breakpointId: BreakpointId,
})

export const KeijamSetStyleInputSchema = Type.Object({
  nodeId: Type.String({ minLength: 1 }),
  style: KeijamStylePatchSchema,
  breakpointId: BreakpointId,
})

export const KeijamSetBreakpointInputSchema = Type.Object({
  nodeId: Type.String({ minLength: 1 }),
  breakpointId: Type.String({ minLength: 1 }),
  layout: Type.Optional(KeijamLayoutPatchSchema),
  style: Type.Optional(KeijamStylePatchSchema),
})

export const KeijamSelectInputSchema = Type.Object({
  nodeIds: Type.Array(Type.String({ minLength: 1 })),
})

export const KeijamGetSelectionInputSchema = Type.Object({})

export const KeijamGetNodeInputSchema = Type.Object({
  nodeId: Type.String({ minLength: 1 }),
  breakpointId: BreakpointId,
})

export const KeijamListNodesInputSchema = Type.Object({
  parentId: Type.Optional(Type.String({ minLength: 1 })),
  query: Type.Optional(Type.String()),
  breakpointId: BreakpointId,
})

export const KeijamCreateComponentInputSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  nodeId: Type.Optional(Type.String({ minLength: 1 })),
})

export const KeijamInsertComponentInputSchema = Type.Object({
  componentId: Type.String({ minLength: 1 }),
  parentId: Type.Optional(Type.String({ minLength: 1 })),
  index: Type.Optional(Type.Integer({ minimum: 0 })),
})

export const KeijamDeleteComponentInputSchema = Type.Object({
  componentId: Type.String({ minLength: 1 }),
})

export const KeijamListComponentsInputSchema = Type.Object({})

export const KeijamExportInputSchema = Type.Object({
  pageId: Type.Optional(Type.String({ minLength: 1 })),
})

export const KeijamHistoryInputSchema = Type.Object({})

export type KeijamSizingInput = Static<typeof KeijamSizingSchema>
export type KeijamLayoutPatch = Static<typeof KeijamLayoutPatchSchema>
export type KeijamStylePatch = Static<typeof KeijamStylePatchSchema>
export type KeijamCreateNodeInput = Static<typeof KeijamCreateNodeInputSchema>
export type KeijamUpdateNodeInput = Static<typeof KeijamUpdateNodeInputSchema>
export type KeijamDeleteNodeInput = Static<typeof KeijamDeleteNodeInputSchema>
export type KeijamSetLayoutInput = Static<typeof KeijamSetLayoutInputSchema>
export type KeijamSetSizingInput = Static<typeof KeijamSetSizingInputSchema>
export type KeijamSetStyleInput = Static<typeof KeijamSetStyleInputSchema>
export type KeijamSetBreakpointInput = Static<typeof KeijamSetBreakpointInputSchema>
export type KeijamSelectInput = Static<typeof KeijamSelectInputSchema>
export type KeijamGetNodeInput = Static<typeof KeijamGetNodeInputSchema>
export type KeijamListNodesInput = Static<typeof KeijamListNodesInputSchema>
export type KeijamCreateComponentInput = Static<typeof KeijamCreateComponentInputSchema>
export type KeijamInsertComponentInput = Static<typeof KeijamInsertComponentInputSchema>
export type KeijamDeleteComponentInput = Static<typeof KeijamDeleteComponentInputSchema>
export type KeijamExportInput = Static<typeof KeijamExportInputSchema>
