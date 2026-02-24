# sitelen-layer-plugin

A **site-owner plugin** for pages that already contain toki pona content.

It adds display layers for the same text:

- `latin`
- `sitelen-pona` (font-based, recommended `nasin-sitelen-pu`)
- `sitelen-emoji` (mapping-based)

## Quick Start

```ts
import { createSitelenLayerPlugin } from 'sitelen-layer-plugin';
import 'sitelen-layer-plugin/styles.css';

const plugin = createSitelenLayerPlugin({
  container: '#tok-content',
  threshold: 0.7,
  requireDominantTokiPona: true,
  toggleMode: 'auto'
});

plugin.init();
```

## Copy-Paste Integrations

### 1) Static landing page

```ts
import { createSitelenLayerPlugin } from 'sitelen-layer-plugin';
import 'sitelen-layer-plugin/styles.css';

createSitelenLayerPlugin({
  container: '#landing-toki-pona',
  defaultLayer: 'latin',
  showToggle: true
}).init();
```

### 2) SPA-like page (route changes)

```ts
import { createSitelenLayerPlugin } from 'sitelen-layer-plugin';
import 'sitelen-layer-plugin/styles.css';

const plugin = createSitelenLayerPlugin({
  container: '#app-main',
  mutationObserver: {
    enabled: true,
    incremental: true,
    debounceMs: 140,
    observeAttributes: false
  },
  spaNavigation: {
    enabled: true,
    patchHistory: true,
    refreshDelayMs: 80
  }
});

plugin.init();
```

### 2b) Auto TP locale profiles (preset helper)

```ts
import {
  createSitelenLayerPluginFromProfiles,
  createTokiPonaLocaleProfiles
} from 'sitelen-layer-plugin';
import 'sitelen-layer-plugin/styles.css';

const profiles = createTokiPonaLocaleProfiles({
  container: '#tp-content-scope',
  toggleMount: '#sitelen-layer-toggle-mount',
  storageKey: 'toki-free-kit:sitelen-layer',
  tpPathPrefix: '/tp',
  nonTpPathPrefix: '/en',
  debug: true,
  debugOverlay: true,
  mutationObserver: {
    enabled: true,
    incremental: true,
    observeAttributes: false,
    debounceMs: 140
  },
  sitelenPona: {
    fontCssUrl: 'https://cdn.jsdelivr.net/gh/ETBCOR/nasin-sitelen-pu@latest/nasin-sitelen-pu.css',
    className: 'my-sitelen-pona-layer'
  }
});

createSitelenLayerPluginFromProfiles(profiles).init();
```

### 3) Explicit scope with `data-sitelen-layer-scope`

```html
<main id="content">
  <section data-sitelen-layer-scope>
    <!-- only this subtree is analyzed/transformed -->
  </section>
</main>
```

```ts
createSitelenLayerPlugin({ container: '#content' }).init();
```

## Profiles Example

```ts
import { createSitelenLayerPluginFromProfiles } from 'sitelen-layer-plugin';
import 'sitelen-layer-plugin/styles.css';

const plugin = createSitelenLayerPluginFromProfiles(
  [
    {
      id: 'tok-locale',
      priority: 20,
      match: { pathnamePrefix: '/tok/' },
      config: {
        container: '#tok-content',
        defaultLayer: 'sitelen-emoji',
        showToggle: true
      }
    },
    {
      id: 'en-locale',
      priority: 10,
      match: { pathnamePrefix: '/en/' },
      config: {
        container: '#en-content',
        showToggle: false
      }
    }
  ],
  {
    baseConfig: {
      threshold: 0.7,
      onProfileMatch: (id) => console.log('matched profile:', id)
    }
  }
);

plugin.init();
```

Matching priority: highest `priority` wins among matched profiles.

## Example: Real Project Integration

Project: **toki-free-kit (ABVX)**

- Live TP locale: <https://toki-free.abvx.xyz/tp>
- Repo: <https://github.com/markoblogo/toki-free-kit>

What this integration demonstrates:

- toki pona-dominant eligibility flow
- layer switching (`latin` / `sitelen-pona` / `sitelen-emoji`)
- profile-based activation for `/tp`
- debug diagnostics during integration and tuning

Important: `sitelen-layer-plugin` is a **display-layer plugin** for existing toki pona content, not a machine translation system.

## Tested Integrations

