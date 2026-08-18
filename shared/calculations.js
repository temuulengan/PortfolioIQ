// Portfolio and Investment Calculation Functions

// Helpers
const toNumber = (v) => {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// NOTE: `pickPurchasePrice` was removed (was unused) to avoid dead code.

// ==================== BASIC CALCULATIONS ====================

export const calculateHoldingValue = (quantity, currentPrice, purchasePrice = 0, holdingId = null) => {
  const q = toNumber(quantity);
  const c = Number.isFinite(currentPrice) ? currentPrice : null;
  const p = Number.isFinite(purchasePrice) ? purchasePrice : null;
  const usePrice = c != null ? c : (p != null ? p : 0);
  if (c == null && p != null) {
    console.warn(`Holding ${holdingId || ''} missing currentPrice; falling back to purchasePrice in value calc.`);
  }
  return q * usePrice;
};

export const calculateCostBasis = (quantity, purchasePrice) => {
  return toNumber(quantity) * toNumber(purchasePrice);
};

export const calculateGainLoss = (quantity, purchasePrice, currentPrice) => {
  const costBasis = calculateCostBasis(quantity, purchasePrice);
  const currentValue = calculateHoldingValue(quantity, currentPrice, purchasePrice);
  return currentValue - costBasis;
};

export const calculateGainLossPercent = (purchasePrice, currentPrice) => {
  const p = toNumber(purchasePrice);
  const c = toNumber(currentPrice);
  if (p === 0) return 0;
  return ((c - p) / p) * 100;
};

export const calculateDayChange = (quantity, previousClose, currentPrice) => {
  return toNumber(quantity) * (toNumber(currentPrice) - toNumber(previousClose));
};

export const calculateDayChangePercent = (previousClose, currentPrice) => {
  const prev = toNumber(previousClose);
  if (prev === 0) return 0;
  return ((toNumber(currentPrice) - prev) / prev) * 100;
};

// ==================== PORTFOLIO CALCULATIONS ====================

export const calculatePortfolioValue = (holdings) => {
  if (!Array.isArray(holdings) || holdings.length === 0) return 0;
  return holdings.reduce((total, h) => {
    const purchase = h.purchasePrice ?? h.avgCost ?? 0;
    return total + calculateHoldingValue(h.quantity, h.currentPrice, purchase, h.id);
  }, 0);
};

export const calculatePortfolioCostBasis = (holdings) => {
  if (!Array.isArray(holdings) || holdings.length === 0) return 0;
  return holdings.reduce((total, h) => {
    const purchase = h.purchasePrice ?? h.avgCost ?? 0;
    return total + calculateCostBasis(h.quantity, purchase);
  }, 0);
};

export const calculatePortfolioGainLoss = (holdings) => {
  const currentValue = calculatePortfolioValue(holdings);
  const costBasis = calculatePortfolioCostBasis(holdings);
  return currentValue - costBasis;
};

export const calculatePortfolioGainLossPercent = (holdings) => {
  const costBasis = calculatePortfolioCostBasis(holdings);
  if (!Number.isFinite(costBasis) || costBasis === 0) return 0;
  const gainLoss = calculatePortfolioGainLoss(holdings);
  return (gainLoss / costBasis) * 100;
};

export const calculatePortfolioDayChange = (holdings) => {
  if (!Array.isArray(holdings) || holdings.length === 0) return 0;
  return holdings.reduce((total, h) => {
    // Prefer explicit `previousClose` if present. If not present but `dayChangePercent` and currentPrice
    // are available, reconstruct previous close. Otherwise skip day-change for this holding (avoid
    // inventing a previous close which yields misleading zero values).
    let prevClose = null;
    if (Number.isFinite(h.previousClose)) {
      prevClose = h.previousClose;
    } else if (Number.isFinite(h.currentPrice) && Number.isFinite(h.dayChangePercent)) {
      const d = Number(h.dayChangePercent);
      if (!Number.isNaN(d)) prevClose = h.currentPrice / (1 + d / 100);
    }
    const current = Number.isFinite(h.currentPrice) ? h.currentPrice : (h.purchasePrice ?? h.avgCost ?? 0);
    if (prevClose == null) return total; // can't compute day change reliably without prevClose
    return total + calculateDayChange(h.quantity, prevClose, current);
  }, 0);
};

// ==================== ALLOCATION CALCULATIONS ====================

export const calculateAllocation = (holdings) => {
  const totalValue = calculatePortfolioValue(holdings);
  if (!Number.isFinite(totalValue) || totalValue === 0) {
    return (holdings || []).map(h => ({ ...h, allocationPercent: 0, value: calculateHoldingValue(h.quantity, h.currentPrice, h.purchasePrice ?? h.avgCost ?? 0, h.id) }));
  }
  return holdings.map(h => {
    const purchase = h.purchasePrice ?? h.avgCost ?? 0;
    const holdingValue = calculateHoldingValue(h.quantity, h.currentPrice, purchase, h.id);
    return { ...h, allocationPercent: (holdingValue / totalValue) * 100, value: holdingValue };
  });
};

export const calculateAssetTypeAllocation = (holdings) => {
  const totalValue = calculatePortfolioValue(holdings);
  const typeGroups = {};
  (holdings || []).forEach(h => {
    const type = h.assetType || 'stock';
    const purchase = h.purchasePrice ?? h.avgCost ?? 0;
    const value = calculateHoldingValue(h.quantity, h.currentPrice, purchase, h.id);
    if (!typeGroups[type]) typeGroups[type] = { type, value: 0, count: 0 };
    typeGroups[type].value += value;
    typeGroups[type].count += 1;
  });
  return Object.values(typeGroups).map(g => ({ ...g, allocationPercent: (!Number.isFinite(totalValue) || totalValue === 0) ? 0 : (g.value / totalValue) * 100 }));
};

export const calculateSectorAllocation = (holdings) => {
  const totalValue = calculatePortfolioValue(holdings);
  const sectorGroups = {};
  (holdings || []).forEach(h => {
    const sector = h.sector || 'Unknown';
    const purchase = h.purchasePrice ?? h.avgCost ?? 0;
    const value = calculateHoldingValue(h.quantity, h.currentPrice, purchase, h.id);
    if (!sectorGroups[sector]) sectorGroups[sector] = { sector, value: 0, count: 0 };
    sectorGroups[sector].value += value;
    sectorGroups[sector].count += 1;
  });
  return Object.values(sectorGroups).map(g => ({ ...g, allocationPercent: (!Number.isFinite(totalValue) || totalValue === 0) ? 0 : (g.value / totalValue) * 100 }));
};

// ==================== HISTORY ====================

/**
 * Combine per-symbol price series into one portfolio value series.
 *
 * Series are joined on their dates, never on array position: symbols on
 * different exchanges, or listed more recently, come back with different
 * numbers of bars, so index i is not the same day for every holding. Only dates
 * present in every series are used, and non-finite prices are dropped.
 *
 * @param {Array<{quantity: number, dates: string[], prices: number[]}>} series
 * @returns {Array<{date: Date, totalValue: number}>} ascending by date
 */
export const mergePortfolioHistory = (series) => {
  if (!Array.isArray(series) || series.length === 0) return [];

  const byHolding = series.map((entry) => {
    const byDate = new Map();
    const dates = entry?.dates || [];
    const prices = entry?.prices || [];
    dates.forEach((date, index) => {
      const price = prices[index];
      if (!date || !Number.isFinite(price) || price <= 0) return;
      byDate.set(String(date).slice(0, 10), price);
    });
    return { quantity: toNumber(entry?.quantity), byDate };
  });

  const [first, ...rest] = byHolding;
  const commonDates = [...first.byDate.keys()]
    .filter((date) => rest.every((holding) => holding.byDate.has(date)))
    .sort();

  return commonDates.map((date) => ({
    date: new Date(date),
    totalValue: byHolding.reduce(
      (sum, holding) => sum + holding.quantity * holding.byDate.get(date),
      0
    ),
  }));
};

// ==================== PERFORMANCE CALCULATIONS ====================

export const calculateAnnualizedReturn = (startValue, endValue, years) => {
  if (!Number.isFinite(startValue) || startValue === 0) return 0;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
};

export const getTopPerformers = (holdings, count = 5) => {
  return [...(holdings || [])].sort((a, b) => {
    const gainA = calculateGainLossPercent(a.purchasePrice ?? a.avgCost ?? 0, a.currentPrice);
    const gainB = calculateGainLossPercent(b.purchasePrice ?? b.avgCost ?? 0, b.currentPrice);
    return gainB - gainA;
  }).slice(0, count);
};

export const getBottomPerformers = (holdings, count = 5) => {
  return [...(holdings || [])].sort((a, b) => {
    const gainA = calculateGainLossPercent(a.purchasePrice ?? a.avgCost ?? 0, a.currentPrice);
    const gainB = calculateGainLossPercent(b.purchasePrice ?? b.avgCost ?? 0, b.currentPrice);
    return gainA - gainB;
  }).slice(0, count);
};

// ==================== RISK CALCULATIONS ====================

export const calculateVolatility = (holdings) => {
  if (!Array.isArray(holdings) || holdings.length === 0) return 0;

  // If holdings include per-asset return series (`returns` arrays of equal length), compute
  // portfolio daily returns as the allocation-weighted sum and annualize the std dev.
  const allocations = calculateAllocation(holdings);
  const returnsMatrix = holdings.map(h => Array.isArray(h.returns) ? h.returns : null);
  if (returnsMatrix.every(r => Array.isArray(r))) {
    const len = returnsMatrix[0].length;
    if (len < 2) return 0;
    const portfolioReturns = [];
    for (let t = 0; t < len; t++) {
      let r = 0;
      for (let i = 0; i < holdings.length; i++) {
        const w = (allocations[i]?.allocationPercent || 0) / 100;
        r += (returnsMatrix[i][t] || 0) * w;
      }
      portfolioReturns.push(r);
    }
    const m = portfolioReturns.reduce((s, v) => s + v, 0) / portfolioReturns.length;
    const variance = portfolioReturns.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (portfolioReturns.length - 1);
    const dailyVol = Math.sqrt(Math.max(0, variance));
    return dailyVol * Math.sqrt(252) * 100; // return as percent annualized
  }

  // Fallback: if assets contain `annualVolatility` (in percent), compute a simple
  // portfolio volatility approximation by summing squared weighted vols (diagonal approximation).
  const vols = holdings.map(h => (Number.isFinite(h.annualVolatility) ? h.annualVolatility : null));
  if (vols.some(v => v != null)) {
    const weights = allocations.map(a => (a.allocationPercent || 0) / 100);
    let variance = 0;
    for (let i = 0; i < vols.length; i++) {
      if (vols[i] == null) continue;
      variance += (weights[i] ** 2) * Math.pow(vols[i] / 100, 2);
    }
    const vol = Math.sqrt(Math.max(0, variance)) * 100;
    return Number.isFinite(vol) ? vol : 0;
  }

  // No time-series or vol info available — avoid returning a misleading cross-sectional "volatility".
  return 0;
};

export const calculatePortfolioBeta = (holdings) => {
  const totalValue = calculatePortfolioValue(holdings);
  if (!Number.isFinite(totalValue) || totalValue === 0) return 0;
  // Compute weighted beta only across holdings that actually have a numeric `beta` value.
  let weighted = 0;
  let weightSum = 0;
  (holdings || []).forEach((h) => {
    const purchase = h.purchasePrice ?? h.avgCost ?? 0;
    const weight = calculateHoldingValue(h.quantity, h.currentPrice, purchase, h.id) / totalValue;
    if (Number.isFinite(h.beta)) {
      weighted += weight * Number(h.beta);
      weightSum += weight;
    }
  });
  if (weightSum === 0) return 0; // no beta data available
  return weighted / weightSum;
};

export const calculateSharpeRatio = (portfolioReturn, riskFreeRate, volatility) => {
  if (!volatility) return 0;
  return (portfolioReturn - riskFreeRate) / volatility;
};

export const calculateConcentrationRisk = (holdings) => {
  const allocations = calculateAllocation(holdings);
  const topThree = allocations.sort((a, b) => b.allocationPercent - a.allocationPercent).slice(0, 3);
  return topThree.reduce((s, h) => s + (h.allocationPercent || 0), 0);
};

export const calculateDiversificationScore = (holdings) => {
  if (!holdings || holdings.length === 0) return 0;
  if (holdings.length === 1) return 20;
  const allocations = calculateAllocation(holdings);
  const maxAllocation = Math.max(...allocations.map(h => h.allocationPercent || 0));
  const countScore = Math.min(50, holdings.length * 5);
  // Make distribution score scale 0-50 by converting maxAllocation (0-100) into a 0-50 range.
  const distributionScore = Math.max(0, (100 - maxAllocation) * 0.5);
  return Math.min(100, countScore + distributionScore);
};

export const isDiversified = (holdings) => {
  return calculateDiversificationScore(holdings) >= 60;
};
