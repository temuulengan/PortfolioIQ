// Pure JS Monte Carlo simulation service (GBM, optionally correlated)
//
// Performance notes: this runs on the JS thread, which is also the thread that
// draws the UI, so both the amount of work and the way it is scheduled matter.
// The hot loop is N x steps x assets, and at the default 1000 paths x 252 steps
// that is millions of iterations. Two things keep it from freezing the app:
//
//   1. No allocation inside the loop. Everything is a preallocated typed array,
//      and per-path drawdown is tracked incrementally rather than by keeping a
//      full value series for each path.
//   2. runMonteCarloAsync yields to the event loop between batches of paths, so
//      touches, scrolling and navigation still get serviced while it works.
//
// Options:
// - assets: [{ S0, quantity, muAnnual?, sigmaAnnual? }]
// - N: number of paths
// - steps: number of timesteps (e.g., 252)
// - correlated: boolean
// - covDaily: covariance matrix (daily) if correlated
// - dailyMeans / dailyStds: per-asset daily stats (alternative to annual inputs)
// - sampleCount: number of sample paths to retain for plotting

// seedable PRNG (mulberry32)
const mulberry32 = (seed) => {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

const boxMullerWithRng = (rng) => {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const r = Math.sqrt(-2 * Math.log(u1));
  return r * Math.cos(2 * Math.PI * u2);
};

/**
 * Marsaglia polar normals.
 *
 * The dominant cost of this simulation is generating normal draws — one per
 * asset per step, millions of them. Box-Muller spends a Math.cos on every
 * single draw; the polar method trades that for a cheap rejection loop (~21%
 * rejected) and produces *two* normals per log/sqrt pair, so the transcendental
 * work per draw drops by roughly 4x. Spares are carried between calls.
 */
const createNormalSource = (rng) => {
  let spare = 0;
  let hasSpare = false;

  return () => {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }

    let u;
    let v;
    let s;
    do {
      u = rng() * 2 - 1;
      v = rng() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const factor = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * factor;
    hasSpare = true;
    return u * factor;
  };
};

// Gamma sampler (Marsaglia & Tsang) for shape > 0
const gammaSample = (alpha, scale, rng) => {
  if (alpha <= 0) return 0;
  let boost = 1;
  let a = alpha;
  if (a < 1) {
    const u = Math.max(rng(), 1e-12);
    boost = Math.pow(u, 1 / a);
    a += 1;
  }
  const d = a - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    const x = boxMullerWithRng(rng);
    const v = 1 + c * x;
    if (v <= 0) continue;
    const vv = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * vv * scale * boost;
    if (Math.log(u) < 0.5 * x * x + d * (1 - vv + Math.log(vv))) return d * vv * scale * boost;
  }
};

const chi2Sample = (nu, rng) => {
  if (nu <= 0) return 1;
  return gammaSample(nu / 2, 2, rng);
};

const cholesky = (A) => {
  const n = A.length;
  const L = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const val = A[i][i] - sum;
        L[i][j] = val <= 0 ? 0 : Math.sqrt(val);
      } else {
        L[i][j] = L[j][j] > 0 ? (A[i][j] - sum) / L[j][j] : 0;
      }
    }
  }
  return L;
};

const percentile = (sortedOrRaw, p, presorted = false) => {
  if (!sortedOrRaw || !sortedOrRaw.length) return 0;
  const s = presorted ? sortedOrRaw : [...sortedOrRaw].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(s.length - 1, Math.round((p / 100) * (s.length - 1))));
  return s[idx];
};

const MAX_PATHS = 200000;
const MAX_STEPS = 2000;

// Work scales linearly with the number of steps, so a 10-year horizon at daily
// resolution costs 10x a 1-year one. Simulated time is carried by the timestep
// size instead: the horizon stays exact, only path resolution gets coarser.
const MAX_SIM_STEPS = 252;

/**
 * Build a simulation that can be advanced in batches.
 *
 * Splitting "set up" from "run some paths" is what lets the async runner hand
 * the thread back to the UI between batches without restarting anything.
 */
