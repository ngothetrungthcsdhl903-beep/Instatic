# References

Ideas that informed Keijam. Licenses decide what may be copied. Design on the Flank is custom and was not copied. Revyme is AGPL and was not copied. MIT and Apache-2.0 sources may be adapted; this phase used them as ideas and did not vendor their code.

## Design on the Flank

- Repo: https://github.com/Chien1618/design-on-the-flank (read 2026-10-23, package 0.2.0).
- License: custom. Download and use the skill to create your own Framer components, including commercially. Redistribution or resale of the skill collection needs the owner's permission. It is not MIT. Third-party Framer Labs and GreenSock documents inside it keep their MIT terms.
- Read: `README.md`, `LICENSE.md`, `CHANGELOG.md`, `skills/design-on-the-flank/ATTRIBUTION.md`, `references/framer-contract.md`, `SKILL.md`, every `docs/vi/*.md` (`bat-dau`, `codex`, `claude`, `claude-code`, `chatgpt`, `dua-vao-framer`, `go-loi`, `faq`, `prompt-mau`), `downloads/manifest.json`, `downloads/design-on-the-flank-knowledge.txt`, `downloads/chatgpt-instructions.txt`, and the 26 `downloads/modules/*.txt` catalogs (Framer components, property controls, patterns, WebGL shaders, plugins, GSAP core/timeline/react/plugins/performance/scrolltrigger/utils/frameworks, Three.js fundamentals/geometry/materials/lighting/shaders/textures/animation/interaction/loaders/postprocessing).
- Learned, and did not copy: a component is one pasteable TSX file with `defaultProps` and `addPropertyControls`. Controls cover string, number, boolean, color, enum, and richer Framer types (image, file, font, array, object) that this phase does not implement. Overrides are `withX` higher-order functions and are not property-controlled. Canvas and preview differ; heavy WebGL should not run during edit. Three and GSAP load from pinned URLs, not from the page's base bundle. Animate transform and opacity. Prompts ask for one complete file, named controls, a fallback when WebGL is missing, and reduced motion.

## Upstream of that skill

- https://github.com/fredm00n/framerlabs — MIT, Copyright 2024 fredm00n. Code components, property-control reference, WebGL canvas lifecycle, and the agent playbook (code files, `$control__` keys, verify after a write).
- https://github.com/greensock/gsap-skills — MIT, Copyright 2026 GreenSock. Tweens, timelines, eases (`power`, `back`, `elastic`), stagger, `useGSAP` cleanup, and the rule that plugins (ScrollTrigger, SplitText, and the rest) load only when used. GSAP itself is not bundled here. A page that opts into the effect dynamic-imports `gsap` from esm.sh.

## Framer

- https://www.framer.com/developers/ — code components, property controls, overrides. Docs, not a code license. `addPropertyControls(component, controls)` plus `defaultProps`. Overrides are higher-order components that must forward existing props. Keijam parses that shape and does not execute the file.

## Rive

- https://rive.app/docs — state machines (graph of timeline states, transitions, conditions), data binding from named inputs to properties. Ideas only.
- https://github.com/rive-app runtimes are MIT. The Rive WASM runtime is large. Keijam does not ship it. Motion exports as CSS `@keyframes` and, only when a spring, a click, or a condition needs it, a small Web Animations script.

## Earlier references

- OpenPencil (https://github.com/open-pencil/open-pencil) — MIT for the editor. Apache-2.0 for the cloud server. Idea used in Phase 2: a typed design command list an agent can call. Not vendored.
- Open Design (https://github.com/nexu-io/open-design) — Apache-2.0. Some bundled templates keep their own licenses. Idea: a design system file is the source of truth for generated UI. Keijam already uses `design-system/gen.py`.
- Loupe (https://github.com/winchxyz/loupe, source also published under Mysk) — MIT for source code only. Name, logo, and design assets are excluded. Idea used in Phase 2: after an edit, return a snapshot the agent can check.
- Revyme — AGPL-3.0. Ideas only. No code, no assets.
- Figma UI3 — density, type, grays. No Figma assets. Apple HIG — precision, reduced motion, reduced transparency. Both are recorded in `decisions.md`. The component spec is `design-system/DESIGN_SYSTEM.md`.
