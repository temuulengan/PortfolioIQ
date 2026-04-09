// Pure JS Monte Carlo simulation service
// Exports runMonteCarlo(options)

// Options:
// - assets: [{ S0, quantity, muAnnual?, sigmaAnnual? }]
// - N: number of paths
// - steps: number of timesteps (e.g., 252)
// - correlated: boolean
// - covDaily: covariance matrix (daily) if correlated
// - dailyMeans: array of daily mean returns (optional)
// - dailyStds: array of daily std dev of returns (optional)
// - sampleCount: number of sample paths to return for plotting

// seedable PRNG (mulberry32) and box-muller using provided RNG
const mulberry32 = (seed) => {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

const boxMullerWithRng = (rng) => {
  const u1 = rng();
  const u2 = rng();
  const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12)));
  return r * Math.cos(2 * Math.PI * u2);
};

// Gamma sampler (Marsaglia & Tsang) for shape > 0
const gammaSample = (alpha, scale, rng) => {
  if (alpha <= 0) return 0;
  if (alpha < 1) {
    // boost using gamma(alpha+1) then multiply by u^(1/alpha)
    const u = rng();
    return gammaSample(alpha + 1, scale, rng) * Math.pow(u, 1 / alpha);
  }
  const d = alpha - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do {
      x = boxMullerWithRng(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
  }
};

const chi2Sample = (nu, rng) => {
  if (nu <= 0) return 1;
  // chi-square with nu df is gamma(shape=nu/2, scale=2)
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

const matVecMul = (M, v) => M.map(row => row.reduce((s, val, i) => s + val * v[i], 0));

const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(s.length - 1, Math.round((p / 100) * (s.length - 1))));
  return s[idx];
};

// Async runner: attempts to run simulation in a background thread using react-native-threads.
// If threads are unavailable, falls back to running on the main JS thread (wrapped in a Promise).
export async function runMonteCarloAsync(args) {
  // try react-native-threads
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const { Thread } = require('react-native-threads');
    if (Thread) {
      return await new Promise((resolve, reject) => {
        try {
          const t = new Thread('./services/simulations/monteCarlo.thread.js');
          const id = Math.random().toString(36).slice(2);
          const onMsg = (m) => {
            try {
              const payload = typeof m === 'string' ? JSON.parse(m) : m;
              if (payload && payload.id === id) {
                t.terminate();
                if (payload.error) return reject(new Error(payload.error));
                return resolve(payload.result);
              }
            } catch (err) {
              // ignore parse errors for unrelated messages
            }
          };
          t.onmessage = onMsg;
          t.postMessage(JSON.stringify({ id, args }));
        } catch (err) { reject(err); }
      });
    }
  } catch (e) {
    // threads not available — fall through to main-thread fallback
  }

  // Main-thread fallback: run simulation synchronously but return via Promise
  return new Promise((resolve) => {
    // allow event loop to yield briefly
    setTimeout(() => {
      try {
        const res = runMonteCarlo(args);
        resolve(res);
      } catch (err) {
        resolve(null);
      }
    }, 0);
  });
}

