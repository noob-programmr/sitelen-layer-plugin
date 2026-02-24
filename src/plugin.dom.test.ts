import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSitelenLayerPlugin } from './index';

describe('plugin dom integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('shows toggle for toki pona dominant container and restores latin text', () => {
    document.body.innerHTML = `
      <div id="app">
        <p>toki pona li pona tawa mi. jan pona li toki pona.</p>
        <code>toki pona li lon code</code>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      defaultLayer: 'sitelen-emoji',
      sitelenPona: { enabled: false }
    });

    plugin.init();

    const toggle = document.querySelector('[data-sitelen-layer-ui="toggle"]');
    expect(toggle).not.toBeNull();

    const paragraph = document.querySelector('#app p') as HTMLParagraphElement;
    const code = document.querySelector('#app code') as HTMLElement;

    expect(paragraph.textContent).toContain('👤');
    expect(code.textContent).toBe('toki pona li lon code');

    const latinButton = document.querySelector('button[data-layer="latin"]') as HTMLButtonElement;
    latinButton.click();

    expect(paragraph.textContent).toContain('toki pona');

    plugin.destroy();
  });

  it('hides toggle on non-eligible container', () => {
    document.body.innerHTML = `
      <div id="app">
        <p>This text is mostly English and should fail dominance threshold.</p>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      requireDominantTokiPona: true,
      sitelenPona: { enabled: false }
    });

    plugin.init();

    const toggle = document.querySelector('[data-sitelen-layer-ui="toggle"]');
    expect(toggle).toBeNull();

    plugin.destroy();
  });

  it('respects data-sitelen-layer-ignore and scope', () => {
    document.body.innerHTML = `
      <div id="app" data-sitelen-layer-scope>
        <p id="tp">toki pona li pona</p>
        <p id="ignored" data-sitelen-layer-ignore>toki pona li pona</p>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      defaultLayer: 'sitelen-emoji',
      sitelenPona: { enabled: false }
    });

    plugin.init();

    expect(document.querySelector('#tp')?.textContent).toContain('🗣️');
    expect(document.querySelector('#ignored')?.textContent).toBe('toki pona li pona');

    plugin.destroy();
  });

  it('updates dynamic content in observer mode without self-loop', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback): number => {
      cb(0);
      return 1;
    });

    document.body.innerHTML = `
      <div id="app">
        <p>toki pona li pona tawa mi</p>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      defaultLayer: 'sitelen-emoji',
      sitelenPona: { enabled: false },
      mutationObserver: {
        enabled: true,
        debounceMs: 10,
        incremental: true
      }
    });

    plugin.init();

    const extra = document.createElement('p');
    extra.textContent = 'jan pona li toki';
    document.querySelector('#app')?.appendChild(extra);

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(extra.textContent).toContain('👤');
    expect(plugin.getDiagnostics().observerStats.mutationsObserved).toBeGreaterThan(0);

    plugin.destroy();
  });

  it('mounts toggle inline when toggleMount is found', () => {
    document.body.innerHTML = `
      <header><div id="toggle-mount"></div></header>
      <div id="app">
        <p>toki pona li pona tawa mi. jan pona li toki pona.</p>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      toggleMount: '#toggle-mount',
      toggleMode: 'auto',
      sitelenPona: { enabled: false }
    });

    plugin.init();

    const mount = document.querySelector('#toggle-mount') as HTMLElement;
    const toggle = mount.querySelector('[data-sitelen-layer-ui="toggle"]') as HTMLElement;
    expect(toggle).not.toBeNull();
    expect(toggle.dataset.slpToggleMode).toBe('inline');
    expect(plugin.getDiagnostics().toggleMountMode).toBe('inline');
    expect(plugin.getDiagnostics().toggleSize).toBe('md');

    plugin.destroy();
  });

  it('uses predictable default toggle labels', () => {
    document.body.innerHTML = `
      <div id="app">
        <p>toki pona li pona tawa mi. jan pona li toki pona.</p>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      sitelenPona: { enabled: true, renderStrategy: 'transform' }
    });

    plugin.init();

    const latinBtn = document.querySelector('button[data-layer="latin"]') as HTMLButtonElement;
    const spBtn = document.querySelector('button[data-layer="sitelen-pona"]') as HTMLButtonElement;
    const emojiBtn = document.querySelector('button[data-layer="sitelen-emoji"]') as HTMLButtonElement;
    expect(latinBtn.textContent).toBe('TP');
    expect(spBtn.textContent).toBe('SP');
    expect(emojiBtn.textContent).toBe('🙂');

    plugin.destroy();
  });

  it('falls back to floating mode when inline mount is missing', () => {
    document.body.innerHTML = `
      <div id="app">
        <p>toki pona li pona tawa mi. jan pona li toki pona.</p>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      toggleMount: '#missing',
      toggleMode: 'inline',
      sitelenPona: { enabled: false }
    });

    plugin.init();

    const toggle = document.querySelector('[data-sitelen-layer-ui="toggle"]') as HTMLElement;
    expect(toggle.dataset.slpToggleMode).toBe('floating');
    expect(plugin.getDiagnostics().toggleMountMode).toBe('floating');

    plugin.destroy();
  });

  it('supports custom toggle labels and layer-specific emoji excludes', () => {
    document.body.innerHTML = `
      <div id="app">
        <header><p id="nav">toki pona li pona</p></header>
        <main><p id="main">jan pona li toki</p></main>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      defaultLayer: 'sitelen-emoji',
      sitelenPona: { enabled: false },
      toggleLabels: {
        latin: 'TP',
        'sitelen-emoji': { text: '😄', ariaLabel: 'Sitelen emoji mode' }
      },
      emojiExcludeSelectors: ['header']
    });

    plugin.init();

    const latinBtn = document.querySelector('button[data-layer="latin"]') as HTMLButtonElement;
    const emojiBtn = document.querySelector('button[data-layer="sitelen-emoji"]') as HTMLButtonElement;
    expect(latinBtn.textContent).toBe('TP');
    expect(emojiBtn.textContent).toBe('😄');
    expect(emojiBtn.getAttribute('aria-label')).toBe('Sitelen emoji mode');

    const nav = document.querySelector('#nav') as HTMLElement;
    const main = document.querySelector('#main') as HTMLElement;
    expect(nav.textContent).toBe('toki pona li pona');
    expect(main.textContent).toContain('👤');

    const diagnostics = plugin.getDiagnostics();
    expect(diagnostics.emojiReplacementCount).toBeGreaterThan(0);
    expect(diagnostics.emojiCoverageRatio).toBeGreaterThan(0);

    plugin.destroy();
  });

  it('applies sitelen pona transform layer and restores latin', () => {
    document.body.innerHTML = `
      <div id="app">
        <p>toki pona li pona tawa mi. jan pona li toki pona.</p>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      defaultLayer: 'sitelen-pona',
      sitelenPona: { enabled: true, renderStrategy: 'transform' }
    });

    plugin.init();

    const paragraph = document.querySelector('#app p') as HTMLParagraphElement;
    expect(paragraph.textContent).toContain('⟐');

    const diagnostics = plugin.getDiagnostics();
    expect(diagnostics.sitelenPonaRenderMode).toBe('transform');
    expect(diagnostics.sitelenPonaReplacementCount).toBeGreaterThan(0);
    expect(diagnostics.sitelenPonaWordTokenCount).toBeGreaterThan(0);
    expect(diagnostics.sitelenPonaCoverageRatio).not.toBeNull();

    const latinButton = document.querySelector('button[data-layer="latin"]') as HTMLButtonElement;
    latinButton.click();
    expect(paragraph.textContent).toContain('toki pona');

    plugin.destroy();
  });

  it('keeps font-only path stable and reports no transform coverage', () => {
    document.body.innerHTML = `
      <div id="app">
        <p>toki pona li pona tawa mi. jan pona li toki pona.</p>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      sitelenPona: { enabled: true, renderStrategy: 'font-only' }
    });

    plugin.init();
    const diagnostics = plugin.getDiagnostics();
    expect(diagnostics.sitelenPonaRenderMode).toBe('font-only');
    expect(diagnostics.sitelenPonaCoverageRatio).toBeNull();
    expect(diagnostics.sitelenPonaReplacementCount).toBe(0);
    plugin.destroy();
  });

  it('applies header-friendly toggle size class', () => {
    document.body.innerHTML = `
      <header><div id="toggle-mount"></div></header>
      <div id="app">
        <p>toki pona li pona tawa mi. jan pona li toki pona.</p>
      </div>
    `;

    const plugin = createSitelenLayerPlugin({
      container: '#app',
      toggleMount: '#toggle-mount',
      toggleMode: 'auto',
      toggleSize: 'lg'
    });

    plugin.init();

    const toggle = document.querySelector('[data-sitelen-layer-ui="toggle"]') as HTMLElement;
    expect(toggle.classList.contains('slp-toggle--size-lg')).toBe(true);
    expect(plugin.getDiagnostics().toggleSize).toBe('lg');
    plugin.destroy();
  });
});