const createSimulation = ({
  assets = [],
  N = 1000,
  steps = 252,
  correlated = false,
  covDaily = null,
  dailyMeans = null,
  dailyStds = null,
  sampleCount = 25,
  seed = null,
  horizonYears = null,
  shrinkageAlpha = 0.1,
  dist = 'normal',
  studentDf = 5,
}) => {
  const nAssets = Array.isArray(assets) ? assets.length : 0;
  if (!nAssets) return null;

  const pathCount = Math.max(0, Math.min(Number(N) || 0, MAX_PATHS));
  const requestedSteps = Math.max(1, Math.min(Number(steps) || 1, MAX_STEPS));

  // Total simulated time. Callers that pass only `steps` are assumed to mean
  // trading days, which is what this service used to hardcode.
  const totalYears = Number.isFinite(Number(horizonYears)) && Number(horizonYears) > 0
    ? Number(horizonYears)
    : requestedSteps / 252;

  const stepCount = Math.min(requestedSteps, MAX_SIM_STEPS);
  const dtYears = totalYears / stepCount;

  const rng = seed != null ? mulberry32(Number(seed) >>> 0) : Math.random;
  const nextNormal = createNormalSource(rng);

  // Per-asset per-step drift and vol (inputs may be percent or decimal)
  const muDaily = new Float64Array(nAssets);
  const sigmaDaily = new Float64Array(nAssets);
  const quantities = new Float64Array(nAssets);
  const startPrices = new Float64Array(nAssets);

  for (let i = 0; i < nAssets; i++) {
    const a = assets[i] || {};
    if (a.muAnnual !== undefined && a.sigmaAnnual !== undefined) {
      let muAnnualVal = Number(a.muAnnual);
      if (!Number.isFinite(muAnnualVal)) muAnnualVal = 0;
      muAnnualVal = Math.max(-40, Math.min(40, muAnnualVal));
      const muAnnualAdjusted = Math.abs(muAnnualVal) > 1 ? muAnnualVal / 100 : muAnnualVal;
      muDaily[i] = muAnnualAdjusted * dtYears;

      let sigmaAnnualVal = Number(a.sigmaAnnual);
      sigmaAnnualVal = Number.isFinite(sigmaAnnualVal) ? sigmaAnnualVal : 0.01;
      const sigmaAnnualAdjusted = Math.abs(sigmaAnnualVal) > 1 ? sigmaAnnualVal / 100 : sigmaAnnualVal;
      sigmaDaily[i] = sigmaAnnualAdjusted * Math.sqrt(dtYears);
    } else if (dailyMeans && dailyStds) {
      // Supplied per trading day — rescale to this simulation's timestep
      const stepsPerDay = dtYears * 252;
      muDaily[i] = (dailyMeans[i] || 0) * stepsPerDay;
      sigmaDaily[i] = (dailyStds[i] || 0) * Math.sqrt(stepsPerDay);
    } else {
      muDaily[i] = 0;
      sigmaDaily[i] = 0.01 * Math.sqrt(dtYears * 252);
    }
    quantities[i] = Number(assets[i]?.quantity) || 1;
    startPrices[i] = Number(assets[i]?.S0) || 0;
  }

  // Hoist the deterministic part of the GBM exponent out of the hot loop
  const driftTerm = new Float64Array(nAssets);
  for (let i = 0; i < nAssets; i++) {
    driftTerm[i] = muDaily[i] - 0.5 * sigmaDaily[i] * sigmaDaily[i];
  }

  // Cholesky factor, flattened to one lower-triangular array: only j <= i is
  // ever non-zero, so the correlated draw does half the multiplications.
  let choleskyFlat = null;
  if (correlated && covDaily && covDaily.length === nAssets) {
    const covScale = dtYears * 252; // daily covariance -> per-step covariance
    const cov = covDaily.map((row) => row.map((value) => value * covScale));
    for (let i = 0; i < nAssets; i++) {
      if (!Number.isFinite(cov[i][i]) || cov[i][i] <= 0) cov[i][i] = (sigmaDaily[i] || 0.001) ** 2;
    }
    const alpha = typeof shrinkageAlpha === 'number' ? Math.max(0, Math.min(1, shrinkageAlpha)) : 0.1;
    if (alpha > 0) {
      let sumVar = 0;
      for (let i = 0; i < nAssets; i++) sumVar += cov[i][i];
      const avgVar = sumVar / nAssets;
      for (let i = 0; i < nAssets; i++) {
        for (let j = 0; j < nAssets; j++) {
          cov[i][j] = (1 - alpha) * cov[i][j] + alpha * (i === j ? avgVar : 0);
        }
      }
    }
    const L = cholesky(cov);
    choleskyFlat = new Float64Array((nAssets * (nAssets + 1)) / 2);
    let k = 0;
    for (let i = 0; i < nAssets; i++) {
      for (let j = 0; j <= i; j++) choleskyFlat[k++] = L[i][j];
    }
  }

  const sampleIdxs = new Set();
  const desiredSamples = Math.min(sampleCount, pathCount);
  while (sampleIdxs.size < desiredSamples && pathCount > 0) {
    sampleIdxs.add(Math.floor(rng() * pathCount));
  }

  let initial = 0;
  for (let i = 0; i < nAssets; i++) initial += startPrices[i] * quantities[i];

  // Reused across every path — no allocation inside the loop
  const S = new Float64Array(nAssets);
  const zRaw = new Float64Array(nAssets);
  const z = new Float64Array(nAssets);

  const allFinal = new Float64Array(pathCount);
  const allMaxDd = new Float64Array(pathCount);
  const samplePaths = [];

  let cursor = 0;

  const runPath = (pathIndex) => {
    for (let i = 0; i < nAssets; i++) S[i] = startPrices[i];

    const keepSeries = sampleIdxs.has(pathIndex);
    // Only sampled paths need their full series retained (for the chart).
    const series = keepSeries ? new Array(stepCount + 1) : null;
    if (series) series[0] = initial;

    let peak = initial;
    let maxDd = 0;
    let pv = initial;

    for (let t = 1; t <= stepCount; t++) {
      for (let i = 0; i < nAssets; i++) zRaw[i] = nextNormal();

      if (choleskyFlat) {
        let k = 0;
        for (let i = 0; i < nAssets; i++) {
          let sum = 0;
          for (let j = 0; j <= i; j++) sum += choleskyFlat[k++] * zRaw[j];
          z[i] = sum;
        }
      } else {
        for (let i = 0; i < nAssets; i++) z[i] = zRaw[i];
      }

      if (dist === 'student') {
        if (choleskyFlat) {
          const v = chi2Sample(studentDf, rng);
          const scale = Math.sqrt(studentDf / Math.max(v, 1e-12));
          for (let i = 0; i < nAssets; i++) z[i] *= scale;
        } else {
          for (let i = 0; i < nAssets; i++) {
            const v = chi2Sample(studentDf, rng);
            z[i] *= Math.sqrt(studentDf / Math.max(v, 1e-12));
          }
        }
      }

      pv = 0;
      for (let i = 0; i < nAssets; i++) {
        const prev = S[i];
        const next = prev * Math.exp(driftTerm[i] + sigmaDaily[i] * z[i]);
        S[i] = Number.isFinite(next) ? next : prev;
        pv += S[i] * quantities[i];
      }

      // Drawdown tracked as we go, so no per-path value series is needed
      if (pv > peak) peak = pv;
      if (peak > 0) {
        const dd = (peak - pv) / peak;
        if (dd > maxDd) maxDd = dd;
      }

      if (series) series[t] = pv;
    }

    allFinal[pathIndex] = pv;
    allMaxDd[pathIndex] = maxDd;
    if (series) samplePaths.push(series);
  };

  /** Advance the simulation by up to `count` paths. Returns paths completed. */
  const runBatch = (count) => {
    const end = Math.min(cursor + count, pathCount);
    while (cursor < end) {
      runPath(cursor);
      cursor += 1;
    }
    return cursor;
  };

  const finalize = () => {
    const finiteFinals = [];
    for (let i = 0; i < pathCount; i++) {
      if (Number.isFinite(allFinal[i])) finiteFinals.push(allFinal[i]);
    }

    const sorted = [...finiteFinals].sort((a, b) => a - b);
    const p10 = percentile(sorted, 10, true);
    const p50 = percentile(sorted, 50, true);
    const p90 = percentile(sorted, 90, true);

    let cvar95 = null;
    if (sorted.length) {
      const cutoff = Math.max(1, Math.floor(0.05 * sorted.length));
      let sum = 0;
      for (let i = 0; i < cutoff; i++) sum += sorted[i];
      cvar95 = sum / cutoff;
    }

    let lossCount = 0;
    for (let i = 0; i < finiteFinals.length; i++) {
      if (finiteFinals[i] < initial) lossCount += 1;
    }
    const probLoss = finiteFinals.length ? (lossCount / finiteFinals.length) * 100 : 0;

    let ddSum = 0;
    let ddCount = 0;
    for (let i = 0; i < pathCount; i++) {
      if (Number.isFinite(allMaxDd[i])) { ddSum += allMaxDd[i]; ddCount += 1; }
    }
    const avgMaxDd = ddCount ? (ddSum / ddCount) * 100 : 0;

    const findClosestPath = (target) => {
      if (!samplePaths.length) return Array(stepCount + 1).fill(initial);
      let bestIdx = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < samplePaths.length; i++) {
        const v = samplePaths[i][stepCount];
        if (!Number.isFinite(v)) continue;
        const d = Math.abs(v - target);
        if (d < bestDiff) { bestDiff = d; bestIdx = i; }
      }
      return samplePaths[bestIdx] || Array(stepCount + 1).fill(initial);
    };

    return {
      finalValues: finiteFinals,
      p10: Number.isFinite(p10) ? p10 : initial,
      p50: Number.isFinite(p50) ? p50 : initial,
      p90: Number.isFinite(p90) ? p90 : initial,
      cvar95: Number.isFinite(cvar95) ? cvar95 : initial,
      probLoss: Number.isFinite(probLoss) ? probLoss : 0,
      avgMaxDd: Number.isFinite(avgMaxDd) ? avgMaxDd : 0,
      samplePaths,
      pathP10: findClosestPath(p10),
      pathP50: findClosestPath(p50),
      pathP90: findClosestPath(p90),
      steps: stepCount,
    };
  };

  return { runBatch, finalize, pathCount };
};

