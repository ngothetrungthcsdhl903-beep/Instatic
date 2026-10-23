# Progress

Done:

- Product rename to Keijam across the admin UI, loading screen, package, and README. LICENSE keeps the Instatic MIT notice.
- `design-system/` generated tokens. Contrast check reports `FAILS 0`.
- Fake glass on chrome (`thin` / `regular` / `thick`). No `backdrop-filter`. Reduced transparency falls back to a solid. Canvas stays `--k-color-bg-canvas`.
- Layout engine: free (absolute) and stack (flex), Fixed / Fill / Fit, breakpoint overrides, hover and press. Snap, resize, and zoom math in `src/keijam/geometry.ts`, covered by tests.
- Keijam shell: left Layers and Insert, canvas zoom / pan / fit, right Design and Prototype, undo, nudge, multi-select. Classic editor remains available.
- Inputs at rest use `--k-color-control-border`.
- Cursor kit merged: `docs/memory/*`, `.cursor/rules/*`, `.cursor/mcp.json`.
- `lint:unused`, `size` (editor ≤ 300 KB gzip), `analyze`, and dev-only `react-scan`.
- Keijam MCP design commands (`keijam_create_node`, layout, sizing, style, breakpoints, components, tokens, selection, export, undo/redo) on the live editor bridge.
- Verify-after-edit: each mutation returns a node diff. A mounted Keijam canvas also returns a screenshot of the affected node.
- Shared undo with manual edits. Viewport culling and dirty paint signatures. Yoga WASM evaluated and not adopted. Clean HTML/CSS export, no runtime, 80 KB gzip.
- Code components: single-file TSX, property controls in the inspector, code panel, Framer paste (components run as a lowered preview; overrides are stored). `keijam_generate_component` builds one from a description via the design commands.
- Animate mode: state machine, keyframe timeline with record/capture, easing curve. CSS export, Web Animations runner only when needed.
- Lazy WebGL, Three.js, and GSAP loaders. Reference notes in `docs/memory/references.md`.

Left:

- Group one agent command into a single undo step. Today each store write is its own step on the shared stack, so undoing a create may take more than one `keijam_undo`.
- Official logo under `public/brand/` (favicon is still the placeholder). Noise tile is already there.
- Pages / Layers / Assets tabs, Framer-style inspector controls, grid, effects, gap and padding handles, inline text.
- Lucide everywhere. The monochrome rule is recorded; the shell and classic admin still render pixel-art icons.
- Classic admin surfaces that are not overlays still use `--bg-*` from `globals.css`.
