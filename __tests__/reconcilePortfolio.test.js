jest.mock('../services/api/stockAPI', () => ({
  validateStockSymbol: jest.fn(),
  searchStocks: jest.fn(),
}));

const { validateStockSymbol, searchStocks } = require('../services/api/stockAPI');
const { reconcilePortfolio } = require('../src/services/reconcilePortfolio');

beforeEach(() => {
  jest.clearAllMocks();
  validateStockSymbol.mockImplementation(async (symbol) => ['AAPL', 'MSFT'].includes(symbol));
  searchStocks.mockImplementation(async (q) =>
    q === 'APPL' ? [{ symbol: 'AAPL', name: 'Apple Inc.' }] : []
  );
});

const rows = [
  { ticker: 'AAPL', shares: 10 },
  { ticker: 'APPL', shares: 5 },   // typo — resolvable by search
  { ticker: '', shares: 1 },        // empty
  { ticker: 'MSFT', shares: 2 },
  { ticker: 'ZZZZQ', shares: 3 },   // no match
];

test('carries the parsed-row index so overrides address the right row', async () => {
  const report = await reconcilePortfolio(rows);

  // needsReview holds rows 1, 2 and 4 — their positions in the review list
  // (0,1,2) must not be confused with their positions in the file.
  expect(report.needsReview.map((r) => r.rowIndex)).toEqual([1, 2, 4]);
  expect(report.matched.map((r) => r.rowIndex)).toEqual([0, 3]);
});

test('splits matched from needs-review and suggests a fix for typos', async () => {
  const report = await reconcilePortfolio(rows);

  expect(report.matched.map((r) => r.resolved)).toEqual(['AAPL', 'MSFT']);
  expect(report.needsReview.find((r) => r.rowIndex === 1).suggestion.symbol).toBe('AAPL');
  expect(report.needsReview.find((r) => r.rowIndex === 2).reason).toBe('Empty ticker');
  expect(report.needsReview.find((r) => r.rowIndex === 4).reason).toBe('No match found');
});

test('byRowIndex resolves matched rows and leaves the rest open', async () => {
  const report = await reconcilePortfolio(rows);
  expect(report.byRowIndex).toEqual({ 0: 'AAPL', 1: null, 2: null, 3: 'MSFT', 4: null });
});

test('validates rows concurrently rather than one round trip at a time', async () => {
  let active = 0;
  let peak = 0;
  validateStockSymbol.mockImplementation(async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 5));
    active -= 1;
    return true;
  });

  await reconcilePortfolio(Array.from({ length: 12 }, (_, i) => ({ ticker: `SYM${i}` })));
  expect(peak).toBeGreaterThan(1);
});

test('an empty ticker never hits the network', async () => {
  await reconcilePortfolio([{ ticker: '   ' }]);
  expect(validateStockSymbol).not.toHaveBeenCalled();
  expect(searchStocks).not.toHaveBeenCalled();
});
