# Keijam Design System v0.1

Framer-style design tool held to macOS HIG precision. **Source of truth:** `gen.py` → `tokens.json` + `tokens.css` (`--k-*`). Component specs only reference tokens. No hex values in components.

## 1. Principles
1. **Content first.** The canvas is the hero. Chrome stays quiet and neutral, and color means state.
2. **One accent.** Blue is reserved for selection, focus, primary action and the active tool. Success, warning and danger are muted and used only for status.
3. **Dense and precise.** 13px UI text, 28px rows, 4px grid, values aligned on the pixel.
4. **Fake glass on chrome, solid on the canvas.** Panels, toolbars, menus, and popovers use a semi-opaque material. The canvas does not.
5. **Direct manipulation.** Every numeric value can be scrubbed, stepped with arrows and typed.
6. **Respect user settings:** reduced transparency, reduced motion, more contrast, light/dark/system.

## 2. Layout
```
┌──────────────── Toolbar (glass, 44px, floating) ───────────────────┐
│ Sidebar 240 │            Canvas (bg-canvas)            │ Inspector │
│ Pages       │  [Desktop 1440] ←80→ [Tablet 810] ←80→ [Mobile 390] │ 264      │
│ Layers      │                                          │ sections │
│ Assets      │                                          │          │
└─────────────┴──────────────────────────────────────────┴──────────┘
```
| Region | Token | Value | Notes |
|---|---|---|---|
| Toolbar | `--k-layout-toolbar-height` | 44 | Glass `regular`, `--k-z-toolbar`. Tools on the left, project name in the center, share/preview on the right |
| Sidebar | `--k-layout-sidebar-width` (min 200 / max 360) | 240 | Fake glass `regular`. Tabs: Pages / Layers / Assets. Resizable, 1px `separator` edge |
| Layer tree row | `--k-layout-tree-row-height` | 24 | Indent `--k-layout-tree-indent` (12) per level |
| Inspector | `--k-layout-inspector-width` (240–360) | 264 | Fake glass `regular`. Stack of Sections |
| Section header | `--k-layout-section-header-height` | 32 | |
| Property row | `--k-layout-row-height` | 28 | Label column `--k-control-label-col` (72) |
| Canvas | `--k-color-bg-canvas` | — | Infinite pan/zoom (10%–6400%). Breakpoint frames sit side by side with `--k-layout-breakpoint-gap` (80) between them |
| Breakpoint frame | `--k-breakpoint-desktop/tablet/mobile` | 1440/810/390 | Label bar of 24 above each frame: `type-label`, `fg-secondary`, width shown in mono. The active frame's label uses `accent-text` |

**Canvas overlays** (selection box, handles, smart guides, measurements) use `--k-color-canvas-selection` and stay 1 device px wide at any zoom. Handles are 7×7 with a `bg-surface` fill and a 1px `canvas-selection` border. Measurement pills use the `danger` hue only for distance guides. The overlay is on `--k-z-canvas-overlay`.

## 3. Materials
Fake glass, not a backdrop blur. Every level is a semi-opaque fill (about 72% / 80% / 85%), a top-to-bottom sheen, a 1px inner top highlight, a soft shadow, a 6px feather mask, and a tiled noise image (`/brand/noise.png`, cached). `--k-material-*-blur` is `0px`. Do not set `backdrop-filter`.

| Level | Use | Fill |
|---|---|---|
| `thin` | Tooltip, zoom pill | `--k-material-thin-*` |
| `regular` | Toolbar, sidebar, inspector, panels | `--k-material-regular-*` |
| `thick` | Menu, popover, dialog, command palette | `--k-material-thick-*` |

Recipe: mark the element `data-k-material="thin|regular|thick"`. `src/styles/materials.css` paints the fill on a `::before` (so children are not clipped), feathers it with `mask-composite: intersect` on `--k-material-*-feather-y/x`, and draws `box-shadow: inset 0 1px 0 var(--k-material-highlight), var(--k-material-shadow)`. Scrollports that cannot take the mask set the same fill, sheen, and noise as their own `background` and skip the mask.

**On chrome:** toolbar, sidebars, inspector, floating panels, menus, popovers, dialogs, toasts, tooltips.
**Solid:** the canvas and breakpoint frames. Full-screen scrims stay a flat scrim, not a blur.
**Inputs** stay on `bg-control` with a 1px `--k-color-control-border` at rest (see §9.2). Do not stack a second glass layer on a control that already sits on a glass panel.
Fallbacks: under `prefers-reduced-transparency` every level resolves to `--k-material-solid-fallback`, sheen and noise become `none`, and the feather mask becomes opaque. Text contrast holds over a worst-case backdrop: `fg-primary` stays ≥ 4.5:1 on all levels over pure black or pure white (see `contrast-report.txt`). The noise is a static bitmap, so dragging does not restyle a filter.

