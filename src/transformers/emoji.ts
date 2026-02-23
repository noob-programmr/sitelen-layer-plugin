import { getEmojiMapping } from '../emoji/mappingSource';
import { isWordToken, tokenizeForReplacement } from '../tokenizer';

export function toSitelenEmoji(text: string): string {
  const mapping = getEmojiMapping();
  const parts = tokenizeForReplacement(text);

  return parts
    .map((part) => {
      if (isWordToken(part)) {
        const normalized = part.toLowerCase();
        return mapping.wordMap[normalized] ?? part;
      }

      if (part.length === 1 && mapping.punctuationMap[part]) {
        return mapping.punctuationMap[part];
      }

      return part;
    })
    .join('');
}
