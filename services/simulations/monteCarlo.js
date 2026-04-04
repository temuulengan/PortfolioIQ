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

const boxMuller = () => {
  const u1 = Math.random();
  const u2 = Math.random();
  const r = Math.sqrt(-2 * Math.log(u1));
  return r * Math.cos(2 * Math.PI * u2);
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

export function runMonteCarlo({ assets = [], N = 1000, steps = 252, correlated = false, covDaily = null, dailyMeans = null, dailyStds = null, sampleCount = 25 }) {
  const nAssets = assets.length;
  if (!nAssets) return null;

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
    // ensure diagonal positive
    const cov = covDaily.map(row => row.slice());
    for (let i = 0; i < nAssets; i++) {
      if (!Number.isFinite(cov[i][i]) || cov[i][i] <= 0) cov[i][i] = (sigmaDaily[i] || 0.001) ** 2;
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
      // generate normals
      let zs = new Array(nAssets).fill(0).map(() => boxMuller());
      if (L) zs = matVecMul(L, zs);

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