## 4. Color
- Surfaces: `bg-canvas` < `bg-panel` < `bg-surface` < `bg-elevated`. Light mode gets darker toward the canvas. Dark mode gets lighter as surfaces rise (elevation = lightness, like macOS), so the dark palette is tuned separately, not inverted.
- Text: `fg-primary` for values and names; `fg-secondary` for labels; `fg-tertiary` for placeholders, units and hints; `fg-disabled` only for disabled items (exempt from AA).
- Accent: `accent` / `-hover` / `-pressed` for fills, `accent-text` for blue text and links, `accent-subtle` for the selected-but-not-focused tint, `selection` for selected tree rows, `selection-strong` for the focused selection row (text becomes `fg-on-accent`), and `focus-ring` (2px outline, 1px offset).
- Status: `success|warning|danger` (+`-subtle` backgrounds). Destructive buttons use `danger`.
- Borders: `separator` for hairlines between regions, `border` for non-interactive outlines, `control-border` for input and control outlines (≥3:1 for WCAG 1.4.11).

## 5. Typography (Inter)
`font-family: var(--k-font-family-sans); font-feature-settings: var(--k-font-feature-ui);` (tabular numbers on).
| Token | Size/Line/Weight | Use |
|---|---|---|
| `type-body` | 13/18/400 | Default UI, inputs, menu items |
| `type-body-strong` | 13/18/600 | Selected layer, emphasized value |
| `type-label` | 12/16/500 | Property labels, buttons in sm |
| `type-section` | 11/14/600 +0.02em | Inspector section headers (sentence case, not all caps) |
| `type-caption` | 11/14/400 | Tooltips' shortcut, frame width, hints |
| `type-footnote` | 12/16/400 | Helper text |
| `type-headline` | 15/20/600 | Popover / dialog titles |
| `type-title` / `large-title` | 17/22 · 22/28 | Empty states, onboarding |
| `type-mono` | 12/16 JetBrains Mono | Hex values, code, CSS export. NumberField uses Inter tnum, not mono |

## 6. Iconography (Lucide)
Sizes `--k-control-icon-sm/md/lg` = 14/16/20. Stroke `--k-control-icon-stroke` 1.5 (default), 2 at 14px for legibility. Color `currentColor` (`fg-secondary` idle → `fg-primary` hover → `accent` when active or toggled). Toolbar uses 16 in 28px buttons, inspector uses 14, and empty states use 20. Always pair an icon-only control with `aria-label` and a Tooltip.

## 7. Motion
| Token | Value | Use |
|---|---|---|
| `duration-fast` | 100ms | Hover, press |
| `duration-base` | 160ms | Toggle, segmented thumb, section collapse |
| `duration-slow` | 240ms | Popover/menu enter |
| `duration-slower` | 360ms | Panel resize animation, canvas zoom-to-fit |
| `ease-standard` / `ease-out` / `ease-in` | | Generic / enter / exit |
| `spring-snappy` 520/40/1 | | Thumbs, toggles (critically damped) |
| `spring-smooth` 320/34/1 | | Popover, panel |
| `spring-bouncy` 400/24/1 | | Drag-drop settle only |

Rules: menus appear instantly (0ms in) and fade out over 100ms, as on macOS. Popovers scale from 0.97 and fade, anchored to their trigger. Never animate canvas content on property edits, because edits must feel immediate. With `prefers-reduced-motion`, `--k-motion-transform: none`, `--k-motion-scale: 1` and durations are capped at 100ms (opacity only), and springs are replaced by a snap or fade.

## 8. Accessibility
- AA everywhere: all pairs in `contrast-report.txt` pass (0 fails). `prefers-contrast: more` darkens or brightens secondary text, borders and separators, and makes the focus ring solid.
- Focus: `:focus-visible` → `outline: 2px solid var(--k-color-focus-ring); outline-offset: 1px`. Never remove it.
- Full keyboard: Tab moves between regions (toolbar → sidebar → canvas → inspector), arrows move within composite widgets (roving tabindex), Esc closes the topmost layer or deselects, and F6 cycles regions.
- Hit targets are at least 22px tall (sm). Pointer slop extends to 24px through a padding pseudo-element.
- Don't rely on color alone: mixed values show "Mixed", and errors pair an icon with text.

