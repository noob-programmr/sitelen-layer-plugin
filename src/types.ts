export type SitelenLayer = 'latin' | 'sitelen-pona' | 'sitelen-emoji';

export type LayerModeSource =
  | 'default'
  | 'storage'
  | 'forced-latin-ineligible'
  | 'fallback-font-missing'
  | 'profile';

export interface Diagnostics {
  totalTokens: number;
  recognizedTokens: number;
  score: number;
  pass: boolean;
}

export interface ObserverStats {
  mutationsObserved: number;
  batchesProcessed: number;
  incrementalUpdates: number;
  fullRefreshes: number;
  lastMutationAt?: string;
}

export interface PluginDiagnostics extends Diagnostics {
  threshold: number;
  eligible: boolean;
  activeLayer: SitelenLayer;
  containerInfo: string;
  modeSource: LayerModeSource;
  availableLayers: SitelenLayer[];
  ignoredCandidates: number;
  sitelenPonaFontReady: boolean;
  sitelenPonaWarning?: string;
  profileId?: string | null;
  lastUpdatedAt: string;
  observerStats: ObserverStats;
}

export interface DetectorResult extends Diagnostics {
  tokens: string[];
}

export interface SitelenPonaConfig {
  enabled?: boolean;
  fontFamily?: string;
  fontCssUrl?: string;
  applyToRoot?: boolean;
  className?: string;
  renderStrategy?: 'font-only' | 'transform';
}

export interface MutationObserverConfig {
  enabled?: boolean;
  debounceMs?: number;
  incremental?: boolean;
  observeAttributes?: boolean;
  attributeFilter?: string[];
  maxBatchNodes?: number;
}

export interface SpaNavigationConfig {
  enabled?: boolean;
  patchHistory?: boolean;
  refreshDelayMs?: number;
}

export interface SitelenLayerPluginConfig {
  container?: string | Element;
  threshold?: number;
  layers?: SitelenLayer[];
  defaultLayer?: SitelenLayer;
  showToggle?: boolean;
  toggleMount?: string | Element;
  excludeSelectors?: string[];
  debug?: boolean;
  debugOverlay?: boolean;
  diagnosticsOverlay?: boolean;
  storageKey?: string;
  requireDominantTokiPona?: boolean;

  observeMutations?: boolean;
  mutationDebounceMs?: number;
  mutationObserver?: MutationObserverConfig;

  observeNavigation?: boolean;
  spaNavigation?: SpaNavigationConfig;

  sitelenPona?: SitelenPonaConfig;

  profileId?: string | null;
  onProfileMatch?: (profileId: string | null) => void;
  onEligibilityChange?: (eligible: boolean, diagnostics: PluginDiagnostics) => void;
  onDiagnostics?: (diagnostics: PluginDiagnostics) => void;
  onLayerChange?: (layer: SitelenLayer, diagnostics: PluginDiagnostics) => void;
}

export interface SitelenLayerProfileMatch {
  hostname?: string | RegExp;
  pathnamePrefix?: string;
  pathnameRegex?: RegExp;
  lang?: string;
}

export interface SitelenLayerProfile {
  id: string;
  match?: SitelenLayerProfileMatch;
  config: Partial<SitelenLayerPluginConfig>;
  priority?: number;
  enabled?: boolean;
}

export interface ProfileResolverOptions {
  location?: Location;
  lang?: string;
}

export interface ResolvedProfile {
  profile: SitelenLayerProfile;
  config: SitelenLayerPluginConfig;
}

export interface CreateFromProfilesOptions extends ProfileResolverOptions {
  baseConfig?: SitelenLayerPluginConfig;
}
