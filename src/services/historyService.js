import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db, getCurrentUser } from './firebase';
import { getHistoricalPrices } from './stockAPI';
import { calculatePortfolioValue } from './calculations';

/**
 * Create a daily snapshot of portfolio value
 * Call this function daily (can be triggered by user login or scheduled)
 */
export const createPortfolioSnapshot = async (portfolioId, holdings) => {
  try {
    const totalValue = calculatePortfolioValue(holdings);
    
    const snapshot = {
      portfolioId,
      date: Timestamp.now(),
      totalValue,
      holdingsCount: holdings.length,
      holdings: holdings.map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        price: h.currentPrice,
        value: h.quantity * h.currentPrice,
      })),
    };

    await addDoc(collection(db, 'portfolio_history'), snapshot);
    return { success: true, snapshot };
  } catch (error) {
    console.error('Error creating portfolio snapshot:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get historical portfolio data for a time period
 * @param {string} portfolioId - Portfolio ID
 * @param {number} days - Number of days to fetch (30, 90, 180, 365)
 * @returns {Promise<Array>} Historical data points
 */
export const getPortfolioHistory = async (portfolioId, days = 30) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const q = query(
      collection(db, 'portfolio_history'),
      where('userId', '==', user.uid),
      where('portfolioId', '==', portfolioId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const history = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        date: data.date.toDate(),
        totalValue: data.totalValue,
        holdingsCount: data.holdingsCount,
      });
    });

    return history;
  } catch (error) {
    console.error('Error fetching portfolio history:', error);
    return [];
  }
};

/**
 * Generate historical data for a portfolio using Yahoo Finance API
 * This fills in missing historical data based on holdings' purchase history
 */
export const generateHistoricalData = async (holdings, days = 30) => {
  try {
    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      console.log('No holdings provided to generateHistoricalData');
      return [];
    }
    
    const historicalData = [];
    const period = days <= 30 ? '1mo' : days <= 90 ? '3mo' : days <= 180 ? '6mo' : '1y';
    const interval = days <= 30 ? '1d' : days <= 90 ? '1d' : '1wk';

    // Get historical prices for each holding
    const pricePromises = holdings.map(holding =>
      getHistoricalPrices(holding.symbol, period, interval)
        .then(data => ({ symbol: holding.symbol, quantity: holding.quantity, data }))
        .catch(err => {
          console.error(`Error fetching history for ${holding.symbol}:`, err);
          return null;
        })
    );

    const allPriceData = (await Promise.all(pricePromises)).filter(Boolean);

    if (allPriceData.length === 0) {
      return [];
    }

    // Find common dates across all holdings
    const dates = allPriceData[0].data.dates;

    // Calculate portfolio value for each date
    dates.forEach((date, index) => {
      let totalValue = 0;
      let hasAllPrices = true;

      allPriceData.forEach(holding => {
        if (holding.data.prices[index] !== undefined) {
          totalValue += holding.quantity * holding.data.prices[index];
        } else {
          hasAllPrices = false;
        }
      });

      if (hasAllPrices) {
        historicalData.push({
          date: new Date(date),
          totalValue,
        });
      }
    });

    return historicalData;
  } catch (error) {
    console.error('Error generating historical data:', error);
    return [];
  }
};

/**
 * Get portfolio performance metrics over time
 */
export const getPortfolioPerformance = async (portfolioId, days = 30) => {
  try {
    const history = await getPortfolioHistory(portfolioId, days);

    if (history.length < 2) {
      // Not enough data, try to generate from holdings
      return { success: false, message: 'Insufficient historical data' };
    }

    const startValue = history[0].totalValue;
    const endValue = history[history.length - 1].totalValue;
    const change = endValue - startValue;
    const changePercent = (change / startValue) * 100;

    // Calculate volatility (standard deviation of daily returns)
    const returns = [];
    for (let i = 1; i < history.length; i++) {
      const dailyReturn = ((history[i].totalValue - history[i - 1].totalValue) / history[i - 1].totalValue) * 100;
      returns.push(dailyReturn);
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    return {
      success: true,
      startValue,
      endValue,
      change,
      changePercent,
      volatility,
      dataPoints: history.length,
    };
  } catch (error) {
    console.error('Error calculating portfolio performance:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get the most recent snapshot
 */
export const getLatestSnapshot = async (portfolioId) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    
    const q = query(
      collection(db, 'portfolio_history'),
      where('userId', '==', user.uid),
      where('portfolioId', '==', portfolioId),
      orderBy('date', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(),
    };
  } catch (error) {
    console.error('Error fetching latest snapshot:', error);
    return null;
  }
};

export default {
  createPortfolioSnapshot,
  getPortfolioHistory,
  generateHistoricalData,
  getPortfolioPerformance,
  getLatestSnapshot,
};
