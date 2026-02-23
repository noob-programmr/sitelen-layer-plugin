import { TOKI_PONA_LEXICON } from './tokiPonaLexicon';
import { tokenizeForDetection } from './tokenizer';
import type { DetectorResult } from './types';

export interface DetectorConfig {
  threshold: number;
}

function isSignalToken(token: string): boolean {
  if (token.length > 1) {
    return true;
  }

  // Keep one-letter toki pona particles, drop arbitrary one-letter noise.
  return TOKI_PONA_LEXICON.has(token);
}

export function analyzeTokiPonaDominance(text: string, config: DetectorConfig): DetectorResult {
  const allTokens = tokenizeForDetection(text);
  const tokens = allTokens.filter(isSignalToken);
  const totalTokens = tokens.length;

  if (totalTokens === 0) {
    return {
      tokens,
      totalTokens,
      recognizedTokens: 0,
      score: 0,
      pass: false
    };
  }

  const recognizedTokens = tokens.reduce((count, token) => {
    return count + (TOKI_PONA_LEXICON.has(token) ? 1 : 0);
  }, 0);

  const score = recognizedTokens / totalTokens;

  return {
    tokens,
    totalTokens,
    recognizedTokens,
    score,
    pass: score >= config.threshold
  };
}