/**
 * Run the whole simulation synchronously.
 * Blocks the caller for the full duration — prefer runMonteCarloAsync in the UI.
 */
export function runMonteCarlo(options) {
  const sim = createSimulation(options || {});
  if (!sim) return null;
  sim.runBatch(sim.pathCount);
  return sim.finalize();
}

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Run the simulation in batches, yielding between them so the UI thread stays
 * responsive. A frame budget rather than a fixed batch size keeps behaviour
 * sane across devices: slow phones simply do fewer paths per slice.
 *
 * @param {Object} args simulation options
 * @param {Object} [control]
 * @param {number} [control.sliceMs] work budget per slice (default 12ms)
 * @param {function} [control.onProgress] called with 0..1 after each slice
 * @param {{cancelled: boolean}} [control.token] set cancelled to abort
 */
export async function runMonteCarloAsync(args, control = {}) {
  const { sliceMs = 12, onProgress, token } = control;

  const sim = createSimulation(args || {});
  if (!sim) return null;

  let batchSize = 16;
  let completed = 0;

  while (completed < sim.pathCount) {
    if (token?.cancelled) return null;

    const started = Date.now();
    completed = sim.runBatch(batchSize);
    const elapsed = Date.now() - started;

    // Re-tune towards the slice budget so one batch never hogs the thread
    if (elapsed > sliceMs * 1.5 && batchSize > 1) {
      batchSize = Math.max(1, Math.floor(batchSize / 2));
    } else if (elapsed < sliceMs * 0.5) {
      batchSize = Math.min(512, batchSize * 2);
    }

    if (onProgress) onProgress(completed / sim.pathCount);
    if (completed < sim.pathCount) await nextTick();
  }

  if (token?.cancelled) return null;
  return sim.finalize();
}

export default runMonteCarlo;
