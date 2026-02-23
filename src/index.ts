import { SitelenLayerPlugin } from './plugin';
import { getEmojiMapping, setEmojiMapping } from './emoji/mappingSource';
import {
  createSitelenLayerPluginFromProfiles,
  resolveProfile,
  resolveProfileConfig
} from './profiles';
import type { SitelenLayerPluginConfig } from './types';

export function createSitelenLayerPlugin(config: SitelenLayerPluginConfig = {}): SitelenLayerPlugin {
  return new SitelenLayerPlugin(config);
}

export {
  SitelenLayerPlugin,
  getEmojiMapping,
  setEmojiMapping,
  createSitelenLayerPluginFromProfiles,
  resolveProfile,
  resolveProfileConfig
};
export type {
  CreateFromProfilesOptions,
  Diagnostics,
  MutationObserverConfig,
  ObserverStats,
  PluginDiagnostics,
  ProfileResolverOptions,
  ResolvedProfile,
  SitelenLayer,
  SitelenLayerPluginConfig,
  SitelenLayerProfile,
  SitelenLayerProfileMatch,
  SitelenPonaConfig,
  SpaNavigationConfig
} from './types';
export type { EmojiEntry, NormalizedEmojiMapping } from './emoji/normalizeEmojiMapping';
