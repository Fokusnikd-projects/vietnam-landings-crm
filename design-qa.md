# Design QA

visual result: passed; current read/write flow: passed with mocked Google API; live Google authorization and permanent Vercel publication pending

## Evidence

- Source visual truth: `C:/Users/Alexandr/.codex/generated_images/01a1772b-0f4a-76a1-8bd8-d653f8b234be/exec-94766fa2-eb3f-4d52-9deb-1aeda2278b73.png` (1487 × 1058 px).
- Implementation screenshot: `C:/Users/Alexandr/Documents/Codex/2026-10-26/product-design-plugin-product-design-openai/work/qa/desktop-1440.png` (1440 × 1024 px, CSS viewport 1440 × 1024, device scale 1).
- Full-view comparison: `C:/Users/Alexandr/Documents/Codex/2026-10-26/product-design-plugin-product-design-openai/work/qa/compare-final.png`. The source was proportionally resized to 1440 × 1024; the implementation was captured at that size.
- Focused comparison of the inspector: `C:/Users/Alexandr/Documents/Codex/2026-10-26/product-design-plugin-product-design-openai/work/qa/compare-inspector.png`. The inspector was also inspected directly at original screenshot resolution.
- Responsive capture: `C:/Users/Alexandr/Documents/Codex/2026-10-26/product-design-plugin-product-design-openai/work/qa/mobile-390.png` (390 × 844 px).
- Original state: initial loaded snapshot, first high-Fit ready lead selected, overview visible, empty local note. The mock contains illustrative names; that screenshot predates the direct Google integration. The current build opens with an empty board until Google is connected, keeping private leads out of public assets.

## Findings

No actionable P0, P1, or P2 visual issues remain. The sidebar, search row, three priority columns, inspector, selected state, color palette, and local-note action follow the selected direction. The board begins at y=76 and the inspector at y=485 in the final 1440 × 1024 capture, matching the mock's principal vertical structure. There is no document-level horizontal overflow at 1440 or 390 px; the narrow board scrolls horizontally within its own region.

Required fidelity surfaces checked:

- Typography: hierarchy and weights are close; long Vietnamese names truncate within rows. Real research and offer text uses scrollable regions.
- Spacing and layout: major region positions match. The save button is fully visible at 1440 × 1024.
- Colors: dark slate navigation, pale lavender base, green/blue/red priority headers, and coral primary action match the selected direction.
- Image and icon quality: the lotus is a generated raster asset; controls use Windows icon-font glyphs. Generic contact icons are a minor visual difference from branded icons in the mock.
- Copy and content: production UI uses actual source column names and values. Mock sample counts and offers are replaced with real data. The inspector uses compact tabs for full research and offers, an intentional functional change.

## Comparison history

1. Initial capture: an extra title row pushed the board to y=139 and inspector to y=527. Removed the row and adjusted board height; subsequent capture placed the board at y=76 and inspector at y=485.
2. A vertical contact list pushed the save button below the viewport. Moved detail tabs into the inspector header; subsequent capture shows the full save button.
3. Added working phone, Maps, and Facebook quick actions to board rows, matching the mock's contact column. Final capture shows them without clipped rows.
4. A visually hidden file input intercepted the backup button. Disabled pointer events on that input; browser flow then passed backup, restore, and CSV import.

## Functional verification

- Original browser flow passed: 480 snapshot leads, search, note persistence, JSON backup and restore, CSV import. That snapshot is no longer bundled or shown by default.
- Current mocked Google flow passed on 2026-10-28: full `spreadsheets` scope, authenticated read, edit of two fields through `values:batchUpdate`, immediate reread, status group move, external change on tab focus, and conflict rejection without a second write. No browser page errors.
- Current empty and edit states were captured at 1440 × 1024 in `work/qa/live-empty.png` and `work/qa/live-edit.png` and visually inspected. Form, action buttons, board, and inspector remained usable.
- Production Vercel build passed; six data and write-planning tests passed. A scan of `dist/client` found no names from the former lead snapshot.
- Live Google authorization and an actual write remain unverified because the OAuth Client ID is not configured. Vercel created a temporary deployment on 2026-10-28, but automated browser checks received a Vercel firewall 403 (`x-vercel-mitigated: deny`). The user must confirm whether the link opens in a normal browser and claim the temporary project before it expires; permanent hosting is not yet verified.
