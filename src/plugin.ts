import './styles.css';
import { collectTextNodes, collectTextNodesInSubtree, isTextNodeAllowed } from './dom-walker';
import { analyzeTokiPonaDominance } from './detector';
import { resolveEligibility } from './eligibility';
import { writeStoredLayer, readStoredLayer } from './storage';
import { toSitelenEmojiWithStats } from './transformers/emoji';
import { toSitelenPonaWithStats } from './transformers/sitelenPonaTransform';
import {
  DEFAULT_SITELEN_PONA_FONT,
  applyContainerLayerClass,
  applySitelenPonaVariables,
  clearSitelenPonaVariables,
  ensureFontCssLink,
  getSitelenPonaClassName,
  isSitelenPonaFontReady
} from './transformers/sitelenPona';
import { LayerToggle } from './ui/toggle';
import { DebugOverlay } from './ui/debugOverlay';
import type {
  LayerModeSource,
  MutationObserverConfig,
  ObserverStats,
  PluginDiagnostics,
  SitelenLayer,
  SitelenLayerPluginConfig,
  SitelenPonaConfig,
  SpaNavigationConfig,
  ToggleLabels,
  ToggleMode,
  ToggleSize
} from './types';

const DEFAULT_LAYERS: SitelenLayer[] = ['latin', 'sitelen-pona', 'sitelen-emoji'];
const DEFAULT_STORAGE_KEY = 'sitelen-layer-plugin:layer';
const DEFAULT_DEBOUNCE_MS = 200;
const DEFAULT_MAX_BATCH_NODES = 250;
const DEFAULT_NAVIGATION_REFRESH_DELAY = 60;
const DEFAULT_TOGGLE_MODE: ToggleMode = 'auto';
const DEFAULT_TOGGLE_SIZE: ToggleSize = 'md';
const PLUGIN_UI_SELECTOR = '[data-sitelen-layer-ui]';

const HISTORY_PATCH_MARKER = '__sitelenLayerPatched__';
const historyListeners = new Set<() => void>();
let originalPushState: History['pushState'] | null = null;
let originalReplaceState: History['replaceState'] | null = null;

function notifyHistoryListeners(): void {
  historyListeners.forEach((listener) => listener());
}

function installHistoryPatch(): void {
  if ((history as History & { [HISTORY_PATCH_MARKER]?: boolean })[HISTORY_PATCH_MARKER]) {
    return;
  }

  originalPushState = history.pushState;
  originalReplaceState = history.replaceState;

  history.pushState = function pushStatePatched(...args): void {
    originalPushState?.apply(this, args);
    notifyHistoryListeners();
  };

  history.replaceState = function replaceStatePatched(...args): void {
    originalReplaceState?.apply(this, args);
    notifyHistoryListeners();
  };

  (history as History & { [HISTORY_PATCH_MARKER]?: boolean })[HISTORY_PATCH_MARKER] = true;
}

function uninstallHistoryPatchIfUnused(): void {
  if (historyListeners.size > 0) {
    return;
  }

  const marked = history as History & { [HISTORY_PATCH_MARKER]?: boolean };
  if (!marked[HISTORY_PATCH_MARKER]) {
    return;
  }

  if (originalPushState) {
    history.pushState = originalPushState;
  }

  if (originalReplaceState) {
    history.replaceState = originalReplaceState;
  }

  delete marked[HISTORY_PATCH_MARKER];
  originalPushState = null;
  originalReplaceState = null;
}

function resolveElement(target: string | Element | undefined): Element | null {
  if (!target) {
    return null;
  }

  if (typeof target === 'string') {
    return document.querySelector(target);
  }

  return target;
}

function isValidLayer(value: string | undefined): value is SitelenLayer {
  return value === 'latin' || value === 'sitelen-pona' || value === 'sitelen-emoji';
}

function isValidToggleSize(value: string | undefined): value is ToggleSize {
  return value === 'sm' || value === 'md' || value === 'lg';
}

function describeContainer(container: Element, configuredTarget?: string | Element): string {
  if (typeof configuredTarget === 'string') {
    return configuredTarget;
  }

  if (container === document.body) {
    return 'body';
  }

  const id = container.getAttribute('id');
  if (id) {
    return `${container.tagName.toLowerCase()}#${id}`;
  }

  return container.tagName.toLowerCase();
}

function describeElement(target: string | Element | null | undefined): string | undefined {
  if (!target) {
    return undefined;
  }

  if (typeof target === 'string') {
    return target;
  }

  if (target === document.body) {
    return 'body';
  }

  const id = target.getAttribute('id');
  if (id) {
    return `${target.tagName.toLowerCase()}#${id}`;
  }

  return target.tagName.toLowerCase();
}

