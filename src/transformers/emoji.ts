import { getEmojiMapping } from '../emoji/mappingSource';
import { isWordToken, tokenizeForReplacement } from '../tokenizer';

export interface EmojiTransformResult {
  text: string;
  replacedTokens: number;
  wordTokens: number;
}

export function toSitelenEmoji(text: string): string {
  return toSitelenEmojiWithStats(text).text;
}

export function toSitelenEmojiWithStats(text: string): EmojiTransformResult {
  const mapping = getEmojiMapping();
  const parts = tokenizeForReplacement(text);
  let replacedTokens = 0;
  let wordTokens = 0;

  const transformed = parts
    .map((part) => {
      if (isWordToken(part)) {
        wordTokens += 1;
        const normalized = part.toLowerCase();
        const replacement = mapping.wordMap[normalized];
        if (replacement && replacement !== part) {
          replacedTokens += 1;
          return replacement;
        }
        return part;
      }

      if (part.length === 1 && mapping.punctuationMap[part]) {
        return mapping.punctuationMap[part];
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
