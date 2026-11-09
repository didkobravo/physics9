# physics9 — working rules

Interactive physics explainers for a 9th-grade student at a Bulgarian school.
The site is in Bulgarian. One page per lesson. Live site: GitHub Pages at `/physics9/`.

## How we work
- Propose → the user reviews → build. Ask before large or structural changes.
- Verification = the user sees it running in the browser (`npm run dev`).
  Typecheck and build are necessary, not sufficient. Report what you actually
  observed, not what should work.
- One lesson at a time. Ship a tracer bullet (rough but real, end to end)
  before polishing anything.
- Nothing is pushed to `main` without the user's OK: a push to `main` is a
  public deploy.
- Bulgarian UI copy. Code, comments and commit messages in English.

## Content rules
- `reference/` holds private textbook scans. Never commit it (it is in
  `.gitignore`) and never copy its text verbatim. Re-explain in our own words.
- Notation follows the Bulgarian textbook: `A` for work, `P` for power,
  E<sub>k</sub> for kinetic energy with a LATIN k, E<sub>п</sub> for potential
  energy with a CYRILLIC п (in plain text: Ek / Eп). Never Cyrillic к for
  kinetic, never Latin p for potential, never Eₖ / Eₚ.
- State every simplifying assumption on the page in plain Bulgarian (e.g. "no
  sliding", "air resistance is ignored"). If a simulation ignores an effect a
  sharp student could notice (friction, sliding before tipping, air drag),
  say so on the page.
- Check the physics, not just the code: if a real object would do something
  else first (e.g. a box on a ramp slides when tan θ > μ before it tips),
  either model it or state the assumption.

## Mobile first
- The main device is a phone. Everything must work at 375px wide with no
  horizontal scroll.
- Use pointer events (`pointerdown` / `pointermove` / `pointerup`), never
  mouse-only handlers. Native `<input type="range">` is fine.
- Large slider thumbs and touch targets (at least `--size-7`, i.e. 2rem).

## Code and style
- Vite + TypeScript, vanilla DOM, no framework. SVG for simulations; no
  physics engine unless a lesson truly needs one.
- Open Props for all design tokens (sizes, colors, easing, radii). Project
  tokens live in `src/styles/tokens.css` and are built from Open Props.
  No Tailwind, no component library.
- No raw hex colors or px spacing in CSS. SVG viewBox / user-space
  coordinates are exempt.
- Each simulation is a self-contained module exposing
  `mount(el: HTMLElement): () => void`. The returned cleanup removes
  listeners and stops its animation loop. Pages follow the same shape.
- Routing is hash-based (`#/ravnovesie`), registered in `src/main.ts`.

## Commands
- `npm run dev` — local dev server (http://localhost:5173/physics9/)
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — production build into `dist/`
- Deploy: `.github/workflows/deploy.yml` builds and publishes to Pages on
  every push to `main`.
