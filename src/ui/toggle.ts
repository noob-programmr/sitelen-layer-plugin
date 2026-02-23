import type { SitelenLayer } from '../types';

interface ToggleOptions {
  layers: SitelenLayer[];
  activeLayer: SitelenLayer;
  mount?: Element;
  disabledLayers?: SitelenLayer[];
  onChange: (layer: SitelenLayer) => void;
}

const SYMBOLS: Record<SitelenLayer, string> = {
  latin: '◻︎',
  'sitelen-pona': '⌘',
  'sitelen-emoji': '😊'
};

const LABELS: Record<SitelenLayer, string> = {
  latin: 'Latin layer',
  'sitelen-pona': 'Sitelen pona layer',
  'sitelen-emoji': 'Sitelen emoji layer'
};

export class LayerToggle {
  private root: HTMLDivElement;
  private buttons = new Map<SitelenLayer, HTMLButtonElement>();

  constructor(private readonly options: ToggleOptions) {
    this.root = document.createElement('div');
    this.root.className = 'slp-toggle';
    this.root.setAttribute('data-sitelen-layer-ui', 'toggle');
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Sitelen layer switcher');

    this.options.layers.forEach((layer) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slp-toggle__btn';
      button.textContent = SYMBOLS[layer];
      button.setAttribute('aria-label', LABELS[layer]);
      button.dataset.layer = layer;
      button.addEventListener('click', () => {
        if (button.disabled) {
          return;
        }

        this.options.onChange(layer);
      });
      this.buttons.set(layer, button);
      this.root.appendChild(button);
    });

    this.setDisabledLayers(this.options.disabledLayers ?? []);
    this.setActiveLayer(this.options.activeLayer);
  }

  mount(): void {
    const mountPoint = this.options.mount;
    if (mountPoint) {
      mountPoint.appendChild(this.root);
      this.root.classList.add('slp-toggle--mounted');
      return;
    }

    document.body.appendChild(this.root);
  }

  setActiveLayer(layer: SitelenLayer): void {
    this.buttons.forEach((button, key) => {
      const active = key === layer;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  setDisabledLayers(disabledLayers: SitelenLayer[]): void {
    const disabled = new Set(disabledLayers);
    this.buttons.forEach((button, layer) => {
      const isDisabled = disabled.has(layer);
      button.disabled = isDisabled;
      button.classList.toggle('is-disabled', isDisabled);
      button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    });
  }

  destroy(): void {
    this.root.remove();
    this.buttons.clear();
  }
}
