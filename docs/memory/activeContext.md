# Active context

Focus: Phase 2 agent control is on its own branch, stacked on the Phase 1 editor branch. External MCP clients and the in-editor agent share the `keijam_*` design commands. Those commands mutate the open editor, return a diff (and a screenshot when the Keijam canvas is open), and undo through the toolbar history.

Next: install the official logo, replace pixel-art icons with monochrome Lucide (16px, stroke 1.5, `currentColor`), and build the Pages / Layers / Assets plus Framer-style inspector (grid, effects, gap and padding handles, inline text). One agent command is still several undo steps when it writes a node and then its class.
