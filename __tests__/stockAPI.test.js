jest.mock('axios', () => {
  const get = jest.fn();
  return { create: jest.fn(() => ({ get })), __get: get };
});

const axios = require('axios');
const get = axios.__get;
const api = require('../services/api/stockAPI');

const chartResponse = (price, previousClose = price) => ({
  data: { chart: { result: [{ meta: { regularMarketPrice: price, previousClose, currency: 'USD' } }] } },
});

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

beforeEach(() => {
  get.mockReset();
  api.clearStockCache();
});

test('requests are created with a timeout', () => {
  expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({ timeout: expect.any(Number) }));
});

test('repeat quotes inside the TTL are served from cache', async () => {
  get.mockResolvedValue(chartResponse(101, 100));

  await api.getStockPrice('AAPL');
  await api.getStockPrice('AAPL');

  expect(get).toHaveBeenCalledTimes(1);
});

test('force bypasses the cache', async () => {
  get.mockResolvedValue(chartResponse(101, 100));

  await api.getStockPrice('AAPL');
  await api.getStockPrice('AAPL', { force: true });

  expect(get).toHaveBeenCalledTimes(2);
});

test('retries a rate-limited request and recovers', async () => {
  get.mockRejectedValueOnce(httpError(429)).mockResolvedValueOnce(chartResponse(50, 40));

  const quote = await api.getStockPrice('MSFT');

  expect(get).toHaveBeenCalledTimes(2);
  expect(quote.price).toBe(50);
  expect(quote.changePercent).toBeCloseTo(25);
});

test('does not retry a 404', async () => {
  get.mockRejectedValue(httpError(404));

  await expect(api.getStockPrice('NOPE')).rejects.toThrow('Failed to fetch price for NOPE');
  expect(get).toHaveBeenCalledTimes(1);
});

test('a missing price is an error, not a NaN quote', async () => {
  get.mockResolvedValue({ data: { chart: { result: [{ meta: {} }] } } });
  await expect(api.getStockPrice('EMPTY')).rejects.toThrow();
});

test('batch fetching caps concurrency and drops only the failures', async () => {
  let active = 0;
  let peak = 0;
  get.mockImplementation(async (url) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 3));
    active -= 1;
    if (url.includes('BAD')) throw httpError(404);
    return chartResponse(10, 10);
  });

  const symbols = [...Array.from({ length: 15 }, (_, i) => `S${i}`), 'BAD'];
  const results = await api.getMultipleStockPrices(symbols);

  expect(results).toHaveLength(15);
  expect(peak).toBeLessThanOrEqual(5);
});

test('duplicate symbols are fetched once', async () => {
  get.mockResolvedValue(chartResponse(10, 10));

  const results = await api.getMultipleStockPrices(['AAPL', 'AAPL', 'AAPL']);

  expect(results).toHaveLength(1);
  expect(get).toHaveBeenCalledTimes(1);
});

test('search failures degrade to an empty list', async () => {
  get.mockRejectedValue(httpError(500));
  await expect(api.searchStocks('anything')).resolves.toEqual([]);
});

test('an empty search never hits the network', async () => {
  await expect(api.searchStocks('   ')).resolves.toEqual([]);
  expect(get).not.toHaveBeenCalled();
});