---
## 9. Components
Shared states: **hover** `bg-hover` overlay · **pressed** `bg-pressed` · **focus-visible** ring · **disabled** `fg-disabled`, no hover, `aria-disabled` · **selected** accent styling · **mixed** shows "Mixed" (`fg-tertiary`) or the "–" glyph.
Sizes: `sm` 22 / `md` 28 (default) / `lg` 32 (`--k-control-height-*`). Radius `--k-radius-md` (6) for controls, `sm` (5) for sm, `lg` (8) for popovers and menus, `xl` (12) for the toolbar shell.

### 9.1 Button
Anatomy: [icon?] label [shortcut/chevron?]. Padding x: sm 8 / md 10 / lg 12; gap 6; `type-body` (sm uses `type-label`).
| Variant | Rest | Hover | Pressed |
|---|---|---|---|
| primary | `accent` bg, `fg-on-accent` | `accent-hover` | `accent-pressed` |
| secondary | `bg-control`, 1px `border`, `shadow-control`, `fg-primary` | `bg-control-hover` | `bg-control-pressed` |
| ghost | transparent, `fg-secondary` | `bg-hover`, `fg-primary` | `bg-pressed` |
| destructive | `bg-control`, `danger` text (confirm step: `danger` fill + `fg-on-accent`) | `danger-subtle` | |
| icon | square (22/28/32), ghost style; selected uses `accent-subtle` bg + `accent` icon | | |
Keyboard: Enter/Space. Toggle buttons use `aria-pressed`. A loading state keeps the button's width and sets `aria-busy`.
```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary'|'secondary'|'ghost'|'destructive'; size?: 'sm'|'md'|'lg';
  icon?: LucideIcon; iconOnly?: boolean; pressed?: boolean; loading?: boolean; shortcut?: string;
}
```

### 9.2 Input & NumberField
Anatomy: [label] [prefix icon/letter] value [unit] [stepper?]. Height md 28, radius md, padding x 8, bg `bg-control`, 1px `--k-color-control-border` at rest (the border is visible; it clears WCAG 1.4.11 at 3:1). Hover uses `border-strong`. Focus uses a 1px `accent` border plus the focus ring. Text `type-body`, tabular numbers, right-aligned values in NumberField, unit in `fg-tertiary`.
NumberField behaviour:
- **Scrub:** drag the label or prefix horizontally (cursor `ew-resize`, pointer lock): 1 unit per px. **Shift** gives ×10 and **Alt/Option** gives ×0.1. Esc during the drag reverts. A whole scrub counts as one undo step.
- **Keys:** ↑/↓ step ±`step` (default 1), Shift ×10, Alt ×0.1. Enter commits, Esc reverts, and Tab commits and moves on.
- **Expressions:** `100/2`, `+8`, `50%`.
- **Units:** `px | % | fr | auto | vw | vh | em | rem`. Typing a unit converts the value. A click on the unit opens a Select.
- **Mixed:** empty value, "Mixed" placeholder in `fg-tertiary`, `aria-valuetext="Mixed"`. Typing or scrubbing applies a relative or absolute value to all items.
- Clamp to `min`/`max`. Invalid input flashes the border with `danger` and reverts.
A11y: `role="spinbutton"`, `aria-valuenow/min/max`, `aria-label` from the row label. The scrub label is `aria-hidden` and the keyboard equivalent covers it.
```ts
interface NumberFieldProps {
  value: number | 'mixed'; onChange(v: number, meta: { commit: boolean }): void;
  min?: number; max?: number; step?: number; precision?: number;
  unit?: Unit; units?: Unit[]; onUnitChange?(u: Unit): void;
  label?: string; prefix?: React.ReactNode; scrubbable?: boolean; size?: 'sm'|'md'; disabled?: boolean;
}
```

### 9.3 Segmented control
Track `bg-control-pressed` (light) / `bg-control` (dark), radius md, padding 2. Thumb `bg-surface` + `shadow-sm`, slides with `spring-snappy`. Segments are equal width, text or 14px icons, with `fg-secondary` → selected `fg-primary`. Mixed: no thumb. Heights 22/28.
Single-select uses `role="radiogroup"` with `role="radio"` children; arrows move the selection; it's one tab stop. Multi-select (e.g. bold/italic) uses toggle buttons with `aria-pressed`.
```ts
interface SegmentedProps<T extends string> { value: T | 'mixed'; onChange(v: T): void;
  options: { value: T; label?: string; icon?: LucideIcon; tooltip?: string }[]; size?: 'sm'|'md'; 'aria-label': string; }
```

