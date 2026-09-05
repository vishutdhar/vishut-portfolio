# Interactive engineering hero — preview

## Specification

User request: “do it so i can see it,” following the proposal for a cinematic 3D EV battery assembly. Build a working preview of that opening. Do not merge or update production until the user explicitly approves the result.

The opening presents a stylized, original battery-module illustration beside Vishut's name and portrait. It is an illustration, not a reconstruction of proprietary hardware. Components assemble during a short entrance, respond gently to a mouse, and separate as the visitor scrolls. An explicit button allows touch and keyboard users to explore the separated view. Keep all existing professional content, contact links, navigation, section anchors, and themes.

## Design plan

- Palette: charcoal `#0F0F0E`, graphite `#292D30`, brushed aluminum `#B6BEC3`, copper `#D4785E`, warm text `#EDEDEB`. Light mode keeps the existing paper palette.
- Type: preserve DM Serif Display for the name and DM Sans for role, body, and controls. The name and assembly carry the visual emphasis.
- Layout: a compact portrait above the name on the left; a large unboxed 3D assembly on the right. A quiet caption and one exploration control sit below the model. On phones, the name/actions come first, followed by a compact assembly stage.
- Model: beveled graphite housing, a bed of metal battery cells, copper busbars, a cooling plate, corner fasteners, fine enclosure ribs, and a thin top frame. Studio lighting creates the depth; no particle field or unrelated decoration.
- Motion: separated parts converge in about two seconds, with staggered settling. Pointer movement changes viewing angle within a small range. Scrolling separates the cooling plate, cell bed, busbars, and top frame. Explicit exploration remains available without scrolling.

```text
Desktop
VD                                      About Experience Projects Contact Theme
[small portrait]                          [floating exploded assembly]
Vishut Dhar                               [metal / graphite / copper]
Senior Supplier Quality Engineer
Three existing metrics                   EV battery module    [Explore assembly]
Contact / Experience

Phone
VD                                                   Theme Menu
[small portrait] Vishut Dhar
Role / metrics / actions
[compact assembly]
EV battery module                 [Explore assembly]
```

## Plan critique

The battery module connects to the existing EV battery plant project and quality-engineering role. Retaining the site's palette is an intentional continuity choice. Concentrate motion in this one illustration, keep reading text stable, and do not turn the rest of the page into another animated scene. No fabricated performance claims or industrial dimensions are added.

## Implementation plan

1. Create an isolated preview branch/worktree and retain the current production commit.
2. Add a self-hosted, pinned Three.js module and license. Keep the site static and its existing security policy intact.
3. Build the illustration from geometry and local lighting; integrate a hero stage with an accessible exploration control.
4. Render only while animation or input needs it; stop when hidden or off-screen. Respect reduced motion, use a smaller rendering budget on phones, and provide a static illustration if WebGL or module loading is unavailable.
5. Verify appearance, interactions, theme changes, responsive layout, no-JavaScript/WebGL fallback, hidden/idle rendering, and console errors.
6. Open a PR and preview deployment, inspect automated feedback, and show the result to the user. Leave the PR unmerged.

## Acceptance criteria

- Identity and actions are visible without waiting for the scene; the assembly is decorative and cannot block navigation.
- The introduction settles, pointer motion is bounded, scrolling separates the model, and the exploration button works with mouse, touch, and keyboard.
- Render activity stops at rest and when the page/hero is hidden; returning restores the scene without a second entrance.
- Reduced motion shows a stable model with instantaneous control changes. No-JavaScript and WebGL failure show a coherent static illustration.
- Widths 320–1440 do not overflow. Light mode and print stay legible.
- All original professional content and links are preserved.
- Deliver a preview URL and reviewable changes. Explicit user approval remains required before merge.

## Outcome and review handoff

### Specification

“Any 3D effects we should give on this, I want people's mind to be blown when they open this.” Then: “do it so i can see it.” This is a working preview for visual approval. The instruction “do not merge till i 100% approve” remains the release gate.

