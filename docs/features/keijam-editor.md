# Keijam editor

The design surface for Keijam. It sits on the existing page tree and style-rule pipeline: what you drag is a node, and what you publish is the CSS class that node already owns.

## Shell

The site editor opens in the Keijam shell. Classic editor chrome is still one click away (`Classic` in the Keijam toolbar, `Keijam` on the classic canvas) and the choice is remembered in `localStorage` under `keijam.chrome`.

The shell is a left panel (Layers, Insert), a pasteboard with breakpoint frames side by side, and a right panel (Design, Prototype). Toolbar, both panels, and the zoom pill use fake glass (`data-k-material` in `src/styles/materials.css`). The pasteboard stays `--k-color-bg-canvas`. Color, type, and materials are the generated `--k-*` tokens; the accent is `--k-color-accent`. There is no `backdrop-filter`. See [`design-system/DESIGN_SYSTEM.md`](../../design-system/DESIGN_SYSTEM.md) and [`../memory/decisions.md`](../memory/decisions.md).

## Layout

A parent is **Free** or **Stack**.

- Free children are `position: absolute` with `left` / `top`.
- Stack is `display: flex` with direction, gap, padding, `align-items`, `justify-content`, and wrap.
- Each axis is Fixed (`Npx`), Fill (`100%`, `flex: 1 1 auto`, or `align-self: stretch`), or Fit (`fit-content`).

`src/keijam/layout.ts` is the mapping. The editor writes it through `ensureNodeStyleClass` and, on a narrower breakpoint frame, through `contextStyles`. The publisher emits those rules unchanged.

## Canvas

Space-drag pans. Ctrl/Cmd-scroll zooms around the cursor. Fit frames the breakpoints. Drag moves a free layer, resize handles change its box, and edges snap to siblings and the parent with distance labels. Shift-click and Cmd/Ctrl-click multi-select. Arrow keys nudge (Shift moves by 10). Undo and redo are the editor history.

## Deferred

Components and variants, grid beyond stack, pin constraints, vectors, effects, page-to-page prototyping, inline rich text, and the media-library image picker are not in this surface yet. Image source is a URL field. Hover and press are background, opacity, and scale with a CSS transition.
