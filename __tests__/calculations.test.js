import {
  calculateHoldingValue,
  calculateCostBasis,
  calculateGainLoss,
  calculateGainLossPercent,
  calculatePortfolioValue,
  calculateAllocation,
  calculateDiversificationScore,
  calculateDayChange,
  calculateDayChangePercent,
} from '../shared/calculations';

test('basic holding calculations', () => {
  expect(calculateHoldingValue(2, 10, 5)).toBe(20);
  expect(calculateCostBasis(2, 5)).toBe(10);
  expect(calculateGainLoss(2, 5, 10)).toBe(10);
  expect(calculateGainLossPercent(5, 10)).toBeCloseTo(100);
});

test('portfolio value and allocation', () => {
  const holdings = [
    { id: 'a', quantity: 2, currentPrice: 10, purchasePrice: 5 },
    { id: 'b', quantity: 1, currentPrice: 20, purchasePrice: 20 },
  ];
  const val = calculatePortfolioValue(holdings);
  expect(val).toBe(40);
  const alloc = calculateAllocation(holdings);
  expect(alloc.length).toBe(2);
  const totalAlloc = alloc.reduce((s, a) => s + a.allocationPercent, 0);
  expect(totalAlloc).toBeCloseTo(100, 6);
});

test('diversification score and day change', () => {
  const holdings = [
    { id: 'a', quantity: 1, currentPrice: 100, purchasePrice: 50 },
    { id: 'b', quantity: 1, currentPrice: 100, purchasePrice: 50 },
    { id: 'c', quantity: 1, currentPrice: 100, purchasePrice: 50 },
  ];
  const score = calculateDiversificationScore(holdings);
  expect(score).toBeGreaterThanOrEqual(0);

  expect(calculateDayChange(2, 9, 10)).toBe(2);
  expect(calculateDayChangePercent(10, 11)).toBeCloseTo(10);
});
