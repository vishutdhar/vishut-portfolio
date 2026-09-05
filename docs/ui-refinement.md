# Portfolio UI refinement

## Specification

Request: “fix the UI,” with a decision between keeping the current UI and a complete overhaul.

Refine the existing identity: charcoal surfaces, copper accents, DM Serif Display, DM Sans, and the existing portrait lighting. The primary audience remains visitors assessing Vishut's engineering experience. Make the opening screen and navigation easier to use, and give different kinds of information distinct visual treatments. Preserve the professional claims, dates, recommendations, project links, contact information, section anchors, and dark/light/system theme behavior.

## Design plan

- Palette: page charcoal `#0F0F0E`, alternate surface `#161615`, raised surface `#1F1F1D`, primary text `#EDEDEB`, body text `#B5B5AE`, copper `#D4785E`. Retain the existing light-theme palette and separate accessible accent roles.
- Typography: DM Serif Display for the name, major section headings, statistics, and quotations. DM Sans for navigation, job titles, project titles, education, and body copy. Use sentence case for small labels.
- Alignment: one shared content width and left edge across navigation, hero, and sections. Keep long reading lines bounded. Left-align mobile text; compact metrics into one row.
- Layout: a prominent name and smaller portrait form the opening composition; About has a short introduction beside a quiet skill list; experience uses an open timeline; project panels carry the main raised surfaces; education uses two compact entries; testimonials use open quotations; Contact closes the page.
- Navigation: About, Experience, Projects, Contact; the name mark links home. Keep personal projects adjacent to professional projects, reachable through an explicit local link. Preserve all old fragment destinations.
- Navigation highlighting: select the section at the reading position, keep Projects selected through personal projects, and select Contact at the bottom even when that final section cannot reach the reading position.
- Motion: keep the existing portrait lighting and reduced-motion behavior. Open text sections and education must not lift like clickable cards.

```text
Desktop
VD                         About  Experience  Projects  Contact  Theme
Name / role                           Portrait
Three compact metrics
Contact / Experience
--------------------------------------------------------------------
About / introduction                  Skills
Experience: title + date, followed by a bounded open reading column
Projects: two substantial panels; personal projects immediately below
Education: two compact entries
Testimonials: two columns of open quotations
Contact

Phone
VD                                      Theme / Menu
Small portrait
Name / role
Three metrics in one row
Contact / Experience
Sections stack with consistent margins and left-aligned reading text
```

## Design review before implementation

The existing palette and font pairing are deliberate continuity choices. Avoid adding a new decorative style or generic labels. Concentrate visual emphasis in the name, portrait, and project results. Remove the duplicate portrait, repeated copper heading/skill bars, and card backgrounds around long experience entries. Keep section variety grounded in the information being presented.

## Acceptance criteria

1. Desktop layouts at 1280 and 1440 pixels share consistent content alignment and have no clipped or overlapping text.
2. At 390 × 844, both hero actions fit in the opening viewport after fonts settle. At 320 pixels wide, every metric and control remains readable with no horizontal scrolling.
3. All existing sections and their complete content remain available. The only removed image is the repeated About portrait.
4. Navigation, mobile menu, logo/home, project links, contact links, theme selection, keyboard focus, and browser Back continue to work.
5. Direct section links reveal their headings below the fixed navigation.
6. Light mode, reduced motion, and print remain legible. Content is still present with JavaScript disabled.
7. Browser verification includes screenshots, runtime errors, responsive overflow, navigation, and print inspection. Review the PR before merging.

## Outcome and behavioral handoff

**Specification:** “fix the UI,” and decide whether to keep the current UI or completely overhaul it.

**What was built:** A refinement of the existing charcoal and copper identity. The opening screen has a larger name, a smaller portrait, and three compact metrics. Both main actions fit within the first phone screen. Navigation has four primary choices and a home link. About uses one introduction and a separate skill list. Experience reads as an open timeline; projects retain substantial panels with larger results; education and recommendations use quieter layouts. Personal projects sit beside the professional work, with Contact closing the page. The duplicate portrait is removed.

**Files changed:**

- `index.html` — navigation, hero labels, About structure, project grouping, and section order.
- `styles.css` — typography, spacing, responsive layouts, section treatments, button contrast, and print adjustments.
- `script.js` — section highlighting, including short final sections; pointer tilt restricted to project panels.
- `docs/ui-refinement.md` — specification, design plan, acceptance criteria, and this handoff.

**Validation:**

- Chrome browser checks passed at widths 320, 390, 640, 720, 768, 960, 961, 1024, 1280, and 1440 pixels. No page or reading-content overflow was found.
- At 390 × 844, both opening actions end about 547 pixels from the top, within the first screen.
- Compared the professional paragraphs, list items, job/project headings, numeric claims, and external project links against the previous version: preserved. All eight section anchors remain available; one portrait remains.
- Keyboard skip link, mobile menu focus, Escape, section links, home link, browser Back, breakpoint reset, contact link targets, and final Contact highlighting passed.
- Dark/light/system theme behavior and saved preferences passed. The Contact button retains dark text on its copper background in dark mode, including hover and selected states.
- Reviewed desktop, phone, light-theme, section, and print-style screenshots. Print uses a white background, visible content, and hidden navigation. JavaScript-disabled rendering retains the content. No browser console or runtime errors were reported.
- JavaScript syntax and whitespace checks passed. Browser checks were run from a temporary verification script; the static site needs no build step or added dependency.
- Scope of verification: desktop Chrome with emulated viewport sizes and print media. Physical iPhone/Safari behavior and paper pagination need the device checks below.

**How to verify:**

1. Open the preview on your desktop and phone. On the phone, confirm the portrait, name, metrics, and both actions fit together without horizontal scrolling.
2. Use About, Experience, Projects, and Contact. Use the Personal projects link beside the project heading. Confirm the right section appears, then use browser Back and the VD home link.
3. On a phone, open the menu, select a section, and rotate the device. The menu should close normally and stay closed after returning to portrait orientation.
4. Cycle dark, light, and system themes; reload to check the saved choice. Read the experience, education, and recommendation sections in both themes.
5. Use Tab and Enter to navigate. Escape should close the phone menu. Open print preview and confirm that the content is readable on white paper.

**Review recommendation: HIGH.** Four files changed and the layout/navigation behavior spans the page. This change meets review criteria — recommend sending to your independent reviewer before proceeding. Confidence in retaining and refining the existing visual identity: 90%.
