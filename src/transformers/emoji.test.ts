import { describe, expect, it } from 'vitest';
import { toSitelenEmoji, toSitelenEmojiWithStats } from './emoji';

describe('emoji transformer', () => {
  it('replaces known tokens using generated mapping', () => {
    expect(toSitelenEmoji('jan pona')).toContain('👤');
    expect(toSitelenEmoji('jan pona')).toContain('👍');
  });

  it('keeps unknown tokens unchanged', () => {
    expect(toSitelenEmoji('unknownToken pona')).toContain('unknownToken');
  });

  it('preserves punctuation and spaces', () => {
    expect(toSitelenEmoji('jan, pona.')).toBe('👤, 👍➖️');
  });

  it('handles mixed-case words via lowercase normalization', () => {
    expect(toSitelenEmoji('JaN PoNa')).toBe('👤 👍');
  });

  it('reports replacement stats for diagnostics', () => {
    const result = toSitelenEmojiWithStats('jan pona li');
    expect(result.text).toContain('👤');
    expect(result.replacedTokens).toBeGreaterThan(0);
    expect(result.wordTokens).toBe(3);
  });
});
