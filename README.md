# dep-scout

Search GitHub repositories and get a quick, honest read on whether a project is
safe to depend on — is it maintained, licensed, popular, archived? Every result
carries a health verdict (🟢 / 🟡 / 🔴) so you can scan a whole list at a glance
instead of opening twenty tabs.

**Live demo:** https://dep-scout-liard.vercel.app

## Why

Before adding a dependency I tend to eyeball the same few things on GitHub: when
it was last pushed, whether it has a license, how many stars, whether it's
archived. dep-scout pulls those signals from the GitHub REST API and turns them
into one verdict. Open a repo and it also suggests **healthier matches from the
same search**.

## Run it

Requires **Node 22** (see `.nvmrc`).

```sh
npm install
npm run dev         # http://localhost:5173
npm run test:unit   # unit + component tests
npm run build       # type-check + production build
```

No token is needed — the app uses GitHub's public API. Unauthenticated **search
is capped at 10 requests/min**; you can paste a read-only personal access token
via **“Add token”** in the header to raise it to 30/min. The token is stored only
in your browser (localStorage) and sent only to `api.github.com`.

## A few decisions

- **Honest verdict.** The score claims only what the data supports — “no red
  flags,” never “secure” (the API gives no security data). A missing license or
  an archived repo is a hard blocker regardless of stars.
- **No wasted requests.** A search response already carries the fields the health
  check needs, so the per-result verdicts and the “healthier matches” suggestions
  are computed locally — zero extra API calls.
- **Validated at the edges.** Responses are parsed with zod, so a malformed
  payload fails loudly with a clear message instead of breaking a template.
- **Every state is handled.** Rate limits (with reset time), 404s, empty and
  partial results, timeouts and offline each have their own UI — plus an error
  boundary as a last resort.

## Tech

Vue 3 (`<script setup>`) · TypeScript (strict) · Vuetify + Sass · Pinia · zod ·
Vue Router · Vitest · Vite.

## Known limitations / next steps

- “Healthier matches” are drawn from the page of results you're viewing (so the
  heading says *“from these results”*), and the shared state isn't persisted —
  it's empty on a hard reload or a deep link into a repo.
- Paging triggers a full-screen spinner rather than a subtle in-list loading
  state, and there's no debounce, so clicking through pages quickly can hit the
  10 req/min search limit.
- The active-page styling reaches into a Vuetify internal class; a major Vuetify
  upgrade could require revisiting it.
- Tests cover the API client, token storage, error mapping, the scoring/ranking
  logic, the search store and the search screen; there's no E2E suite yet.
- The bundle ships the full Material Design Icons font — switching to per-icon
  SVG imports is the obvious next size win.

## AI assistance

I used AI (Claude) as a pair-programming partner throughout — talking through the
design, writing and refactoring code, and running an adversarial self-review that
surfaced several edge cases and the prod-grade items above. I drove the product
and UX decisions and reviewed the code to understand every part of it.