function defaultSitelenPonaConfig(config?: SitelenPonaConfig): Required<SitelenPonaConfig> {
  return {
    enabled: config?.enabled ?? true,
    fontFamily: config?.fontFamily ?? DEFAULT_SITELEN_PONA_FONT,
    fontCssUrl: config?.fontCssUrl ?? '',
    applyToRoot: config?.applyToRoot ?? false,
    className: config?.className ?? '',
    renderStrategy: config?.renderStrategy ?? 'font-only'
  };
}

function defaultMutationObserverConfig(
  config: SitelenLayerPluginConfig
): Required<Omit<MutationObserverConfig, 'attributeFilter'>> & { attributeFilter?: string[] } {
  const source = config.mutationObserver ?? {};

  return {
    enabled: source.enabled ?? config.observeMutations ?? false,
    debounceMs: source.debounceMs ?? config.mutationDebounceMs ?? DEFAULT_DEBOUNCE_MS,
    incremental: source.incremental ?? true,
    observeAttributes: source.observeAttributes ?? false,
    attributeFilter: source.attributeFilter,
    maxBatchNodes: source.maxBatchNodes ?? DEFAULT_MAX_BATCH_NODES
  };
}

function defaultSpaNavigationConfig(config: SitelenLayerPluginConfig): Required<SpaNavigationConfig> {
  const source = config.spaNavigation ?? {};

  return {
    enabled: source.enabled ?? config.observeNavigation ?? false,
    patchHistory: source.patchHistory ?? true,
    refreshDelayMs: source.refreshDelayMs ?? DEFAULT_NAVIGATION_REFRESH_DELAY
  };
}

interface ResolvedConfig {
  container?: string | Element;
  threshold: number;
  layers: SitelenLayer[];
  defaultLayer: SitelenLayer;
  showToggle: boolean;
  toggleMount?: string | Element;
  toggleMode: ToggleMode;
  toggleSize: ToggleSize;
  toggleLabels?: ToggleLabels;
  emojiExcludeSelectors: string[];
  excludeSelectors: string[];
  debug: boolean;
  debugOverlay: boolean;
  diagnosticsOverlay: boolean;
  storageKey: string;
  requireDominantTokiPona: boolean;
  mutationObserver: Required<Omit<MutationObserverConfig, 'attributeFilter'>> & { attributeFilter?: string[] };
  spaNavigation: Required<SpaNavigationConfig>;
  sitelenPona: Required<SitelenPonaConfig>;
  profileId?: string | null;
  profileMatchReason?: string;
  onProfileMatch?: SitelenLayerPluginConfig['onProfileMatch'];
  onEligibilityChange?: SitelenLayerPluginConfig['onEligibilityChange'];
  onDiagnostics?: SitelenLayerPluginConfig['onDiagnostics'];
  onLayerChange?: SitelenLayerPluginConfig['onLayerChange'];
}

export class SitelenLayerPlugin {
  private readonly config: ResolvedConfig;
  private readonly sitelenPonaClassName: string;

  private container: Element | null = null;
  private toggleMount: Element | null = null;
  private initialized = false;

  private currentLayer: SitelenLayer = 'latin';
  private preferredLayer: SitelenLayer = 'latin';
  private modeSource: LayerModeSource = 'default';
  private availableLayers: SitelenLayer[] = [];
  private disabledLayers = new Set<SitelenLayer>();

  private textNodes: Text[] = [];
  private originalTextMap = new WeakMap<Text, string>();
  private togglableSet = new Set<Text>();

  private toggle: LayerToggle | null = null;
  private debugOverlay: DebugOverlay | null = null;

  private observer: MutationObserver | null = null;
  private diagnosticsTimer: number | null = null;
  private mutationFlushScheduled = false;
  private queuedMutationRoots = new Set<Node>();
  private requiresFullRefreshFromMutations = false;
  private isApplyingLayer = false;
  private selfMutatedNodes = new WeakSet<Node>();

  private popStateListener: (() => void) | null = null;
  private hashChangeListener: (() => void) | null = null;
  private historyListener: (() => void) | null = null;
  private navigationTimer: number | null = null;

  private detectorPass = false;
  private eligible = false;
  private totalTokens = 0;
  private recognizedTokens = 0;
  private score = 0;
  private ignoredCandidates = 0;
  private sitelenPonaFontReady = false;
  private sitelenPonaWarning: string | undefined;
  private sitelenPonaReplacementCount = 0;
  private sitelenPonaWordTokenCount = 0;
  private toggleMountMode: 'floating' | 'inline' = 'floating';
  private toggleMountedIn: string | undefined;
  private emojiReplacementCount = 0;
  private emojiWordTokenCount = 0;
  private containerInfo = 'body';
  private lastUpdatedAt = new Date(0).toISOString();