### What was built

A large, original EV battery illustration sits beside the existing name, portrait, and professional introduction. Metal cells, copper connections, a cooling plate, and a graphite frame assemble on arrival. Moving a mouse gently changes the angle. Scrolling or pressing “Explore assembly” separates the parts; “Assemble module” puts them back together. The portrait remains above the name, and the rest of the portfolio's professional content and links are retained.

Phones show a compact illustration below the introduction and support the same control by touch. Visitors who request less motion see immediate changes. If interactive graphics are unavailable, a static illustration takes their place. The illustration stops drawing when settled, offscreen, or hidden.

### Files changed

- `index.html` — opening layout, illustration, exploration button, and local asset references.
- `hero-assembly.css` — responsive layout, scene presentation, control, and print/reduced-motion styling.
- `hero-assembly.js` — original battery illustration, lighting, interactions, and rendering lifecycle.
- `assets/battery-assembly.svg` — static fallback illustration.
- `assets/vendor/three/three.module.min.js` — unchanged rendering module from Three.js 0.185.1.
- `assets/vendor/three/three.core.min.js` — unchanged companion module from the same release.
- `assets/vendor/three/LICENSE` — upstream MIT license.
- `assets/vendor/three/README.md` — dependency version and provenance.
- `docs/3d-hero-preview.md` — specification, implementation plan, and this handoff.

No files were deleted.

### How to verify

1. Open the preview at the top of the page. The name, role, photo, and contact buttons should appear immediately; the battery parts settle together within about two seconds.
2. Move the pointer across the opening. The battery should turn slightly while the text stays still.
3. Press “Explore assembly.” Inspect the separated layers, then press “Assemble module.” Repeat with Tab and Enter or Space.
4. Scroll slowly toward About. The layers separate as the opening leaves view. Return to the top; the entrance should not replay.
5. Open the preview on a phone. The introduction appears first, with the illustration and touch control beneath it. Reading and scrolling should remain comfortable.
6. Try the theme button. Then enable your device's Reduce Motion preference and reload: the model stays still and its control changes the view immediately.
7. Use Get In Touch, View Experience, and navigation links to confirm the portfolio remains usable.

### Validation completed

- Browser inspection and screenshots of desktop, phone, assembled, separated, light, and fallback views.
- Existing professional text and external links compared with production baseline `97e59ea` and preserved.
- No horizontal overflow at widths 320, 390, 640, 760, 768, 960, 1024, 1280, and 1440.
- Enter/Space and emulated phone touch switch the assembly view correctly; pointer movement and scrolling redraw the model.
- Instrumented graphics draw calls stop after the entrance and interactions settle, while the illustration is offscreen, and during a background-page freeze.
- Reduced motion suppresses the entrance and pointer motion; the exploration control changes instantly.
- Mobile graphics resolution is capped at 1x; desktop at 1.5x. The minified rendering modules total approximately 751 KB before network compression.
- No JavaScript, blocked module, unavailable WebGL, and lost graphics context leave the static illustration and functional portfolio in place.
- Print hides the decorative model. No page or console errors occurred in the normal browser verification run.
- JavaScript syntax and whitespace checks pass. This static site has no application build step.

The automated browser run uses desktop Chrome and emulated phone input. Physical-phone and Safari visual approval remain part of the user's review; no claims of testing those devices are made. Local browser evidence is stored outside the repository under `/tmp/portfolio-3d-checks`.

### Review recommendation

**MEDIUM — required independent review. Confidence: 95%.** This adds an interactive feature and changes nine files, including a rendering dependency. Review animation lifecycle, fallback behavior, and mobile appearance before release.

This change meets review criteria — recommend sending to your independent reviewer before proceeding.

**Merge status: not approved.** Keep the preview PR open. Do not merge or promote it to production until the user explicitly approves what they have seen.
