# Third-party notices

Meridian Wake includes a transformed inventory and selected narrative/gameplay data from **Endless Sky**, by Michael Zahniser and the Endless Sky contributors.

- Repository: https://github.com/endless-sky/endless-sky
- Exact revision: `3248c43994eb3d545265366c8eba909a6646f4d2`
- Source data: all 204 `data/**/*.txt` files at that revision, parsed by `scripts/source-import.mjs` into `src/source-data.js` and `public/source-catalog.json`.
- License: **GNU General Public License, version 3 or later**. The full text is in [LICENSE](LICENSE). The supplied derivative data, importer, and game source are distributed under GPL-3.0-or-later.
- Upstream authorship and individual asset exceptions are retained without changes in [licenses/ENDLESS_SKY_COPYRIGHT](licenses/ENDLESS_SKY_COPYRIGHT) and [licenses/ENDLESS_SKY_CREDITS.txt](licenses/ENDLESS_SKY_CREDITS.txt).
- Changes: parser-produced JavaScript/JSON inventory; browser gameplay scaling, rendering, mission and progression adaptations; original user interface and toy-style geometry. Source mission identifiers and provenance survive the transformation. This is an independent adaptation, not an official Endless Sky release.

All files in `public/audio/` are unmodified placeholder audio taken from that exact official upstream revision. The authoritative asset list, URL, author attribution, license evidence, SHA-256, and replacement path are in [public/audio/manifest.json](public/audio/manifest.json). These selected assets are covered by the upstream `sounds/*` public-domain declaration (copyright lines 1313–1316); no selected file has a later overriding exception. The source background audio is ambient soundscape, not a composed musical score.

The two specifically requested audio portals were researched. No Endless Sky audio listing was found in the Sounds Resource's indexed PC “E” catalog or Zophar's Windows index. Direct Sounds Resource fetches returned HTTP 403. This fallback does **not** meet the original portal-source requirement; see [docs/source-audit.md](docs/source-audit.md). No unrelated game's music or fabricated portal attribution is included.

The pinned npm dependencies keep their own licenses and notices. Three.js is MIT; Vite is MIT; Rapier JavaScript bindings are Apache-2.0. Their code is not relicensed by this notice.

The regional field guide, public history, organization profiles and civilian story concepts also draw on the official [Endless Sky wiki](https://github.com/endless-sky/endless-sky/wiki), maintained by the Endless Sky contributors in [endless-sky/endless-sky-wiki](https://github.com/endless-sky/endless-sky-wiki). The inspected revision is `f243678789e0c7b179793697ae39bb7d00cf89d2` (27 September 2026), whose `license.txt` supplies the GNU GPL version 3. The full GPL text is already included in [LICENSE](LICENSE). Guide text, concourse dialogue and four civilian storylines have been rewritten for this adaptation; they are not presented as original upstream mission scripts. Page-level references and implementation details are in [the wiki expansion record](docs/wiki-expansion.md).
