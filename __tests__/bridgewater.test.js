jest.mock('../services/api/stockAPI', () => ({
  getHistoricalPrices: jest.fn((symbol, period, interval) => {
    // return simple synthetic history with matching dates
    const dates = [];
    const prices = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(2020, 0, i + 1).toISOString().slice(0, 10);
      dates.push(d);
      prices.push(100 + i + (symbol === 'B' ? 0.5 : 0));
    }
    return Promise.resolve({ dates, prices });
  }),
}));

import runBridgewaterAnalysis from '../shared/bridgewaterAnalysis';

test('bridgewater analysis basic run with synthetic data', async () => {
  const holdings = [
    { symbol: 'A', quantity: 1, currentPrice: 150 },
    { symbol: 'B', quantity: 1, currentPrice: 120 },
  ];
  const res = await runBridgewaterAnalysis(holdings, { lookbackDays: 60, minDataPoints: 10 });
  expect(res.success).toBe(true);
  expect(res.assets.length).toBeGreaterThanOrEqual(2);
  expect(typeof res.annualizedVolatilityCurrent).toBe('number');
  expect(res.diversificationRatioCurrent).toBeGreaterThanOrEqual(0);
});
