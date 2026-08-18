const { holdingsSignature, mapWithConcurrency } = require('../shared/helpers');

describe('holdingsSignature', () => {
  test('is stable across new array identities with the same positions', () => {
    const a = [{ symbol: 'AAPL', quantity: 10, currentPrice: 100 }];
    const b = [{ symbol: 'AAPL', quantity: 10, currentPrice: 187.4 }]; // price moved
    expect(holdingsSignature(a)).toBe(holdingsSignature(b));
  });

  test('ignores ordering', () => {
    const a = [{ symbol: 'AAPL', quantity: 1 }, { symbol: 'MSFT', quantity: 2 }];
    const b = [{ symbol: 'MSFT', quantity: 2 }, { symbol: 'AAPL', quantity: 1 }];
    expect(holdingsSignature(a)).toBe(holdingsSignature(b));
  });

  test('changes when a position changes', () => {
    const a = [{ symbol: 'AAPL', quantity: 10 }];
    expect(holdingsSignature(a)).not.toBe(holdingsSignature([{ symbol: 'AAPL', quantity: 11 }]));
    expect(holdingsSignature(a)).not.toBe(holdingsSignature([{ symbol: 'MSFT', quantity: 10 }]));
  });

  test('handles empty and invalid input', () => {
    expect(holdingsSignature([])).toBe('');
    expect(holdingsSignature(null)).toBe('');
  });
});

describe('mapWithConcurrency', () => {
  test('preserves input order', async () => {
    const out = await mapWithConcurrency([5, 1, 3], async (n) => {
      await new Promise((r) => setTimeout(r, n));
      return n * 2;
    }, 2);
    expect(out).toEqual([10, 2, 6]);
  });

  test('never exceeds the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 2));
      active -= 1;
    }, 4);
    expect(peak).toBeLessThanOrEqual(4);
  });

  test('returns [] for empty input without hanging', async () => {
    await expect(mapWithConcurrency([], async (x) => x, 4)).resolves.toEqual([]);
  });
});
