import { getHistoricalPrices } from '../services/api/stockAPI';

const TRADING_DAYS = 252;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeWeights = (weights) => {
  const sum = weights.reduce((acc, w) => acc + w, 0);
  if (sum <= 0) {
    const equal = 1 / weights.length;
    return weights.map(() => equal);
  }
  return weights.map(w => w / sum);
};

const toDatePriceMap = (history) => {
  const map = new Map();
  for (let i = 0; i < history.dates.length; i += 1) {
    const date = history.dates[i];
    const price = history.prices[i];

    if (!date || !Number.isFinite(price) || price <= 0) continue;
    map.set(date.slice(0, 10), price);
  }
  return map;
};

const getCommonDates = (datePriceMaps) => {
  if (!datePriceMaps.length) return [];

  const [firstMap, ...restMaps] = datePriceMaps;
  const common = [];

  for (const date of firstMap.keys()) {
    if (restMaps.every(map => map.has(date))) {
      common.push(date);
    }
  }

  return common.sort();
};

const toReturns = (priceSeries) => {
  const returns = [];
  for (let i = 1; i < priceSeries.length; i += 1) {
    const prev = priceSeries[i - 1];
    const curr = priceSeries[i];
    if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev <= 0) continue;
    returns.push((curr / prev) - 1);
  }
  return returns;
};

const mean = (arr) => {
  if (!arr.length) return 0;
  return arr.reduce((acc, v) => acc + v, 0) / arr.length;
};

const stdDev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((acc, v) => acc + ((v - m) ** 2), 0) / (arr.length - 1);
  return Math.sqrt(Math.max(variance, 0));
};

const covariance = (x, y) => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);
  const mx = mean(xSlice);
  const my = mean(ySlice);

  let cov = 0;
  for (let i = 0; i < n; i += 1) {
    cov += (xSlice[i] - mx) * (ySlice[i] - my);
  }

  return cov / (n - 1);
};

const buildCovarianceMatrix = (returnsMatrix) => {
  const n = returnsMatrix.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i += 1) {
    for (let j = i; j < n; j += 1) {
      const cov = covariance(returnsMatrix[i], returnsMatrix[j]);
      matrix[i][j] = cov;
      matrix[j][i] = cov;
    }
  }

  return matrix;
};

const matrixVectorMultiply = (matrix, vector) => (
  matrix.map(row => row.reduce((acc, value, idx) => acc + (value * vector[idx]), 0))
);

const portfolioVariance = (weights, covarianceMatrix) => {
  const sigmaW = matrixVectorMultiply(covarianceMatrix, weights);
  return weights.reduce((acc, w, idx) => acc + (w * sigmaW[idx]), 0);
};

const portfolioVolatility = (weights, covarianceMatrix, annualize = true) => {
  const variance = Math.max(portfolioVariance(weights, covarianceMatrix), 0);
  const vol = Math.sqrt(variance);
  return annualize ? vol * Math.sqrt(TRADING_DAYS) : vol;
};

const riskContributionBreakdown = (weights, covarianceMatrix) => {
  const variance = Math.max(portfolioVariance(weights, covarianceMatrix), 0);
  const sigma = Math.sqrt(variance);

  if (sigma === 0) {
    return {
      variance,
      sigma,
      sigmaAnnualized: 0,
      marginalContributions: weights.map(() => 0),
      riskContributions: weights.map(() => 0),
      riskContributionPct: weights.map(() => 0),
    };
  }

  const sigmaW = matrixVectorMultiply(covarianceMatrix, weights);
  const marginalContributions = sigmaW.map(v => v / sigma);
  const riskContributions = weights.map((w, i) => w * marginalContributions[i]);
  const totalRc = riskContributions.reduce((acc, v) => acc + v, 0);
  const riskContributionPct = riskContributions.map(v => (totalRc === 0 ? 0 : v / totalRc));

  return {
    variance,
    sigma,
    sigmaAnnualized: sigma * Math.sqrt(TRADING_DAYS),
    marginalContributions,
    riskContributions,
    riskContributionPct,
  };
};

const solveRiskParityWeights = (covarianceMatrix, iterations = 250) => {
  const n = covarianceMatrix.length;
  let weights = Array(n).fill(1 / n);

  for (let step = 0; step < iterations; step += 1) {
    const breakdown = riskContributionBreakdown(weights, covarianceMatrix);
    const target = 1 / n;

    const updated = weights.map((w, i) => {
      const diff = breakdown.riskContributionPct[i] - target;
      const next = w * (1 - (0.5 * diff));
      return clamp(next, 0.0001, 1);
    });

    weights = normalizeWeights(updated);
  }

  return weights;
};

const hhiConcentration = (weights) => {
  if (!weights.length) return 0;
  return weights.reduce((acc, w) => acc + (w ** 2), 0);
};

