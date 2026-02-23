import { describe, expect, it } from 'vitest';
import { toSitelenEmoji } from './emoji';

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
});
