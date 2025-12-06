# tournament-formatter (full)

This repo provides a client-side parser for Smogon tournament threads that extracts matches, team names, and replay links (from replies), resolves replays to matches, and outputs Smogon-compatible BBCode for replays and a KEY section.

## Files
- index.html — UI
- style.css — CSS
- src/main.js — orchestrator (module)
- src/parser/*.js — parsing modules
- src/utils/teamTagGenerator.js — team tag generation

## Deploy (GitHub Pages)
1. Create a new repo (e.g., `tournament-formatter`).
2. Copy files maintaining the structure (keep `src/` folder).
3. Commit and push.
4. Enable GitHub Pages: Settings → Pages → deploy from `main` branch, root folder.
5. Open `<username>.github.io/<repo>`.

## Notes
- Fetch uses a CORS proxy fallback (corsproxy.io) if direct fetch fails.
- The resolver uses heuristics: it may not map every replay perfectly. Ambiguous matches are marked and placed in a fallback slot.
- You can improve matching by adding custom overrides in `src/main.js` (e.g., a lookup of exact match keys -> replay links).
