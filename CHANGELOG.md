# Changelog

## v0.1.1

### Added

- `sitelen-pona` transform MVP path (`sitelenPona.renderStrategy: 'transform'`) with token mapping subset and fallback for unknown tokens.
- Sitelen pona transform diagnostics fields: replacement count, word-token count, and coverage ratio.
- Transformer and DOM integration tests for sitelen-pona transform mode and latin restoration flow.

### Improved

- Toggle integration UX for real sites: header inline mount mode, size variants, custom labels, and stable default labels (`TP / SP / 🙂`).
- Expanded MVP sitelen-pona mapping based on validated `/tp` content integration in toki-free-kit.
- Debug diagnostics/overlay coverage for toggle state, profile match context, emoji coverage, and sitelen-pona transform metrics.

### Docs

- README and integration docs updated with live-validated toki-free-kit integration details and runtime verification fingerprints.
- Explicit guidance for `font-only` vs `transform` sitelen-pona modes.

### Known Limitations

- Sitelen pona transform remains an MVP subset; coverage depends on current mapping and page content.
- `font-only` remains available and is still the safer styling path for broad compatibility.

## v0.1.0

### Added

- Public site-owner plugin API for layered toki pona display.
- Profiles API for hostname/path/lang matching with priority.
- Debug diagnostics overlay with profile and observer details.
- MutationObserver batching/debounce with incremental update mode.
- Optional SPA navigation observation.
- QA fixtures and automated tests (tokenizer, detector, transformers, profile resolver, jsdom integration).

### Improved

- Package ergonomics for npm usage (`exports`, css subpath export, type exports).
- README with copy-paste integrations, troubleshooting, and production guidance.

### Notes

- This package does not perform machine translation.
