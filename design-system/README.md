# Keijam tokens
- `import './tokens.css'` once at the app root. Set `<html data-theme="light|dark|system">` (with `system` it follows the OS).
- Use only semantic vars in components: `var(--k-color-bg-panel)`, `var(--k-type-body-size)`, `var(--k-material-regular-bg)`…
- Edit **gen.py** only, then run `python3 gen.py && python3 check.py` (it regenerates tokens.json and tokens.css and runs the WCAG check → `contrast-report.txt`).
- Spring tokens are numbers for JS (framer-motion: `{type:'spring', stiffness, damping, mass}`); read them from tokens.json.
- Load Inter (variable) + JetBrains Mono yourself (e.g. `@fontsource-variable/inter`).
- Spec: `DESIGN_SYSTEM.md`.
