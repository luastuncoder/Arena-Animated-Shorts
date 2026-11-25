# Animated shorts workspace

Use the project-local skill at `.claude/skills/cartoon-3d-short/SKILL.md` as the production and visual baseline. It is an upstream snapshot, not an instruction to reproduce its example story. User requests override its inherited example-specific preferences. See `README.md` for working commands and environment limitations.

- Start with a brief, researched and sourced facts, and a script for approval; only then create voice, word timings, shots, animation and sound.
- Unless the user chooses otherwise, aim for a roughly 55–70 second vertical story, 30 fps, original 2D characters in a 3D world, no captions, and a 1440 × 2560 final.
- Make the story, script, characters, shots and narration original. Upstream reference-channel frames, sheets and reports are private study material: do not commit, upload, publish or send them. Obtain them separately in temporary/local storage only when needed.
- `BridgeShort` and the Kenney assets are a technical example. Copy/adapt the upstream templates into a new short-specific directory; do not present the example as our first short. Its sound timeline, cues and mix are specific to the bridge and must be redesigned for each new picture.
- Use the local `scripts/` wrappers rather than the upstream Windows-specific paths. Preserve the upstream MIT license and the CC0 asset notices.
- Upstream mentions Claude-specific subagents and an Opus verifier; if those exact tools are unavailable, use the review and QA tools actually available and never claim that a specific verifier was used.
- Generated renders, voice files, private references, dependencies and temporary bundles belong in ignored locations. Do not place API keys or private data in Git.
