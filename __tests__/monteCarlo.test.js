import runMonteCarlo from '../services/simulations/monteCarlo';

test('deterministic zero-volatility monte carlo', () => {
  const assets = [{ S0: 100, quantity: 1, muAnnual: 0, sigmaAnnual: 0 }];
  const res = runMonteCarlo({ assets, N: 20, steps: 5, seed: 1234, sampleCount: 5 });
  // With zero volatility, all final values should equal initial
  expect(res.p50).toBe(100);
  expect(res.p10).toBe(100);
  expect(res.p90).toBe(100);
  expect(res.finalValues.every(v => v === 100)).toBe(true);
});
