# Integration Playbook

Practical checklist for integrating `sitelen-layer-plugin` into real sites (especially Next.js + locale routes).

## 1) Scope First

Always scope transformations to the main toki pona content block.

Preferred:

- add `data-sitelen-layer-scope` on the TP content wrapper
- set `container` to a specific selector

Avoid setting `container: document.body` unless absolutely needed.

## 2) Header-Mounted Toggle (instead of floating widget)

If your site already has a language switcher in the header:

1. Add a mount node near `EN/TP`, e.g. `<div id="sitelen-layer-toggle-mount" />`
2. Pass `toggleMount: '#sitelen-layer-toggle-mount'`
3. Add minimal CSS so toggle looks native in header

This prevents floating bottom-right UI from conflicting with site layout.

## 3) Profiles for Locale Routing

Use profile matching so TP behavior is isolated to TP routes.

- TP profile: `/tp` with all 3 layers enabled
- non-TP profile: `/en` (or fallback) with `showToggle: false`

Use `createTokiPonaLocaleProfiles(...)` for fast setup.

## 4) Next.js Client-Safe Init

- create a `'use client'` component
- initialize plugin in `useEffect`
- call `plugin.destroy()` in cleanup
- do not instantiate plugin in server components

## 5) Vercel / CI-Safe Dependency Strategy

Do not rely on machine-local dependency paths like:

- `file:/Users/...`
- `file:/Downloads/...`

Use one of:

1. Published npm package (recommended)
2. Repo-local vendored tarball (`file:vendor/...tgz`)
3. Git dependency only when your package source includes consumer-ready build artifacts

## 6) Smoke Checklist

On TP route:

- eligibility passes
- toggle visible
- `latin <-> sitelen-emoji`
- `latin <-> sitelen-pona`
- layout intact

On non-TP route:

- toggle hidden
- no unintended text transforms

## 7) Debug Signals

Enable during integration:

- `debug: true`
- `debugOverlay: true`

Check:

- `matchedProfileId`
- `matchedProfileReason`
- `sitelenPonaFontReady`
- `observerStats`
