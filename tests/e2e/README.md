# End-to-end tests (Playwright)

Live browser tests that drive a real build of the app.

## Run

```powershell
npm run test:e2e          # headless, boots `vite preview` automatically
npm run test:e2e:headed   # watch a real Chrome window
npm run test:e2e:ui       # Playwright UI mode (time-travel + picker)
npm run test:e2e:debug    # step through with Playwright Inspector
```

First run only:

```powershell
npx playwright install chromium
```

## How it works

`playwright.config.js` runs `npm run build && npm run preview` on port `4173`
and points the tests at `http://localhost:4173`. Set `PLAYWRIGHT_BASE_URL` to
point at any already-running instance (e.g. the Vite dev server on `:5173`, or
a deployed preview).

## Layout

- `smoke.spec.js` — app shell, titles, header widgets visible
- `gamification.spec.js` — draft mode overlay, roll-dice budget, coherence meter
  reacts to selections, no console errors

Tests clear `localStorage` + `sessionStorage` before each run so XP and reroll
budget are deterministic.
