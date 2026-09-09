# Sukahati Yoga — client

React + Vite + TypeScript frontend for the Sukahati Yoga booking app. Implements the design in
`project/Sukahati Yoga App.dc.html` (customer booking flow + studio admin panel) against the real
API in `../server`.

## Run

```
npm install
npm run dev
```

Starts on http://localhost:5173 and proxies `/api/*` to the server on port 4000 (see `vite.config.ts`).
Start `../server` first (`npm run dev` there) so the API is available.

## Structure

- `src/App.tsx` — top-level navigation/state (customer tabs, admin sections, booking flow, sheets)
- `src/screens/` — one file per screen; `src/screens/admin/` for the studio-admin panel
- `src/components/` — shared UI (device frame, sheets, toggle, tab bar, QR graphic)
- `src/lib/api.ts` — typed client for every server endpoint
- `src/styles/tokens.css` — the "Organic" design system (colors, type, `.btn`/`.tag`/`.field` classes),
  ported from `project/_ds/organic-.../styles.css`
