import { describe, expect, it } from 'vitest';
import { analyzeTokiPonaDominance } from './detector';

describe('detector', () => {
  it('passes clearly toki pona text', () => {
    const result = analyzeTokiPonaDominance('toki pona li pona tawa mi. mi moku e kili.', { threshold: 0.7 });
    expect(result.pass).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });

  it('fails clearly non toki pona text', () => {
    const result = analyzeTokiPonaDominance('This is a regular English paragraph with many unrelated words.', {
      threshold: 0.7
    });

    expect(result.pass).toBe(false);
    expect(result.score).toBeLessThan(0.7);
  });

  it('handles punctuation, numbers and urls without unstable output', () => {
    const input = 'toki pona li pona! 1234 https://example.com jan li toki.';
    const first = analyzeTokiPonaDominance(input, { threshold: 0.7 });
    const second = analyzeTokiPonaDominance(input, { threshold: 0.7 });

    expect(first).toEqual(second);
    expect(first.totalTokens).toBeGreaterThan(0);
  });

  it('handles threshold boundary at 0.7', () => {
    const passCase = analyzeTokiPonaDominance('toki pona li pona tawa jan', { threshold: 0.7 });
    expect(passCase.score).toBeGreaterThanOrEqual(0.7);
    expect(passCase.pass).toBe(true);

    const failCase = analyzeTokiPonaDominance('toki pona li okay english words now', { threshold: 0.7 });
    expect(failCase.score).toBeLessThan(0.7);
    expect(failCase.pass).toBe(false);
  });

  it('returns complete diagnostics shape', () => {
    const result = analyzeTokiPonaDominance('toki pona li pona', { threshold: 0.7 });
    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.recognizedTokens).toBeGreaterThan(0);
    expect(typeof result.score).toBe('number');
    expect(typeof result.pass).toBe('boolean');
  });
});