export function runMonteCarlo({ assets = [], N = 1000, steps = 252, correlated = false, covDaily = null, dailyMeans = null, dailyStds = null, sampleCount = 25, seed = null, shrinkageAlpha = 0.1, dist = 'normal', studentDf = 5 }) {
  const nAssets = assets.length;
  if (!nAssets) return null;

  // prepare RNG
  const rng = seed ? mulberry32(Number(seed) >>> 0) : Math.random;

  // prepare per-asset daily mu and sigma
  const muDaily = new Array(nAssets);
  const sigmaDaily = new Array(nAssets);
  for (let i = 0; i < nAssets; i++) {
    const a = assets[i];
    if (a.muAnnual !== undefined && a.sigmaAnnual !== undefined) {
      muDaily[i] = (a.muAnnual / 100) / 252; // assume muAnnual in percent
      sigmaDaily[i] = (a.sigmaAnnual / 100) / Math.sqrt(252);
    } else if (dailyMeans && dailyStds) {
      muDaily[i] = dailyMeans[i] || 0;
      sigmaDaily[i] = dailyStds[i] || 0;
    } else {
      muDaily[i] = 0;
      sigmaDaily[i] = 0.01;
    }
  }

  // prepare cholesky if correlated and covDaily provided
  let L = null;
  if (correlated && covDaily && covDaily.length === nAssets) {
    // copy and validate diagonal
    const cov = covDaily.map(row => row.slice());
    for (let i = 0; i < nAssets; i++) {
      if (!Number.isFinite(cov[i][i]) || cov[i][i] <= 0) cov[i][i] = (sigmaDaily[i] || 0.001) ** 2;
    }
    // Ledoit-Wolf style simple shrinkage toward diagonal (helps small-N stability)
    const alpha = typeof shrinkageAlpha === 'number' ? Math.max(0, Math.min(1, shrinkageAlpha)) : 0.1;
    if (alpha > 0) {
      // average variance
      let sumVar = 0;
      for (let i = 0; i < nAssets; i++) sumVar += cov[i][i];
      const avgVar = sumVar / nAssets;
      for (let i = 0; i < nAssets; i++) {
        for (let j = 0; j < nAssets; j++) {
          cov[i][j] = (1 - alpha) * cov[i][j] + (alpha) * (i === j ? avgVar : 0);
        }
      }
    }
    L = cholesky(cov);
  }

  const sampleIdxs = new Set();
  while (sampleIdxs.size < Math.min(sampleCount, N)) sampleIdxs.add(Math.floor(Math.random() * N));
  const sampleIdxArr = Array.from(sampleIdxs);

  const allFinal = new Array(N);
  const allMaxDd = new Array(N);
  const samplePaths = [];
  const pathsForPercentile = new Array(N);

  let initial = 0;
  for (let i = 0; i < nAssets; i++) initial += (Number(assets[i].S0) || 0) * (assets[i].quantity || 1);

  for (let p = 0; p < N; p++) {
    // initialize S for each asset
    const S = assets.map(a => Number(a.S0) || 0);
    const series = new Array(steps + 1);
    // initial portfolio value
    series[0] = initial;

    for (let t = 1; t <= steps; t++) {
      // generate base normals
      let zs = new Array(nAssets).fill(0).map(() => boxMullerWithRng(rng));
      // apply correlation via cholesky if present
      if (L) zs = matVecMul(L, zs);
      // if student-t requested, scale by sqrt(nu / chi2)
      if (dist === 'student') {
        if (L) {
          // multivariate t: single chi2 per time-step
          const v = chi2Sample(studentDf, rng);
          const scale = Math.sqrt(studentDf / Math.max(v, 1e-12));
          for (let k = 0; k < zs.length; k++) zs[k] *= scale;
        } else {
          // independent student-t per asset
          for (let k = 0; k < zs.length; k++) {
            const v = chi2Sample(studentDf, rng);
            const scale = Math.sqrt(studentDf / Math.max(v, 1e-12));
            zs[k] *= scale;
          }
        }
      }

      let pv = 0;
      for (let i = 0; i < nAssets; i++) {
        const mu = muDaily[i] || 0;
        const sigma = sigmaDaily[i] || 0;
        const z = zs[i];
        const prev = S[i] || 0;
        // GBM step
        const next = prev * Math.exp((mu - 0.5 * sigma * sigma) + sigma * z);
        S[i] = Number.isFinite(next) ? next : prev;
        pv += S[i] * (assets[i].quantity || 1);
      }
      series[t] = pv;
    }

    allFinal[p] = series[steps];
    allMaxDd[p] = (() => {
      let peak = -Infinity, maxDd = 0;
      for (let i = 0; i < series.length; i++) {
        const v = series[i];
        if (!Number.isFinite(v)) continue;
        if (v > peak) peak = v;
        const dd = peak > 0 ? (peak - v) / peak : 0;
        if (dd > maxDd) maxDd = dd;
      }
      return maxDd;
    })();

    pathsForPercentile[p] = series;
    if (sampleIdxs.has(p)) samplePaths.push(series);
  }

  const finiteFinals = allFinal.filter(v => Number.isFinite(v));
  const p10 = percentile(finiteFinals, 10);
  const p50 = percentile(finiteFinals, 50);
  const p90 = percentile(finiteFinals, 90);
  // CVaR (Expected Shortfall) at 95% level (mean of worst 5%)
  let cvar95 = null;
  if (finiteFinals.length) {
    const s = [...finiteFinals].sort((a,b) => a - b);
    const cutoff = Math.max(1, Math.floor(0.05 * s.length));
    const tail = s.slice(0, cutoff);
    cvar95 = tail.reduce((sum, v) => sum + v, 0) / tail.length;
  }
  const probLoss = finiteFinals.length ? (finiteFinals.filter(v => v < initial).length / finiteFinals.length) * 100 : 0;
  const avgMaxDd = allMaxDd.filter(Number.isFinite).length ? (allMaxDd.filter(Number.isFinite).reduce((s, v) => s + v, 0) / allMaxDd.filter(Number.isFinite).length) * 100 : 0;

  // find percentile paths
  const findClosestPath = (target) => {
    if (!finiteFinals.length) return Array(steps + 1).fill(initial);
    let bestIdx = 0, bestDiff = Infinity;
    for (let i = 0; i < pathsForPercentile.length; i++) {
      const v = pathsForPercentile[i][steps];
      if (!Number.isFinite(v)) continue;
      const d = Math.abs(v - target);
      if (d < bestDiff) { bestDiff = d; bestIdx = i; }
    }
    return pathsForPercentile[bestIdx] || Array(steps + 1).fill(initial);
  };

  const pathP10 = findClosestPath(p10);
  const pathP50 = findClosestPath(p50);
  const pathP90 = findClosestPath(p90);

  return {
    finalValues: finiteFinals,
    p10: Number.isFinite(p10) ? p10 : initial,
    p50: Number.isFinite(p50) ? p50 : initial,
    p90: Number.isFinite(p90) ? p90 : initial,
    cvar95: Number.isFinite(cvar95) ? cvar95 : initial,
    probLoss: Number.isFinite(probLoss) ? probLoss : 0,
    avgMaxDd: Number.isFinite(avgMaxDd) ? avgMaxDd : 0,
    samplePaths,
    pathP10,
    pathP50,
    pathP90,
    steps,
  };
}

export default { runMonteCarlo };