### 9.4 Toggle / Switch
26×16 track (md) / 22×13 (sm). Off: `gray` track (`border-strong`); on: `accent`. The knob is `gray-0` with `shadow-sm` and moves with `spring-snappy`. Mixed: knob centered, track `accent-subtle`. Checkbox variant is 14px, radius xs, with a Lucide check.
`role="switch"` and `aria-checked` (`"mixed"` allowed only on checkboxes). Space toggles it.
```ts
interface SwitchProps { checked: boolean | 'mixed'; onChange(v: boolean): void; size?: 'sm'|'md'; disabled?: boolean; 'aria-label'?: string; }
```

### 9.5 Slider (+ paired NumberField)
The track is 4px tall, `border` color, with an `accent` fill from min (or from center when bipolar). The thumb is a 14px circle, `gray-0`, with `shadow-md` and a 0.5px `control-border`. Row layout: label | slider (flex) | NumberField 56px wide. Tick snapping only appears with Shift held. Clicking the track jumps; dragging updates live; release commits one undo step.
`role="slider"`, arrows ±step, Shift ×10, PageUp/PageDown ±10%, Home/End for min/max.
```ts
interface SliderProps { value: number | 'mixed'; onChange(v: number, meta:{commit:boolean}): void;
  min: number; max: number; step?: number; bipolar?: boolean; withField?: boolean; unit?: Unit; }
```

### 9.6 Select / Popup button
Looks like a secondary Button with a trailing `chevrons-up-down` icon at 14px in `fg-tertiary`. It opens a Menu (glass `thick`) positioned so the current item sits over the trigger, like macOS popup buttons, falling back to below the trigger near screen edges. Mixed shows "Mixed".
`aria-haspopup="listbox"`, `aria-expanded`. Space, Enter or ↓ opens it, typeahead jumps, and Esc closes it and returns focus.
```ts
interface SelectProps<T> { value: T | 'mixed'; onChange(v: T): void; options: SelectOption<T>[]; placeholder?: string; size?: 'sm'|'md'; }
```

### 9.7 Popover
Glass `regular`, radius lg, `shadow-lg`, padding 12, width 240–320, optional arrow (8px). `z-popover`. Header uses `type-headline`. Enter: fade plus scale 0.97 → 1 with `spring-smooth`; exit: 100ms fade. Light dismiss on outside click or Esc. Used for color picker, fill and effects editors.
`role="dialog"`, `aria-labelledby`. Focus moves to the first field and returns to the trigger. Not modal: the canvas stays interactive.
```ts
interface PopoverProps { open: boolean; onOpenChange(o: boolean): void; anchor: React.RefObject<HTMLElement>;
  side?: 'top'|'right'|'bottom'|'left'; align?: 'start'|'center'|'end'; title?: string; arrow?: boolean; children: React.ReactNode; }
```

### 9.8 Menu (context + dropdown)
Glass `thick`, radius lg, padding 4, min width 180, `shadow-lg`, `z-menu`. Items are 24px tall, radius sm, padding x 8, `type-body`. Each row reads [check/icon slot 16] label … [shortcut in `fg-tertiary`, `type-body`, glyphs ⌘⇧⌥⌃, or Ctrl+ on Windows] [submenu `chevron-right`]. Highlight: `selection-strong` bg with `fg-on-accent` text, matching macOS. Separators are 1px `separator` with 4px margin. Group headers use `type-section` in `fg-tertiary`. Destructive items use `danger` text (a `danger` highlight when active).
Submenus open after 100ms of hover or on →, and close on ←. A safe-triangle pointer path stops them closing on diagonal moves. Context menus open at the pointer, or Shift+F10 / the Menu key.
`role="menu"` / `menuitem` / `menuitemcheckbox` / `menuitemradio`, `aria-keyshortcuts`. ↑↓ navigate with wrap-around, typeahead jumps, and Enter activates.
```ts
type MenuItem = { type?: 'item'|'checkbox'|'radio'|'separator'|'label'|'submenu'; id: string; label?: string;
  icon?: LucideIcon; shortcut?: string; checked?: boolean; destructive?: boolean; disabled?: boolean; items?: MenuItem[]; onSelect?(): void };
interface MenuProps { items: MenuItem[]; trigger?: React.ReactElement; contextTarget?: React.RefObject<HTMLElement>; }
```

### 9.9 Tooltip
Glass `thin`, radius sm, padding 4×8, `type-caption` in `fg-primary`. A shortcut hint follows with an 8px gap, in `fg-tertiary` in kbd style. Delay 600ms on the first tooltip. While moving between tooltips (warm state, within 300ms) it shows instantly. Hides on pointerdown. Max width 240. `z-tooltip`. It never holds interactive content.
`role="tooltip"`; the trigger gets `aria-describedby`. It also shows on keyboard focus after the same delay.
```ts
interface TooltipProps { content: string; shortcut?: string; side?: Side; delay?: number; children: React.ReactElement; }
```