- [toki-free-kit](https://github.com/markoblogo/toki-free-kit) — `/tp` locale showcase with profile-based activation.

## Sitelen Pona Font Config Example

```ts
createSitelenLayerPlugin({
  container: '#tok-content',
  layers: ['latin', 'sitelen-pona', 'sitelen-emoji'],
  toggleMount: '#header-lang-area',
  toggleMode: 'auto',
  toggleSize: 'lg',
  toggleLabels: {
    latin: 'TP',
    'sitelen-pona': { text: 'SP', ariaLabel: 'Sitelen pona layer' },
    'sitelen-emoji': { text: '🙂', ariaLabel: 'Sitelen emoji layer' }
  },
  emojiExcludeSelectors: ['header', '.site-logo'],
  sitelenPona: {
    enabled: true,
    fontFamily: "'nasin-sitelen-pu', 'Noto Sans', sans-serif",
    fontCssUrl: 'https://example.com/fonts/nasin-sitelen-pu.css',
    className: 'my-sitelen-pona-layer',
    renderStrategy: 'font-only'
  }
}).init();
```

## Toggle Mount And Labels

- `toggleMount`: selector or `Element` mount target.
- `toggleMode`:
1. `'auto'` (default): inline when `toggleMount` exists, otherwise floating.
2. `'inline'`: tries inline mount, falls back to floating if target is missing.
3. `'floating'`: always bottom-right floating widget.
- `toggleSize`: `'sm' | 'md' | 'lg'` (default: `'md'`).
- `toggleLabels`: per-layer custom button content/aria/title/className.
- Default labels (when `toggleLabels` is not provided):
1. `latin`: `TP`
2. `sitelen-pona`: `SP`
3. `sitelen-emoji`: `🙂`

Example:

```ts
createSitelenLayerPlugin({
  container: '#tp-content',
  toggleMount: '#header-toggle', // place next to EN/TP switcher
  toggleMode: 'auto',
  toggleSize: 'lg',
  toggleLabels: {
    latin: 'TP',
    'sitelen-pona': { text: 'SP', ariaLabel: 'Sitelen pona mode' },
    'sitelen-emoji': { text: '😊', ariaLabel: 'Sitelen emoji mode' }
  }
}).init();
```

## What This Does NOT Do

- Does **not** translate from other languages into toki pona.
- Does **not** process text in images / OCR.
- Is **not** a browser extension for arbitrary third-party sites.
- Does **not** guarantee perfect typography on every site without CSS tuning.

## Troubleshooting Sitelen Pona Font

Common issues:

- `fontCssUrl` blocked by CSP.
- Font file loads but CSS specificity prevents application.
- Font loaded, but custom site CSS overrides plugin class.
- Font readiness is false in diagnostics/overlay.

Checklist:

1. Verify font URL is allowed by your CSP.
2. Check network panel for font/CSS responses.
3. Confirm diagnostics shows `sitelenPonaFontReady: true`.
4. Apply stronger CSS selector with custom class.
5. In diagnostics, check `sitelenPonaRenderMode`.

Example with stronger specificity:

```css
/* plugin config: sitelenPona.className = "my-sitelen-pona-layer" */
#tok-content.my-sitelen-pona-layer,
#tok-content.my-sitelen-pona-layer * {
  font-family: 'nasin-sitelen-pu', 'Noto Sans', sans-serif !important;
  font-variant-ligatures: common-ligatures discretionary-ligatures;
}
```

`font-only` note: this path is a styling/ligature pipeline. It does not guarantee full latin-to-glyph conversion on every site. Use it as the stable MVP path and tune CSS/font loading first.

## SPA / Observer Recommendations

- Use `mutationObserver.incremental=true` for frequent append/replace UI updates.
- Keep `observeAttributes=false` unless attribute changes materially alter text eligibility.
- Prefer explicit `refresh()` on known route hooks for large route transitions.
- Keep observer settings moderate by default; avoid aggressive full rescans.

## Public API

- `createSitelenLayerPlugin(config)`
- `createSitelenLayerPluginFromProfiles(profiles, options)`
- `plugin.init()`
- `plugin.refresh()`
- `plugin.destroy()`
- `plugin.getDiagnostics()`
- `plugin.showDiagnosticsOverlay()` / `plugin.hideDiagnosticsOverlay()`

## Package Usage

```ts
import { createSitelenLayerPlugin } from 'sitelen-layer-plugin';
import { createSitelenLayerPluginFromProfiles } from 'sitelen-layer-plugin';
import { createTokiPonaLocaleProfiles } from 'sitelen-layer-plugin';
import 'sitelen-layer-plugin/styles.css';
```

## Deployment Note (CI/Vercel)

- Avoid machine-local dependency paths like `file:/Users/...` or `file:/Downloads/...`.
- Use one of these installation modes for stable deployments:
1. Published npm package (recommended for production).
2. Repo-local vendored `.tgz` file (for controlled pinning).
3. Git dependency only if your release flow includes built `dist` artifacts.

If bundler resolution fails in CI, first check your dependency source and that `dist/` is available to consumers.

Integration checklist and Next.js header-mount recipe:

- [`docs/INTEGRATION_PLAYBOOK.md`](/Users/antonbiletskiy-volokh/Downloads/Projects/sitelen-layer-plugin/docs/INTEGRATION_PLAYBOOK.md)
- Includes a `Deployment verification (runtime fingerprints)` section for live `/tp` checks (`slp-toggle--size-lg`, `TP/SP/🙂`, overlay fields, `Container: main`).

## Key Config (selected)

- `threshold` (default `0.7`)
- `requireDominantTokiPona` (default `true`)
- `toggleMount`, `toggleMode`, `toggleSize`, `toggleLabels`
- `mutationObserver.enabled` / `mutationObserver.incremental`
- `spaNavigation.enabled`
- `emojiExcludeSelectors` (keep nav/header/logo untouched in emoji mode)
- `sitelenPona.fontFamily`, `sitelenPona.fontCssUrl`, `sitelenPona.className`
- `sitelenPona.renderStrategy` (`font-only` or `transform` hook)
- `onDiagnostics`, `onLayerChange`, `onProfileMatch`

## Diagnostics

`getDiagnostics()` includes:

- detection: `score`, `threshold`, `eligible`, `totalTokens`, `recognizedTokens`
- layer state: `activeLayer`, `modeSource`, `availableLayers`
- toggle state: `toggleMountMode`, `toggleMountedIn`
- sitelen pona state: `sitelenPonaFontReady`, `sitelenPonaRenderMode`, `sitelenPonaWarning`
- emoji state: `emojiReplacementCount`, `emojiCoverageRatio`
- profile state: `profileId`, `matchedProfileId`, `matchedProfileReason`
- observer state: `observerStats`
- timing: `lastUpdatedAt`

## QA And Tests

- QA fixtures: `/qa/index.html`
- Manual checklist: `qa/README.md`
- Run automated tests:

```bash
npm run test:run
```

## Development

```bash
npm install
npm run dev
npm run build
```
