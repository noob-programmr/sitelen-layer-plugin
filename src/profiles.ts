import { SitelenLayerPlugin } from './plugin';
import type {
  CreateFromProfilesOptions,
  ProfileResolverOptions,
  ResolvedProfile,
  SitelenLayerPluginConfig,
  SitelenLayerProfile,
  SitelenLayerProfileMatch
} from './types';

function matchesPattern(value: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return value.toLowerCase() === pattern.toLowerCase();
  }

  return pattern.test(value);
}

function matchesProfile(match: SitelenLayerProfileMatch | undefined, location: Location, lang: string): boolean {
  if (!match) {
    return true;
  }

  if (match.hostname && !matchesPattern(location.hostname, match.hostname)) {
    return false;
  }

  if (match.pathnamePrefix && !location.pathname.startsWith(match.pathnamePrefix)) {
    return false;
  }

  if (match.pathnameRegex && !match.pathnameRegex.test(location.pathname)) {
    return false;
  }

  if (match.lang && !lang.toLowerCase().startsWith(match.lang.toLowerCase())) {
    return false;
  }

  return true;
}

function mergeConfig(
  baseConfig: SitelenLayerPluginConfig,
  profileConfig: Partial<SitelenLayerPluginConfig>
): SitelenLayerPluginConfig {
  return {
    ...baseConfig,
    ...profileConfig,
    sitelenPona: {
      ...(baseConfig.sitelenPona ?? {}),
      ...(profileConfig.sitelenPona ?? {})
    },
    mutationObserver: {
      ...(baseConfig.mutationObserver ?? {}),
      ...(profileConfig.mutationObserver ?? {})
    },
    spaNavigation: {
      ...(baseConfig.spaNavigation ?? {}),
      ...(profileConfig.spaNavigation ?? {})
    }
  };
}

export function resolveProfile(
  profiles: SitelenLayerProfile[],
  options: ProfileResolverOptions = {}
): SitelenLayerProfile | null {
  if (!profiles.length) {
    return null;
  }

  const location = options.location ?? window.location;
  const lang = options.lang ?? document.documentElement.lang ?? '';

  const eligible = profiles
    .filter((profile) => profile.enabled !== false)
    .filter((profile) => matchesProfile(profile.match, location, lang));

  if (!eligible.length) {
    return null;
  }

  return eligible.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0] ?? null;
}

export function resolveProfileConfig(
  profiles: SitelenLayerProfile[],
  options: CreateFromProfilesOptions = {}
): ResolvedProfile | null {
  const baseConfig = options.baseConfig ?? {};
  const matchedProfile = resolveProfile(profiles, options);

  if (!matchedProfile) {
    return null;
  }

  const merged = mergeConfig(baseConfig, matchedProfile.config);
  merged.profileId = matchedProfile.id;

  return {
    profile: matchedProfile,
    config: merged
  };
}

export function createSitelenLayerPluginFromProfiles(
  profiles: SitelenLayerProfile[],
  options: CreateFromProfilesOptions = {}
): SitelenLayerPlugin {
  const baseConfig = options.baseConfig ?? {};
  const resolved = resolveProfileConfig(profiles, options);

  if (resolved) {
    return new SitelenLayerPlugin(resolved.config);
  }

  const fallbackConfig: SitelenLayerPluginConfig = {
    ...baseConfig,
    showToggle: false,
    profileId: null
  };

  return new SitelenLayerPlugin(fallbackConfig);
}
