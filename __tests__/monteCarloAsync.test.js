const { runMonteCarlo, runMonteCarloAsync } = require('../services/simulations/monteCarlo');

const asset = (over = {}) => ({ S0: 100, quantity: 1, muAnnual: 0, sigmaAnnual: 0, ...over });

describe('timestep scaling', () => {
  test('a drift-only portfolio compounds to the same value regardless of step count', () => {
    // 10% annual drift, no volatility, one year: exp(0.10) * 100
    const expected = 100 * Math.exp(0.1);

    const daily = runMonteCarlo({
      assets: [asset({ muAnnual: 10 })], N: 5, steps: 252, horizonYears: 1, seed: 7,
    });
    const coarse = runMonteCarlo({
      assets: [asset({ muAnnual: 10 })], N: 5, steps: 52, horizonYears: 1, seed: 7,
    });

    expect(daily.p50).toBeCloseTo(expected, 6);
    expect(coarse.p50).toBeCloseTo(expected, 6);
  });

  test('long horizons cap the step count instead of scaling work with it', () => {
    const res = runMonteCarlo({
      assets: [asset({ muAnnual: 10 })], N: 5, steps: 2520, horizonYears: 10, seed: 7,
    });

    // Ten years of drift, but not ten years of daily steps to compute it
    expect(res.steps).toBe(252);
    expect(res.p50).toBeCloseTo(100 * Math.exp(1.0), 4);
  });

  test('callers passing only steps keep the old trading-day meaning', () => {
    const res = runMonteCarlo({ assets: [asset({ muAnnual: 0 })], N: 5, steps: 5, seed: 1234 });
    expect(res.steps).toBe(5);
    expect(res.finalValues.every((v) => v === 100)).toBe(true);
  });
});

describe('runMonteCarloAsync', () => {
  test('produces the same result as the synchronous run for a given seed', async () => {
    const options = {
      assets: [asset({ muAnnual: 8, sigmaAnnual: 20 }), asset({ S0: 50, muAnnual: 5, sigmaAnnual: 15 })],
      N: 40, steps: 60, horizonYears: 1, seed: 99, sampleCount: 5,
    };

    const sync = runMonteCarlo(options);
    const async = await runMonteCarloAsync(options);

    expect(async.p50).toBeCloseTo(sync.p50, 10);
    expect(async.finalValues).toHaveLength(sync.finalValues.length);
    expect(async.steps).toBe(sync.steps);
  });

  test('reports progress from start to finish', async () => {
    const seen = [];
    await runMonteCarloAsync(
      { assets: [asset({ sigmaAnnual: 20 })], N: 64, steps: 30, seed: 3 },
      { onProgress: (p) => seen.push(p), sliceMs: 1 }
    );

    expect(seen.length).toBeGreaterThan(1);
    expect(seen[seen.length - 1]).toBe(1);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen); // monotonic
  });

  test('yields between batches so the event loop keeps running', async () => {
    let ticked = false;
    const timer = setTimeout(() => { ticked = true; }, 0);

    await runMonteCarloAsync(
      { assets: [asset({ sigmaAnnual: 20 })], N: 200, steps: 50, seed: 5 },
      { sliceMs: 1 }
    );

    clearTimeout(timer);
    // A blocking implementation would still be inside the loop when this ran
    expect(ticked).toBe(true);
  });

  test('a cancelled run resolves to null and stops working', async () => {
    const token = { cancelled: false };
    const promise = runMonteCarloAsync(
      { assets: [asset({ sigmaAnnual: 20 })], N: 5000, steps: 252, seed: 11 },
      { token, sliceMs: 1, onProgress: () => { token.cancelled = true; } }
    );

    await expect(promise).resolves.toBeNull();
  });
});