const diversificationRatio = (weights, covarianceMatrix, returnsMatrix) => {
  const indivVol = returnsMatrix.map(series => stdDev(series));
  const numerator = weights.reduce((acc, w, i) => acc + (w * indivVol[i]), 0);
  const denominator = Math.sqrt(Math.max(portfolioVariance(weights, covarianceMatrix), 0));
  if (denominator === 0) return 0;
  return numerator / denominator;
};

const inferPeriod = (lookbackDays) => {
  if (lookbackDays <= 30) return '1mo';
  if (lookbackDays <= 90) return '3mo';
  if (lookbackDays <= 180) return '6mo';
  if (lookbackDays <= 365) return '1y';
  return '2y';
};

export const runBridgewaterAnalysis = async (holdings, options = {}) => {
  const lookbackDays = options.lookbackDays || 252;
  const minDataPoints = options.minDataPoints || 40;

  if (!holdings || holdings.length < 2) {
    return {
      success: false,
      reason: 'Need at least 2 holdings for covariance-based Bridgewater analysis',
    };
  }

  const symbols = holdings.map(h => h.symbol);
  const period = inferPeriod(lookbackDays);

  const historyResults = await Promise.allSettled(
    symbols.map(symbol => getHistoricalPrices(symbol, period, '1d'))
  );

  const successful = historyResults
    .map((result, idx) => ({ result, idx }))
    .filter(item => item.result.status === 'fulfilled')
    .map(item => ({
      symbol: symbols[item.idx],
      history: item.result.value,
      holding: holdings[item.idx],
    }));

  if (successful.length < 2) {
    return {
      success: false,
      reason: 'Unable to retrieve enough historical data for risk-parity model',
    };
  }

  const maps = successful.map(item => toDatePriceMap(item.history));
  const commonDates = getCommonDates(maps);

  if (commonDates.length < minDataPoints) {
    return {
      success: false,
      reason: `Not enough overlapping history points (${commonDates.length}) for stable covariance estimation`,
    };
  }

  const priceSeriesByAsset = maps.map(map => commonDates.map(date => map.get(date)));
  const returnsMatrix = priceSeriesByAsset.map(series => toReturns(series));

  const covarianceMatrix = buildCovarianceMatrix(returnsMatrix);

  const totalValue = successful.reduce(
    (acc, item) => acc + (item.holding.quantity * item.holding.currentPrice),
    0
  );

  const currentWeights = normalizeWeights(
    successful.map(item => (item.holding.quantity * item.holding.currentPrice) / totalValue)
  );

  const targetWeights = solveRiskParityWeights(covarianceMatrix);

  const currentBreakdown = riskContributionBreakdown(currentWeights, covarianceMatrix);
  const targetBreakdown = riskContributionBreakdown(targetWeights, covarianceMatrix);

  const currentRiskImbalance = stdDev(currentBreakdown.riskContributionPct) * 100;
  const targetRiskImbalance = stdDev(targetBreakdown.riskContributionPct) * 100;

  const assets = successful.map((item, i) => ({
    symbol: item.symbol,
    currentWeight: currentWeights[i],
    targetWeight: targetWeights[i],
    currentRiskContributionPct: currentBreakdown.riskContributionPct[i],
    targetRiskContributionPct: targetBreakdown.riskContributionPct[i],
    annualVolatility: stdDev(returnsMatrix[i]) * Math.sqrt(TRADING_DAYS),
  }));

  const sortedByRisk = [...assets].sort(
    (a, b) => b.currentRiskContributionPct - a.currentRiskContributionPct
  );

  const recommendations = [];

  if (currentRiskImbalance > 6) {
    recommendations.push('Risk contribution is concentrated. Rebalance toward risk-parity target weights.');
  }

  const topRisk = sortedByRisk[0];
  if (topRisk && topRisk.currentRiskContributionPct > (1 / assets.length) * 1.8) {
    recommendations.push(`${topRisk.symbol} contributes disproportionately to risk. Consider trimming exposure.`);
  }

  const currentHhi = hhiConcentration(currentWeights);
  if (currentHhi > 0.22) {
    recommendations.push('Weight concentration is high (HHI elevated). Add balance across assets or sectors.');
  }

  return {
    success: true,
    method: 'Bridgewater-inspired risk parity (local deterministic engine)',
    lookbackDays: commonDates.length,
    covarianceMatrix,
    returnsMatrix,
    annualizedVolatilityCurrent: currentBreakdown.sigmaAnnualized,
    annualizedVolatilityTarget: targetBreakdown.sigmaAnnualized,
    riskImbalanceCurrent: currentRiskImbalance,
    riskImbalanceTarget: targetRiskImbalance,
    concentrationHHICurrent: currentHhi,
    concentrationHHITarget: hhiConcentration(targetWeights),
    diversificationRatioCurrent: diversificationRatio(currentWeights, covarianceMatrix, returnsMatrix),
    diversificationRatioTarget: diversificationRatio(targetWeights, covarianceMatrix, returnsMatrix),
    assets,
    recommendations,
  };
};

export default {
  runBridgewaterAnalysis,
};