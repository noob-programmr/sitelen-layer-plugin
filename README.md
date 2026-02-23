# sitelen-layer-plugin

Site-owner plugin for pages where toki pona already exists and dominates content.

This is **not a translator** and **not** a browser extension.

## Core Capabilities

- Detects toki pona dominance by token ratio (default threshold `>= 70%`)
- Shows layer toggle only when eligible (`requireDominantTokiPona=true`)
- Supports 3 layers:
  - `latin` (original text)
  - `sitelen-emoji` (from `sitelen-emoji-truth` mapping)
  - `sitelen-pona` (font/ligature pipeline)
- Processes only text nodes (no OCR, no image text)
- Persists selected layer in `localStorage`

## Install

```bash
npm install sitelen-layer-plugin
```

Local development:

```bash
npm install
npm run dev
```

## Quick Start

```ts
import { createSitelenLayerPlugin } from 'sitelen-layer-plugin';
import 'sitelen-layer-plugin/styles.css';

const plugin = createSitelenLayerPlugin({
  container: '#tp-locale',
  threshold: 0.7,
  requireDominantTokiPona: true
});

plugin.init();
```

## Public API

- `createSitelenLayerPlugin(config)`
- `createSitelenLayerPluginFromProfiles(profiles, options)`
- `plugin.init()`
- `plugin.refresh()`
- `plugin.destroy()`
- `plugin.getDiagnostics()`
- `plugin.showDiagnosticsOverlay()`
- `plugin.hideDiagnosticsOverlay()`

## Configuration

```ts
createSitelenLayerPlugin({
  container?: string | Element,
  threshold?: number,
  layers?: ('latin' | 'sitelen-pona' | 'sitelen-emoji')[],
  defaultLayer?: 'latin' | 'sitelen-pona' | 'sitelen-emoji',
  showToggle?: boolean,
  toggleMount?: string | Element,
  excludeSelectors?: string[],
  debug?: boolean,
  debugOverlay?: boolean,
  diagnosticsOverlay?: boolean,
  storageKey?: string,
  requireDominantTokiPona?: boolean,

  observeMutations?: boolean, // backward-compatible shortcut
  mutationDebounceMs?: number, // backward-compatible shortcut
  mutationObserver?: {
    enabled?: boolean,
    debounceMs?: number,
    incremental?: boolean,
    observeAttributes?: boolean,
    attributeFilter?: string[],
    maxBatchNodes?: number
  },

  observeNavigation?: boolean, // backward-compatible shortcut
  spaNavigation?: {
    enabled?: boolean,
    patchHistory?: boolean,
    refreshDelayMs?: number
  },

  sitelenPona?: {
    enabled?: boolean,
    fontFamily?: string,
    fontCssUrl?: string,
    applyToRoot?: boolean,
    className?: string,
    renderStrategy?: 'font-only' | 'transform'
  },

  profileId?: string | null,
  onProfileMatch?: (profileId: string | null) => void,
  onEligibilityChange?: (eligible, diagnostics) => void,
  onDiagnostics?: (diagnostics) => void,
  onLayerChange?: (layer, diagnostics) => void
})
```

## SPA And Dynamic Content

Dynamic support is production-friendly and guard-railed:

- Mutation batching via `requestAnimationFrame`
- Debounced full diagnostics refresh (`mutationObserver.debounceMs`)
- Incremental subtree updates (`mutationObserver.incremental=true`) for newly added/changed nodes
- Self-mutation guard prevents infinite observer loops when plugin updates text/class/UI
- Optional navigation refresh support via:
  - `spaNavigation.enabled`
  - `popstate` + `hashchange`
  - optional history patching (`pushState`/`replaceState`)

Notes:

- Incremental updates keep rendering responsive.
- Full eligibility recalculation is still debounced for stability.

## Profiles (Site/Locale Presets)

Use profiles to auto-apply config on specific host/path/locale segments.

```ts
import { createSitelenLayerPluginFromProfiles } from 'sitelen-layer-plugin';

const plugin = createSitelenLayerPluginFromProfiles(
  [
    {
      id: 'tok-locale',
      priority: 20,
      match: { pathnamePrefix: '/tok/' },
      config: {
        container: '#tok-content',
        defaultLayer: 'sitelen-emoji',
        mutationObserver: { enabled: true, incremental: true }
      }
    },
    {
      id: 'en-locale',
      priority: 10,
      match: { pathnamePrefix: '/en/' },
      config: { showToggle: false }
    }
  ],
  {
    baseConfig: {
      threshold: 0.7,
      onProfileMatch: (id) => console.log('profile:', id)
    }
  }
);
```

Profile matching supports:

- `hostname`
- `pathnamePrefix`
- `pathnameRegex`
- `lang`
- `priority`

## Sitelen Emoji Mapping Source

Canonical source for this project:

- `markoblogo/sitelen-emoji-truth`

Local frozen snapshot:

- `vendor/sitelen-emoji-truth/default-stable.v1.json`

Generated runtime mapping:

- `src/generated/emojiMapping.generated.ts`

Update mapping:

```bash
npm run emoji:update
```

If upstream format changes, adapt:

- `src/emoji/normalizeEmojiMapping.ts`
- `scripts/update-emoji-mapping.mjs`

## Sitelen Pona Rendering

MVP+ uses **font-only ligature path** by default:

- original DOM text remains latin toki pona
- rendering switches by class + `font-family`
- recommended font: `nasin-sitelen-pu`

You can provide `fontCssUrl` for automatic `<link>` injection (deduplicated), or preload font manually.

If font is not ready and `renderStrategy='font-only'`, sitelen-pona layer is disabled (non-fatal) with debug warning.

## Diagnostics

`plugin.getDiagnostics()` returns a stable object including:

- `score`, `threshold`, `eligible`
- `totalTokens`, `recognizedTokens`
- `activeLayer`, `modeSource`, `availableLayers`
- `containerInfo`, `profileId`
- `lastUpdatedAt`
- `observerStats`

Overlay shows these fields when `debug`, `debugOverlay`, or `diagnosticsOverlay` is enabled.

## QA Fixtures

Fixtures are in `qa/fixtures`.

Run:

```bash
npm run dev
```

Open:

- `/qa/index.html`

Includes:

- `tp-dominant.html`
- `non-tp-dominant.html`
- `mixed-layout.html`
- `dynamic-content.html`
- `profile-routes/tok` and `profile-routes/en`

Checklist: see `qa/README.md`.

## Testing

Run tests:

```bash
npm run test:run
```

Coverage target in current suite:

- tokenizer
- detector
- emoji transformer
- sitelen pona helpers
- profile resolver
- DOM integration (toggle eligibility, ignore/scope handling, observer behavior)

## Production Notes

- Prefer explicit container scope (`container`, `data-sitelen-layer-scope`) over whole-page processing.
- Keep `excludeSelectors` tight to avoid unnecessary scanning.
- For large SPA sections, enable incremental observer mode and moderate `debounceMs`.
- Load `nasin-sitelen-pu` before init when possible for predictable first paint.

## Limits

- No machine translation
- No OCR/image text handling
- No advanced morphological NLP
- Browser font readiness depends on `document.fonts` support

## Roadmap

- Richer mapping QA and release pin automation
- More advanced sitelen pona name/cartouche strategies
- Higher-level SPA adapters (optional wrappers for common frameworks)
