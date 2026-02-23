import type { SitelenLayer, ToggleLabelSpec, ToggleLabels, ToggleMode, ToggleSize } from '../types';

interface ToggleOptions {
  layers: SitelenLayer[];
  activeLayer: SitelenLayer;
  mount?: Element;
  mode: ToggleMode;
  size: ToggleSize;
  mountedIn?: string;
  labels?: ToggleLabels;
  disabledLayers?: SitelenLayer[];
  onChange: (layer: SitelenLayer) => void;
}

const SYMBOLS: Record<SitelenLayer, string> = {
  latin: 'TP',
  'sitelen-pona': 'SP',
  'sitelen-emoji': '🙂'
};

const LABELS: Record<SitelenLayer, string> = {
  latin: 'Latin layer',
  'sitelen-pona': 'Sitelen pona layer',
  'sitelen-emoji': 'Sitelen emoji layer'
};

export class LayerToggle {
  private root: HTMLDivElement;
  private buttons = new Map<SitelenLayer, HTMLButtonElement>();
  private mountedMode: 'floating' | 'inline' = 'floating';

  constructor(private readonly options: ToggleOptions) {
    this.root = document.createElement('div');
    this.root.className = 'slp-toggle';
    this.root.classList.add(`slp-toggle--size-${this.options.size}`);
    this.root.setAttribute('data-sitelen-layer-ui', 'toggle');
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Sitelen layer switcher');

    this.options.layers.forEach((layer) => {
      const button = document.createElement('button');
      const label = this.resolveLabel(layer);
      button.type = 'button';
      button.className = 'slp-toggle__btn';
      button.textContent = label.text ?? SYMBOLS[layer];
      button.setAttribute('aria-label', label.ariaLabel ?? LABELS[layer]);
      if (label.title) {
        button.title = label.title;
      }
      if (label.className) {
        button.classList.add(label.className);
      }
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
    const shouldInline =
      this.options.mode === 'inline' || (this.options.mode === 'auto' && Boolean(this.options.mount));
    const mountPoint = shouldInline ? this.options.mount : undefined;

    if (mountPoint) {
      mountPoint.appendChild(this.root);
      this.root.classList.add('slp-toggle--mounted');
      this.root.setAttribute('data-slp-toggle-mode', 'inline');
      if (this.options.mountedIn) {
        this.root.setAttribute('data-slp-toggle-mounted-in', this.options.mountedIn);
      }
      this.mountedMode = 'inline';
      return;
    }

    document.body.appendChild(this.root);
    this.root.classList.remove('slp-toggle--mounted');
    this.root.setAttribute('data-slp-toggle-mode', 'floating');
    this.root.removeAttribute('data-slp-toggle-mounted-in');
    this.mountedMode = 'floating';
  }

  getMountedMode(): 'floating' | 'inline' {
    return this.mountedMode;
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

  private resolveLabel(layer: SitelenLayer): ToggleLabelSpec {
    const configured = this.options.labels?.[layer];
    if (!configured) {
      return {};
    }

    if (typeof configured === 'string') {
      return { text: configured };
    }

    return configured;
  }
}
