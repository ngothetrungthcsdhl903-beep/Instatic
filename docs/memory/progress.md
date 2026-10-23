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

Left:

- Official logo under `public/brand/` (favicon is still the placeholder). Noise tile is already there.
- Pages / Layers / Assets tabs, Framer-style inspector controls, grid, effects, gap and padding handles, inline text.
- Lucide everywhere. The monochrome rule is recorded; the shell and classic admin still render pixel-art icons.
- Classic admin surfaces that are not overlays still use `--bg-*` from `globals.css`.