  private initialLayerResolved = false;
  private observerStats: ObserverStats = {
    mutationsObserved: 0,
    batchesProcessed: 0,
    incrementalUpdates: 0,
    fullRefreshes: 0
  };

  constructor(config: SitelenLayerPluginConfig = {}) {
    const validatedLayers = (config.layers ?? DEFAULT_LAYERS).filter(isValidLayer);
    const sitelenPona = defaultSitelenPonaConfig(config.sitelenPona);

    const baseLayers = validatedLayers.length > 0 ? validatedLayers : DEFAULT_LAYERS;
    const layers = sitelenPona.enabled ? baseLayers : baseLayers.filter((layer) => layer !== 'sitelen-pona');

    this.config = {
      container: config.container,
      threshold: config.threshold ?? 0.7,
      layers: layers.length > 0 ? layers : ['latin', 'sitelen-emoji'],
      defaultLayer: isValidLayer(config.defaultLayer) ? config.defaultLayer : 'latin',
      showToggle: config.showToggle ?? true,
      toggleMount: config.toggleMount,
      toggleMode: config.toggleMode ?? DEFAULT_TOGGLE_MODE,
      toggleSize: isValidToggleSize(config.toggleSize) ? config.toggleSize : DEFAULT_TOGGLE_SIZE,
      toggleLabels: config.toggleLabels,
      emojiExcludeSelectors: config.emojiExcludeSelectors ?? [],
      excludeSelectors: config.excludeSelectors ?? [],
      debug: config.debug ?? false,
      debugOverlay: config.debugOverlay ?? false,
      diagnosticsOverlay: config.diagnosticsOverlay ?? false,
      storageKey: config.storageKey ?? DEFAULT_STORAGE_KEY,
      requireDominantTokiPona: config.requireDominantTokiPona ?? true,
      mutationObserver: defaultMutationObserverConfig(config),
      spaNavigation: defaultSpaNavigationConfig(config),
      sitelenPona,
      profileId: config.profileId,
      profileMatchReason: config.profileMatchReason,
      onProfileMatch: config.onProfileMatch,
      onEligibilityChange: config.onEligibilityChange,
      onDiagnostics: config.onDiagnostics,
      onLayerChange: config.onLayerChange
    };

    if (!this.config.layers.includes(this.config.defaultLayer)) {
      this.config.defaultLayer = this.config.layers[0] ?? 'latin';
    }

    this.preferredLayer = this.config.defaultLayer;
    this.sitelenPonaClassName = getSitelenPonaClassName(this.config.sitelenPona.className);
  }

  init(): void {
    if (this.initialized) {
      return;
    }

    this.container = resolveElement(this.config.container) ?? document.body;
    this.toggleMount = resolveElement(this.config.toggleMount);
    this.toggleMountedIn = describeElement(this.toggleMount ?? this.config.toggleMount);
    this.toggleMountMode = this.resolveToggleMountMode();

    if (!this.container) {
      this.warnDebug('container not found; plugin init skipped');
      return;
    }

    if ((this.config.toggleMode === 'inline' || (this.config.toggleMode === 'auto' && this.config.toggleMount)) && !this.toggleMount) {
      this.warnDebug('toggleMount target was not found; falling back to floating mode');
    }

    if (this.config.sitelenPona.enabled) {
      ensureFontCssLink(this.config.sitelenPona.fontCssUrl || undefined);
      applySitelenPonaVariables(this.container, this.config.sitelenPona);
    }

    if (this.config.debug || this.config.debugOverlay || this.config.diagnosticsOverlay) {
      this.showDiagnosticsOverlay();
    }

    this.config.onProfileMatch?.(this.config.profileId ?? null);
    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.info(
        '[sitelen-layer-plugin] profile match',
        this.config.profileId
          ? `${this.config.profileId} (${this.config.profileMatchReason ?? 'matched'})`
          : this.config.profileMatchReason ?? 'none'
      );
    }

    this.refresh();

    if (this.config.mutationObserver.enabled) {
      this.startObserving();
    }

    if (this.config.spaNavigation.enabled) {
      this.startNavigationObservation();
    }

