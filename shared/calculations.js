/**
 * Portfolio and Investment Calculation Functions
 */

// ==================== BASIC CALCULATIONS ====================

/**
 * Calculate total value of a holding
 */
export const calculateHoldingValue = (quantity, currentPrice) => {
  return quantity * currentPrice;
};

/**
 * Calculate total cost basis of a holding
 */
export const calculateCostBasis = (quantity, purchasePrice) => {
  return quantity * purchasePrice;
};

/**
 * Calculate gain/loss for a holding
 */
export const calculateGainLoss = (quantity, purchasePrice, currentPrice) => {
  const costBasis = calculateCostBasis(quantity, purchasePrice);
  const currentValue = calculateHoldingValue(quantity, currentPrice);
  return currentValue - costBasis;
};

/**
 * Calculate percentage gain/loss for a holding
 */
export const calculateGainLossPercent = (purchasePrice, currentPrice) => {
  return ((currentPrice - purchasePrice) / purchasePrice) * 100;
};

/**
 * Calculate day change for a holding
 */
export const calculateDayChange = (quantity, previousClose, currentPrice) => {
  return quantity * (currentPrice - previousClose);
};

/**
 * Calculate day change percentage
 */
export const calculateDayChangePercent = (previousClose, currentPrice) => {
  return ((currentPrice - previousClose) / previousClose) * 100;
};

// ==================== PORTFOLIO CALCULATIONS ====================

/**
 * Calculate total portfolio value
 */
export const calculatePortfolioValue = (holdings) => {
  return holdings.reduce((total, holding) => {
    return total + calculateHoldingValue(holding.quantity, holding.currentPrice);
  }, 0);
};

/**
 * Calculate total portfolio cost basis
 */
export const calculatePortfolioCostBasis = (holdings) => {
  return holdings.reduce((total, holding) => {
    return total + calculateCostBasis(holding.quantity, holding.purchasePrice);
  }, 0);
};

/**
 * Calculate total portfolio gain/loss
 */
export const calculatePortfolioGainLoss = (holdings) => {
  const currentValue = calculatePortfolioValue(holdings);
  const costBasis = calculatePortfolioCostBasis(holdings);
  return currentValue - costBasis;
};

/**
 * Calculate portfolio gain/loss percentage
 */
export const calculatePortfolioGainLossPercent = (holdings) => {
  const costBasis = calculatePortfolioCostBasis(holdings);
  const gainLoss = calculatePortfolioGainLoss(holdings);
  return (gainLoss / costBasis) * 100;
};

/**
 * Calculate total portfolio day change
 */
export const calculatePortfolioDayChange = (holdings) => {
  return holdings.reduce((total, holding) => {
    const previousClose = holding.currentPrice / (1 + (holding.dayChangePercent || 0) / 100);
    return total + calculateDayChange(holding.quantity, previousClose, holding.currentPrice);
  }, 0);
};

// ==================== ALLOCATION CALCULATIONS ====================

/**
 * Calculate allocation percentage for each holding
 */
export const calculateAllocation = (holdings) => {
  const totalValue = calculatePortfolioValue(holdings);
  
  return holdings.map(holding => {
    const holdingValue = calculateHoldingValue(holding.quantity, holding.currentPrice);
    return {
      ...holding,
      allocationPercent: (holdingValue / totalValue) * 100,
      value: holdingValue,
    };
  });
};

/**
 * Group holdings by asset type and calculate allocation
 */
export const calculateAssetTypeAllocation = (holdings) => {
  const totalValue = calculatePortfolioValue(holdings);
  const typeGroups = {};

  holdings.forEach(holding => {
    const type = holding.assetType || 'stock';
    const value = calculateHoldingValue(holding.quantity, holding.currentPrice);
    
    if (!typeGroups[type]) {
      typeGroups[type] = {
        type: type,
        value: 0,
        count: 0,
      };
    }
    
    typeGroups[type].value += value;
    typeGroups[type].count += 1;
  });

  return Object.values(typeGroups).map(group => ({
    ...group,
    allocationPercent: (group.value / totalValue) * 100,
  }));
};

/**
 * Group holdings by sector (simplified - would need sector data from API)
 */
