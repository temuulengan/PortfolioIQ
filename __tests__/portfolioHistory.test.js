const { mergePortfolioHistory } = require('../shared/calculations');

const iso = (d) => `${d}T00:00:00.000Z`;

test('aligns series by date, not by array position', () => {
  // GOOG has one fewer bar (listed later / exchange holiday). Index-based
  // pairing would multiply Jan 3 GOOG prices against Jan 2 AAPL prices.
  const merged = mergePortfolioHistory([
    { quantity: 1, dates: [iso('2026-01-02'), iso('2026-01-03')], prices: [100, 110] },
    { quantity: 2, dates: [iso('2026-01-03')], prices: [50] },
  ]);

  expect(merged).toHaveLength(1);
  expect(merged[0].date.toISOString().slice(0, 10)).toBe('2026-01-03');
  expect(merged[0].totalValue).toBe(110 * 1 + 50 * 2);
});

test('drops null and non-finite closes rather than treating them as zero', () => {
  const merged = mergePortfolioHistory([
    { quantity: 1, dates: [iso('2026-01-02'), iso('2026-01-03')], prices: [100, null] },
    { quantity: 1, dates: [iso('2026-01-02'), iso('2026-01-03')], prices: [10, 20] },
  ]);

  expect(merged).toHaveLength(1);
  expect(merged[0].totalValue).toBe(110);
});

test('returns points in ascending date order', () => {
  const merged = mergePortfolioHistory([
    {
      quantity: 1,
      dates: [iso('2026-01-05'), iso('2026-01-02'), iso('2026-01-03')],
      prices: [30, 10, 20],
    },
  ]);

  expect(merged.map((p) => p.totalValue)).toEqual([10, 20, 30]);
});

test('handles no overlap and empty input', () => {
  expect(
    mergePortfolioHistory([
      { quantity: 1, dates: [iso('2026-01-02')], prices: [1] },
      { quantity: 1, dates: [iso('2026-02-02')], prices: [1] },
    ])
  ).toEqual([]);
  expect(mergePortfolioHistory([])).toEqual([]);
  expect(mergePortfolioHistory(null)).toEqual([]);
});