    this.initialized = true;
  }

  refresh(): void {
    if (!this.container) {
      this.container = resolveElement(this.config.container) ?? document.body;
      if (!this.container) {
        this.warnDebug('container not found during refresh');
        return;
      }
    }

    this.toggleMount = resolveElement(this.config.toggleMount);
    this.toggleMountedIn = describeElement(this.toggleMount ?? this.config.toggleMount);
    this.toggleMountMode = this.resolveToggleMountMode();

    this.observerStats.fullRefreshes += 1;
    this.performFullRefresh();
  }

  destroy(): void {
    this.stopObserving();
    this.stopNavigationObservation();
    this.destroyToggle();
    this.applyLayer('latin', 'default', false);

    if (this.container) {
      clearSitelenPonaVariables(this.container, this.config.sitelenPona.applyToRoot);
    }

    this.hideDiagnosticsOverlay();
    this.initialized = false;
  }

  getDiagnostics(): PluginDiagnostics {
    return {
      totalTokens: this.totalTokens,
      recognizedTokens: this.recognizedTokens,
      score: this.score,
      pass: this.detectorPass,
      threshold: this.config.threshold,
      eligible: this.eligible,
      activeLayer: this.currentLayer,
      containerInfo: this.containerInfo,
      modeSource: this.modeSource,
      availableLayers: [...this.availableLayers],
      ignoredCandidates: this.ignoredCandidates,
      sitelenPonaFontReady: this.sitelenPonaFontReady,
      sitelenPonaRenderMode: this.config.sitelenPona.renderStrategy,
      sitelenPonaReplacementCount: this.config.sitelenPona.renderStrategy === 'transform' ? this.sitelenPonaReplacementCount : 0,
      sitelenPonaWordTokenCount: this.config.sitelenPona.renderStrategy === 'transform' ? this.sitelenPonaWordTokenCount : 0,
      sitelenPonaCoverageRatio:
        this.config.sitelenPona.renderStrategy === 'transform' && this.sitelenPonaWordTokenCount > 0
          ? this.sitelenPonaReplacementCount / this.sitelenPonaWordTokenCount
          : null,
      sitelenPonaWarning: this.sitelenPonaWarning,
      toggleMountMode: this.toggleMountMode,
      toggleSize: this.config.toggleSize,
      toggleMountedIn: this.toggleMountedIn,
      emojiReplacementCount: this.emojiReplacementCount,
      emojiCoverageRatio: this.emojiWordTokenCount > 0 ? this.emojiReplacementCount / this.emojiWordTokenCount : 0,
      matchedProfileId: this.config.profileId ?? null,
      matchedProfileReason: this.config.profileMatchReason,
      profileId: this.config.profileId,
      lastUpdatedAt: this.lastUpdatedAt,
      observerStats: { ...this.observerStats }
    };
  }

  showDiagnosticsOverlay(): void {
    if (!this.debugOverlay) {
      this.debugOverlay = new DebugOverlay();
    }

    this.debugOverlay.mount();
    this.debugOverlay.update(this.getDiagnostics());
  }

  hideDiagnosticsOverlay(): void {
    if (!this.debugOverlay) {
      return;
    }

    this.debugOverlay.destroy();
    this.debugOverlay = null;
  }

  private performFullRefresh(): void {
    if (!this.container) {
      return;
    }

    this.containerInfo = describeContainer(this.container, this.config.container);
    const previousEligibility = this.eligible;

    const collection = collectTextNodes(this.container, this.config.excludeSelectors);
    this.textNodes = collection.textNodes;
    this.ignoredCandidates = collection.ignoredCandidates;

    this.syncTextNodesWithOriginals(this.textNodes, true);
    this.updateEmojiCoverageStats(this.textNodes);
    if (this.config.sitelenPona.renderStrategy === 'transform') {
      this.updateSitelenPonaCoverageStats(this.textNodes);
    } else {
      this.sitelenPonaReplacementCount = 0;
      this.sitelenPonaWordTokenCount = 0;
    }

    const textForDetection = this.textNodes.map((node) => this.originalTextMap.get(node) ?? '').join(' ');
    const detectorResult = analyzeTokiPonaDominance(textForDetection, {
      threshold: this.config.threshold
    });

    this.totalTokens = detectorResult.totalTokens;
    this.recognizedTokens = detectorResult.recognizedTokens;
    this.score = detectorResult.score;
    this.detectorPass = detectorResult.pass;

    this.eligible = resolveEligibility(detectorResult.pass, this.config.requireDominantTokiPona);
    this.updateLayerAvailability();

    if (this.totalTokens < 8) {
      this.warnDebug('detector has low token count; confidence may be weak');
    }

    if (
      this.config.sitelenPona.renderStrategy === 'transform' &&
      this.sitelenPonaWordTokenCount > 0 &&
      this.sitelenPonaReplacementCount / this.sitelenPonaWordTokenCount < 0.35
    ) {
      this.warnDebug('sitelen-pona transform coverage is low for this container; many tokens are unmapped in MVP subset');
    }

    if (this.config.profileId && !this.eligible) {
      this.warnDebug(`profile matched (${this.config.profileId}), but eligibility failed`);
    }

    if (!this.eligible) {
      this.destroyToggle();
      this.applyLayer('latin', 'forced-latin-ineligible');
    } else {
      if (this.config.showToggle) {
        this.ensureToggle();
      }

      const layerToApply = this.resolveNextLayer();
      this.applyLayer(layerToApply.layer, layerToApply.source);
    }

    this.lastUpdatedAt = new Date().toISOString();
    this.publishDiagnostics(previousEligibility !== this.eligible);
  }

  private resolveNextLayer(): { layer: SitelenLayer; source: LayerModeSource } {
    if (!this.initialLayerResolved) {
      this.initialLayerResolved = true;
      const stored = readStoredLayer(this.config.storageKey);

      if (stored && this.config.layers.includes(stored)) {
        this.preferredLayer = stored;
        return { layer: stored, source: 'storage' };
      }

      this.preferredLayer = this.config.defaultLayer;
      return {
        layer: this.config.defaultLayer,
        source: this.config.profileId ? 'profile' : 'default'
      };
    }

    return { layer: this.preferredLayer, source: this.modeSource };
  }

  private publishDiagnostics(eligibilityChanged: boolean): void {
    const diagnostics = this.getDiagnostics();

    if (eligibilityChanged) {
      this.config.onEligibilityChange?.(this.eligible, diagnostics);
    }

    this.config.onDiagnostics?.(diagnostics);
    this.debugOverlay?.update(diagnostics);

    if (this.config.debug) {
      // eslint-disable-next-line no-console
      console.info('[sitelen-layer-plugin] diagnostics', diagnostics);
    }
  }

  private ensureToggle(): void {
    const expectedMountMode = this.resolveToggleMountMode();
    if (this.toggle) {
      if (this.toggle.getMountedMode() !== expectedMountMode) {
        this.toggle.destroy();
        this.toggle = null;
      } else {
        this.toggleMountMode = expectedMountMode;
      }
    }

    if (this.toggle) {
      this.toggle.setDisabledLayers(Array.from(this.disabledLayers));
      this.toggle.setActiveLayer(this.currentLayer);
      return;
    }

    this.toggle = new LayerToggle({
      layers: this.config.layers,
      activeLayer: this.currentLayer,
      disabledLayers: Array.from(this.disabledLayers),
      mount: this.toggleMount ?? undefined,
      mode: this.config.toggleMode,
      size: this.config.toggleSize,
      mountedIn: this.toggleMountedIn,
      labels: this.config.toggleLabels,
      onChange: (layer) => {
        const appliedLayer = this.applyLayer(layer, 'default');
        this.preferredLayer = appliedLayer;
        writeStoredLayer(this.config.storageKey, appliedLayer);
      }
    });

    this.toggle.mount();
    this.toggleMountMode = this.toggle.getMountedMode();
  }

  private destroyToggle(): void {
    if (!this.toggle) {
      return;
    }

    this.toggle.destroy();
    this.toggle = null;
  }

  private applyLayer(layer: SitelenLayer, modeSource: LayerModeSource = 'default', emitLayerChange = true): SitelenLayer {
    if (!this.container) {
      return 'latin';
    }

    let effectiveLayer = layer;
    if (!this.isLayerEnabled(layer)) {
      effectiveLayer = 'latin';
      modeSource = layer === 'sitelen-pona' ? 'fallback-font-missing' : modeSource;
    }

    this.isApplyingLayer = true;
    try {
      this.restoreLatinText(this.textNodes);

      if (effectiveLayer === 'sitelen-emoji') {
        this.applyEmojiLayer(this.textNodes);
      } else if (effectiveLayer === 'sitelen-pona' && this.config.sitelenPona.renderStrategy === 'transform') {
        this.applySitelenPonaTransformLayer(this.textNodes);
      }

      applyContainerLayerClass(this.container, effectiveLayer, this.sitelenPonaClassName);
    } finally {
      this.isApplyingLayer = false;
    }

    this.currentLayer = effectiveLayer;
    this.modeSource = modeSource;
    this.toggle?.setActiveLayer(effectiveLayer);
    this.lastUpdatedAt = new Date().toISOString();

    const diagnostics = this.getDiagnostics();
    this.config.onDiagnostics?.(diagnostics);
    this.debugOverlay?.update(diagnostics);

    if (emitLayerChange) {
      this.config.onLayerChange?.(effectiveLayer, diagnostics);
    }

    return effectiveLayer;
  }

  private restoreLatinText(nodes: Text[]): void {
    nodes.forEach((node) => {
      const original = this.originalTextMap.get(node);
      if (typeof original === 'string' && node.nodeValue !== original) {
        this.setTextNodeValue(node, original);
      }
    });
  }

  private applyEmojiLayer(nodes: Text[]): void {
    this.emojiReplacementCount = 0;
    this.emojiWordTokenCount = 0;

    nodes.forEach((node) => {
      if (this.isEmojiExcludedNode(node)) {
        return;
      }

      const source = this.originalTextMap.get(node);
      if (typeof source === 'string') {
        const result = toSitelenEmojiWithStats(source);
        this.emojiReplacementCount += result.replacedTokens;
        this.emojiWordTokenCount += result.wordTokens;
        const transformed = result.text;
        if (node.nodeValue !== transformed) {
          this.setTextNodeValue(node, transformed);
        }
      }
    });
  }

  private applySitelenPonaTransformLayer(nodes: Text[]): void {
    this.sitelenPonaReplacementCount = 0;
    this.sitelenPonaWordTokenCount = 0;

    nodes.forEach((node) => {
      const source = this.originalTextMap.get(node);
      if (typeof source === 'string') {
        const result = toSitelenPonaWithStats(source);
        this.sitelenPonaReplacementCount += result.replacedTokens;
        this.sitelenPonaWordTokenCount += result.wordTokens;
        if (node.nodeValue !== result.text) {
          this.setTextNodeValue(node, result.text);
        }
      }
    });
  }

  private setTextNodeValue(node: Text, value: string): void {
    this.selfMutatedNodes.add(node);
    node.nodeValue = value;
  }

  private syncTextNodesWithOriginals(nodes: Text[], overwriteExisting: boolean): void {
    this.togglableSet = new Set(nodes);

    nodes.forEach((node) => {
      const current = node.nodeValue ?? '';

      if (!this.originalTextMap.has(node) || overwriteExisting) {
        this.originalTextMap.set(node, current);
      }
    });
  }

  private updateLayerAvailability(): void {
    this.disabledLayers.clear();

    this.sitelenPonaFontReady = false;
    this.sitelenPonaWarning = undefined;

    if (this.config.sitelenPona.enabled) {
      this.sitelenPonaFontReady = isSitelenPonaFontReady(this.config.sitelenPona.fontFamily);

      if (!this.sitelenPonaFontReady && this.config.sitelenPona.renderStrategy === 'font-only') {
        this.disabledLayers.add('sitelen-pona');
        this.sitelenPonaWarning =
          'sitelen-pona disabled: nasin-sitelen-pu font is not detected. Configure sitelenPona.fontCssUrl or load font manually.';
        this.warnDebug(this.sitelenPonaWarning);
      } else if (this.config.sitelenPona.renderStrategy === 'font-only') {
        this.sitelenPonaWarning =
          'sitelen-pona font-only mode applies styling and ligatures, but may not fully convert latin text into sitelen pona glyphs.';
        this.warnDebug(this.sitelenPonaWarning);
      } else if (this.config.sitelenPona.renderStrategy === 'transform') {
        this.sitelenPonaWarning =
          'sitelen-pona transform mode is active with MVP subset coverage. Unmapped tokens stay in latin.';
        this.warnDebug(this.sitelenPonaWarning);
      }
    }

    this.availableLayers = this.config.layers.filter((layer) => !this.disabledLayers.has(layer));

    if (!this.availableLayers.includes('latin')) {
      this.availableLayers.unshift('latin');
    }

    if (this.toggle) {
      this.toggle.setDisabledLayers(Array.from(this.disabledLayers));
    }
  }

  private isLayerEnabled(layer: SitelenLayer): boolean {
    return this.availableLayers.includes(layer);
  }

  private resolveToggleMountMode(): 'floating' | 'inline' {
    const mode = this.config.toggleMode;
    if (mode === 'floating') {
      return 'floating';
    }

    if (mode === 'inline') {
      return this.toggleMount ? 'inline' : 'floating';
    }

    return this.toggleMount ? 'inline' : 'floating';
  }

  private isEmojiExcludedNode(node: Text): boolean {
    if (this.config.emojiExcludeSelectors.length === 0) {
      return false;
    }

    const element = node.parentElement;
    if (!element) {
      return false;
    }

    return this.config.emojiExcludeSelectors.some((selector) => {
      try {
        return Boolean(element.closest(selector));
      } catch {
        return false;
      }
    });
  }

  private updateEmojiCoverageStats(nodes: Text[]): void {
    let replacedTokens = 0;
    let wordTokens = 0;

    nodes.forEach((node) => {
      if (this.isEmojiExcludedNode(node)) {
        return;
      }

      const source = this.originalTextMap.get(node);
      if (typeof source !== 'string') {
        return;
      }

      const stats = toSitelenEmojiWithStats(source);
      replacedTokens += stats.replacedTokens;
      wordTokens += stats.wordTokens;
    });

    this.emojiReplacementCount = replacedTokens;
    this.emojiWordTokenCount = wordTokens;
  }

  private updateSitelenPonaCoverageStats(nodes: Text[]): void {
    let replacedTokens = 0;
    let wordTokens = 0;

    nodes.forEach((node) => {
      const source = this.originalTextMap.get(node);
      if (typeof source !== 'string') {
        return;
      }

      const stats = toSitelenPonaWithStats(source);
      replacedTokens += stats.replacedTokens;
      wordTokens += stats.wordTokens;
    });

    this.sitelenPonaReplacementCount = replacedTokens;
    this.sitelenPonaWordTokenCount = wordTokens;
  }

  private startObserving(): void {
    if (!this.container || this.observer) {
      return;
    }

    this.observer = new MutationObserver((records) => this.onMutations(records));

    this.observer.observe(this.container, {
      subtree: true,
      characterData: true,
      childList: true,
      attributes: this.config.mutationObserver.observeAttributes,
      attributeFilter: this.config.mutationObserver.attributeFilter
    });
  }

  private onMutations(records: MutationRecord[]): void {
    if (!this.container) {
      return;
    }

    let relevant = false;

    records.forEach((record) => {
      if (this.shouldIgnoreMutation(record)) {
        return;
      }

      relevant = true;
      this.observerStats.mutationsObserved += 1;
      this.observerStats.lastMutationAt = new Date().toISOString();

      if (record.type === 'childList') {
        if (record.removedNodes.length > 0) {
          this.requiresFullRefreshFromMutations = true;
        }

        record.addedNodes.forEach((node) => this.queuedMutationRoots.add(node));

        if (this.queuedMutationRoots.size > this.config.mutationObserver.maxBatchNodes) {
          this.requiresFullRefreshFromMutations = true;
        }
      }

      if (record.type === 'characterData') {
        this.queuedMutationRoots.add(record.target);
      }

      if (record.type === 'attributes') {
        this.queuedMutationRoots.add(record.target);
      }
    });

    if (!relevant) {
      return;
    }

    this.scheduleMutationFlush();
    this.scheduleDiagnosticsRefresh();
  }

  private shouldIgnoreMutation(record: MutationRecord): boolean {
    if (this.isApplyingLayer) {
      return true;
    }

    const target = record.target;
    if (!this.container) {
      return true;
    }

    if (this.isInsidePluginUi(target)) {
      return true;
    }

    if (record.type === 'characterData' && this.selfMutatedNodes.has(target)) {
      this.selfMutatedNodes.delete(target);
      return true;
    }

    if (!this.container.contains(target)) {
      return true;
    }

    return false;
  }

  private isInsidePluginUi(node: Node): boolean {
    if (node instanceof Element) {
      return Boolean(node.closest(PLUGIN_UI_SELECTOR));
    }

    return Boolean(node.parentElement?.closest(PLUGIN_UI_SELECTOR));
  }

  private scheduleMutationFlush(): void {
    if (this.mutationFlushScheduled) {
      return;
    }

    this.mutationFlushScheduled = true;
    window.requestAnimationFrame(() => {
      this.mutationFlushScheduled = false;
      this.flushMutationBatch();
    });
  }

  private flushMutationBatch(): void {
    if (!this.container) {
      this.queuedMutationRoots.clear();
      return;
    }

    this.observerStats.batchesProcessed += 1;

    if (this.requiresFullRefreshFromMutations || !this.config.mutationObserver.incremental) {
      this.requiresFullRefreshFromMutations = false;
      this.queuedMutationRoots.clear();
      return;
    }

    const roots = Array.from(this.queuedMutationRoots);
    this.queuedMutationRoots.clear();

    if (roots.length === 0) {
      return;
    }

    this.applyIncrementalMutationUpdates(roots);
  }

  private applyIncrementalMutationUpdates(roots: Node[]): void {
    if (!this.container) {
      return;
    }

    const newNodes = new Set<Text>();

    roots.forEach((root) => {
      if (root instanceof Text) {
        if (root.isConnected && isTextNodeAllowed(root, this.config.excludeSelectors) && this.container?.contains(root)) {
          newNodes.add(root);
        }

        return;
      }

      if (root instanceof Element || root instanceof DocumentFragment) {
        const collection = collectTextNodesInSubtree(root, this.config.excludeSelectors);
        collection.textNodes.forEach((node) => {
          if (this.container?.contains(node)) {
            newNodes.add(node);
          }
        });
      }
    });

    this.textNodes = this.textNodes.filter((node) => node.isConnected && this.container?.contains(node));

    let updatedCount = 0;
    newNodes.forEach((node) => {
      if (!this.togglableSet.has(node)) {
        this.textNodes.push(node);
        this.togglableSet.add(node);
      }

      const latest = node.nodeValue ?? '';
      this.originalTextMap.set(node, latest);
      updatedCount += 1;
    });

    if (this.currentLayer === 'sitelen-emoji' && this.eligible && updatedCount > 0) {
      this.isApplyingLayer = true;
      try {
        newNodes.forEach((node) => {
          if (this.isEmojiExcludedNode(node)) {
            return;
          }

          const source = this.originalTextMap.get(node);
          if (typeof source === 'string') {
            const result = toSitelenEmojiWithStats(source);
            this.emojiReplacementCount += result.replacedTokens;
            this.emojiWordTokenCount += result.wordTokens;
            const transformed = result.text;
            if (node.nodeValue !== transformed) {
              this.setTextNodeValue(node, transformed);
            }
          }
        });
      } finally {
        this.isApplyingLayer = false;
      }
    }

    if (
      this.currentLayer === 'sitelen-pona' &&
      this.config.sitelenPona.renderStrategy === 'transform' &&
      this.eligible &&
      updatedCount > 0
    ) {
      this.isApplyingLayer = true;
      try {
        newNodes.forEach((node) => {
          const source = this.originalTextMap.get(node);
          if (typeof source !== 'string') {
            return;
          }

          const result = toSitelenPonaWithStats(source);
          this.sitelenPonaReplacementCount += result.replacedTokens;
          this.sitelenPonaWordTokenCount += result.wordTokens;
          if (node.nodeValue !== result.text) {
            this.setTextNodeValue(node, result.text);
          }
        });
      } finally {
        this.isApplyingLayer = false;
      }
    }

    this.observerStats.incrementalUpdates += updatedCount;
    this.lastUpdatedAt = new Date().toISOString();
    this.updateEmojiCoverageStats(this.textNodes);
    if (this.config.sitelenPona.renderStrategy === 'transform') {
      this.updateSitelenPonaCoverageStats(this.textNodes);
    }

    const diagnostics = this.getDiagnostics();
    this.config.onDiagnostics?.(diagnostics);
    this.debugOverlay?.update(diagnostics);
  }

  private scheduleDiagnosticsRefresh(): void {
    if (this.diagnosticsTimer !== null) {
      window.clearTimeout(this.diagnosticsTimer);
    }

    this.diagnosticsTimer = window.setTimeout(() => {
      this.diagnosticsTimer = null;
      this.refresh();
    }, this.config.mutationObserver.debounceMs);
  }

  private stopObserving(): void {
    if (this.diagnosticsTimer !== null) {
      window.clearTimeout(this.diagnosticsTimer);
      this.diagnosticsTimer = null;
    }

    this.queuedMutationRoots.clear();
    this.requiresFullRefreshFromMutations = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private startNavigationObservation(): void {
    const handleNavigation = (): void => {
      if (this.navigationTimer !== null) {
        window.clearTimeout(this.navigationTimer);
      }

      this.navigationTimer = window.setTimeout(() => {
        this.navigationTimer = null;
        this.refresh();
      }, this.config.spaNavigation.refreshDelayMs);
    };

    this.popStateListener = handleNavigation;
    this.hashChangeListener = handleNavigation;

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);

    if (this.config.spaNavigation.patchHistory) {
      installHistoryPatch();
      this.historyListener = handleNavigation;
      historyListeners.add(handleNavigation);
    }
  }

  private stopNavigationObservation(): void {
    if (this.navigationTimer !== null) {
      window.clearTimeout(this.navigationTimer);
      this.navigationTimer = null;
    }

    if (this.popStateListener) {
      window.removeEventListener('popstate', this.popStateListener);
      this.popStateListener = null;
    }

    if (this.hashChangeListener) {
      window.removeEventListener('hashchange', this.hashChangeListener);
      this.hashChangeListener = null;
    }

    if (this.historyListener) {
      historyListeners.delete(this.historyListener);
      this.historyListener = null;
      uninstallHistoryPatchIfUnused();
    }
  }

  private warnDebug(message: string): void {
    if (!this.config.debug) {
      return;
    }

    // eslint-disable-next-line no-console
    console.warn(`[sitelen-layer-plugin] ${message}`);
  }
}
