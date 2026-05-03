// Portfolio and Investment Calculation Functions

// Helpers
const toNumber = (v) => {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const pickPurchasePrice = (holdingOrPrice, fallback) => {
  // Accept either a holding object or a raw price
  if (typeof holdingOrPrice === 'object' && holdingOrPrice !== null) {
    return toNumber(holdingOrPrice.purchasePrice ?? holdingOrPrice.avgCost ?? fallback ?? 0);
  }
  return toNumber(holdingOrPrice ?? fallback ?? 0);
};

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
    const prevClose = Number.isFinite(h.currentPrice)
      ? (h.currentPrice / (1 + (h.dayChangePercent || 0) / 100))
      : (h.previousClose ?? h.purchasePrice ?? h.avgCost ?? 0);
    const current = Number.isFinite(h.currentPrice) ? h.currentPrice : (h.purchasePrice ?? h.avgCost ?? 0);
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
  const returns = holdings.map(h => calculateGainLossPercent(h.purchasePrice ?? h.avgCost ?? 0, h.currentPrice));
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const variance = returns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
};

export const calculatePortfolioBeta = (holdings) => {
  const totalValue = calculatePortfolioValue(holdings);
  if (!Number.isFinite(totalValue) || totalValue === 0) return 0;
  return (holdings || []).reduce((weightedBeta, h) => {
    const purchase = h.purchasePrice ?? h.avgCost ?? 0;
    const weight = calculateHoldingValue(h.quantity, h.currentPrice, purchase, h.id) / totalValue;
    const beta = h.beta ?? 1.0;
    return weightedBeta + (weight * beta);
  }, 0);
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
  const distributionScore = Math.max(0, 50 - maxAllocation);
  return Math.min(100, countScore + distributionScore);
};

export const isDiversified = (holdings) => {
  return calculateDiversificationScore(holdings) >= 60;
};