### 9.10 Panel / Section
Solid `bg-panel`. Sections are separated by a 1px `separator`. The header is 32px tall with padding x 12: [disclosure `chevron-right` rotating 90° over `duration-base`] title in `type-section` `fg-primary` … [actions: + / ⋯ icon buttons sm]. The body uses padding 4 12 12, and its rows are 28px tall with an 8px gap. **Property row:** label column `--k-control-label-col` (72px), `type-label`, `fg-secondary`, truncating with a tooltip, followed by controls in a 1fr grid (2 columns for pairs like X/Y, with an 8px gap). An empty section (e.g. "Effects" with nothing set) shows only the header plus a "+" button. Collapse state is saved per section.
The header is a `button` with `aria-expanded` and `aria-controls`; the body is `role="region"`.
```ts
interface SectionProps { title: string; collapsible?: boolean; defaultOpen?: boolean; actions?: React.ReactNode; children: React.ReactNode; }
interface PropertyRowProps { label: string; htmlFor?: string; columns?: 1|2|3; children: React.ReactNode; }
```

### 9.11 Tabs
Sidebar tabs (Pages/Layers/Assets) and inspector tabs (Design/Prototype/Code). Text tabs, height 32, `type-label`: `fg-secondary` → selected `fg-primary` with a 2px underline in `fg-primary`. The accent is not used, so the accent stays meaningful. For compact areas, use a Segmented control instead.
`role="tablist"`/`tab`/`tabpanel`, `aria-selected`, arrow keys with automatic activation.
```ts
interface TabsProps { value: string; onChange(v: string): void; tabs: { value: string; label: string; icon?: LucideIcon }[]; }
```

### 9.12 Alignment grid (9-point picker)
A 3×3 grid, 56×56, inside a `bg-control` box with radius md. Each cell is an 18px hit area holding a 4px dot (`fg-tertiary`). On hover the dot grows to 6px in `fg-secondary`. The selected cell shows a 14px glyph bar in `accent`, oriented to the stack direction. Mixed: no selection. For stacks, selecting a cell sets both justify and align.
`role="radiogroup"`, `aria-label="Alignment"`; each cell is a `radio` named e.g. "Top left". The arrow keys move in 2D.
```ts
type Align9 = `${'top'|'center'|'bottom'}-${'left'|'center'|'right'}`;
interface AlignGridProps { value: Align9 | 'mixed'; onChange(v: Align9): void; direction?: 'row'|'column'; }
```

### 9.13 Padding / Margin box (box model editor)
The margin ring sits outside, padding inside, and the center shows the content size (W×H, mono caption). Each side has a compact NumberField (sm 22, width 40, centered, scrubbable) on `bg-control` with radius md. The outer box uses a dashed 1px `border` for margin and a solid 1px for padding. Hovering a side highlights the matching edge on the canvas (`canvas-selection` at 20% fill).
The **Link toggle** (`link-2`/`unlink-2` icon button in the center top) has three modes: all-linked (one field), axis-linked (vertical/horizontal), or independent (four fields). Alt-drag on any side applies the value to all sides temporarily. Mixed per side is shown as "–". There is also a compact row variant: `[link] [T][R][B][L]`.
A11y: a `group` with an `aria-label`; each side is a spinbutton labelled e.g. "Padding top". Tab order is T, R, B, L.
```ts
interface Sides { top: number|'mixed'; right: number|'mixed'; bottom: number|'mixed'; left: number|'mixed' }
interface BoxModelProps { padding: Sides; margin?: Sides; onChange(kind: 'padding'|'margin', s: Partial<Sides>, meta:{commit:boolean}): void;
  link?: 'all'|'axis'|'none'; onLinkChange?(l: 'all'|'axis'|'none'): void; contentSize?: { w: number; h: number }; }
```

## 10. Naming
`--k-{category}-{name}[-{variant}]` · categories: `gray|blue|green|amber|red` (primitives; components never use them), `color-*`, `type-*`, `font-*`, `space-*`, `radius-*`, `shadow-*`, `material-*`, `duration-*`, `ease-*`, `spring-*`, `z-*`, `control-*`, `layout-*`, `breakpoint-*`. JSON path `color.light.bg-panel` ↔ CSS `--k-color-bg-panel` (the theme is chosen by selector).
