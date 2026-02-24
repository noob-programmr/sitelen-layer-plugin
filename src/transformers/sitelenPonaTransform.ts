import { isWordToken, tokenizeForReplacement } from '../tokenizer';
import { SITELEN_PONA_MVP_MAPPING } from './sitelenPonaMapping';

export interface SitelenPonaTransformResult {
  text: string;
  replacedTokens: number;
  wordTokens: number;
}

export function toSitelenPona(text: string): string {
  return toSitelenPonaWithStats(text).text;
}

export function toSitelenPonaWithStats(text: string): SitelenPonaTransformResult {
  const parts = tokenizeForReplacement(text);
  let replacedTokens = 0;
  let wordTokens = 0;

  const transformed = parts
    .map((part) => {
      if (!isWordToken(part)) {
        return part;
      }

      wordTokens += 1;
      const normalized = part.toLowerCase();
      const replacement = SITELEN_PONA_MVP_MAPPING[normalized];
      if (replacement) {
        replacedTokens += 1;
        return replacement;
      }

      return part;
    })
    .join('');

  return {
    text: transformed,
    replacedTokens,
    wordTokens
  };
}

