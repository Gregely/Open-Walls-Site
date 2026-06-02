# Open Walls Cork

A small Vite + React + TypeScript site built from the Claude Design handoff for Open Walls Cork.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

The production build is written to `dist/`.

## Edit Site Content

Upcoming show details, artist lineup, contact links, about copy, and past show records live in:

```text
src/data/content.ts
```

The colorful stacked-square motif is reusable React code in:

```text
src/components/MotifStack.tsx
```

## Assets And Fonts

Production assets live in `public/`.

- `public/fonts/TypeFaceGrid.ttf` is the custom display font from the handoff.
- `public/images/open-walls-typeface.png` is the included uploaded typeface artwork/reference.
- `public/favicon.svg` is a simple generated placeholder favicon using the Open Walls square motif.

The custom font is used because it was included in the handoff bundle. If licensing changes, replace it in `public/fonts/` and update the `@font-face` rule in `src/styles.css`.

## Design Handoff

The original exported prototype is preserved under:

```text
design-handoff/
```

Those files are archived for reference only. The production app does not import the Claude Design tweak panel, React CDN scripts, Babel CDN scripts, or prototype JavaScript.