export const calculateSectorAllocation = (holdings) => {
  const totalValue = calculatePortfolioValue(holdings);
  const sectorGroups = {};

  holdings.forEach(holding => {
    const sector = holding.sector || 'Unknown';
    const value = calculateHoldingValue(holding.quantity, holding.currentPrice);
    
    if (!sectorGroups[sector]) {
      sectorGroups[sector] = {
        sector: sector,
        value: 0,
        count: 0,
      };
    }
    
    sectorGroups[sector].value += value;
    sectorGroups[sector].count += 1;
  });

  return Object.values(sectorGroups).map(group => ({
    ...group,
    allocationPercent: (group.value / totalValue) * 100,
  }));
};

// ==================== PERFORMANCE CALCULATIONS ====================

/**
 * Calculate annualized return
 */
export const calculateAnnualizedReturn = (startValue, endValue, years) => {
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
};

/**
 * Calculate top performers
 */
export const getTopPerformers = (holdings, count = 5) => {
  return [...holdings]
    .sort((a, b) => {
      const gainA = calculateGainLossPercent(a.purchasePrice, a.currentPrice);
      const gainB = calculateGainLossPercent(b.purchasePrice, b.currentPrice);
      return gainB - gainA;
    })
    .slice(0, count);
};

/**
 * Calculate bottom performers
 */
export const getBottomPerformers = (holdings, count = 5) => {
  return [...holdings]
    .sort((a, b) => {
      const gainA = calculateGainLossPercent(a.purchasePrice, a.currentPrice);
      const gainB = calculateGainLossPercent(b.purchasePrice, b.currentPrice);
      return gainA - gainB;
    })
    .slice(0, count);
};

// ==================== RISK CALCULATIONS ====================

/**
 * Calculate portfolio volatility (standard deviation of returns)
 * Note: This is simplified - real calculation would use historical returns
 */
export const calculateVolatility = (holdings) => {
  const returns = holdings.map(holding => 
    calculateGainLossPercent(holding.purchasePrice, holding.currentPrice)
  );

  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
};

/**
 * Calculate portfolio beta (weighted average of individual betas)
 */
export const calculatePortfolioBeta = (holdings) => {
  const totalValue = calculatePortfolioValue(holdings);
  
  return holdings.reduce((weightedBeta, holding) => {
    const weight = calculateHoldingValue(holding.quantity, holding.currentPrice) / totalValue;
    const beta = holding.beta || 1.0; // Default to market beta
    return weightedBeta + (weight * beta);
  }, 0);
};

/**
 * Calculate Sharpe Ratio
 * (Return - Risk-free rate) / Standard Deviation
 */
export const calculateSharpeRatio = (portfolioReturn, riskFreeRate, volatility) => {
  return (portfolioReturn - riskFreeRate) / volatility;
};

/**
 * Calculate concentration risk (percentage in top 3 holdings)
 */
export const calculateConcentrationRisk = (holdings) => {
  const allocations = calculateAllocation(holdings);
  const topThree = allocations
    .sort((a, b) => b.allocationPercent - a.allocationPercent)
    .slice(0, 3);
  
  return topThree.reduce((sum, holding) => sum + holding.allocationPercent, 0);
};

// ==================== DIVERSIFICATION CALCULATIONS ====================

/**
 * Calculate diversification score (0-100)
 * Based on number of holdings and allocation distribution
 */
export const calculateDiversificationScore = (holdings) => {
  if (holdings.length === 0) return 0;
  if (holdings.length === 1) return 20;

  const allocations = calculateAllocation(holdings);
  const maxAllocation = Math.max(...allocations.map(h => h.allocationPercent));
  
  // Score based on number of holdings (max 50 points)
  const countScore = Math.min(50, holdings.length * 5);
  
  // Score based on distribution (max 50 points)
  // Lower max allocation = better distribution
  const distributionScore = Math.max(0, 50 - maxAllocation);
  
  return Math.min(100, countScore + distributionScore);
};

/**
 * Check if portfolio is well-diversified
 */
export const isDiversified = (holdings) => {
  const score = calculateDiversificationScore(holdings);
  return score >= 60;
};
