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
});
