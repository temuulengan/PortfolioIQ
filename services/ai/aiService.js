import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import {
  createNotification,
  NOTIFICATION_TYPES,
} from '../notifications/notificationService';

/**
 * AI service.
 *
 * The Groq API key is deliberately NOT held here. Anything bundled into the app
 * — including values inlined by react-native-dotenv — can be extracted from a
 * shipped binary, so every model call goes through an authenticated Cloud
 * Function that holds the key (see functions/index.js).
 */

let functionsInstance = null;
const fns = () => {
  if (!functionsInstance) functionsInstance = getFunctions(getApp());
  return functionsInstance;
};

const call = async (name, payload) => {
  const callable = httpsCallable(fns(), name);
  const result = await callable(payload);
  return result.data || {};
};

const friendlyError = (error, fallback) => {
  if (error?.code === 'functions/unauthenticated') {
    return 'Please sign in again to use AI features.';
  }
  if (error?.code === 'functions/not-found') {
    return 'AI features are not deployed yet. Run: firebase deploy --only functions';
  }
  return fallback;
};

/**
 * Generate AI portfolio insights
 * @param {Object} portfolioData - Portfolio data including holdings, performance, risk metrics
 * @returns {Promise<string>} AI-generated insights
 */
export const generatePortfolioInsights = async (portfolioData) => {
  try {
    const { holdings = [], ...rest } = portfolioData || {};

    // Send only the fields the prompt needs — not whole Firestore documents.
    const { insights } = await call('generatePortfolioInsights', {
      ...rest,
      holdings: holdings.map((h) => ({
        symbol: h.symbol,
        quantity: h.quantity,
        currentPrice: h.currentPrice,
      })),
    });

    if (!insights) return 'Unable to generate insights at this time.';

    await createNotification({
      type: NOTIFICATION_TYPES.AI_INSIGHT,
      title: 'New AI Insights Available',
      message: insights.substring(0, 100) + (insights.length > 100 ? '...' : ''),
      data: { fullInsights: insights },
    });

    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return friendlyError(error, 'Unable to generate insights. Please try again later.');
  }
};

/**
 * Get AI recommendations for portfolio rebalancing
 * @param {Array} holdings - Array of portfolio holdings
 * @returns {Promise<string>} AI-generated rebalancing recommendations
 */
export const getRebalancingRecommendations = async (holdings) => {
  try {
    const { recommendations } = await call('getRebalancingRecommendations', {
      holdings: (holdings || []).map((h) => ({
        symbol: h.symbol,
        quantity: h.quantity,
        currentPrice: h.currentPrice,
      })),
    });
    return recommendations || 'Unable to generate recommendations.';
  } catch (error) {
    console.error('Error generating rebalancing recommendations:', error);
    return friendlyError(error, 'Unable to generate recommendations. Please try again later.');
  }
};

/**
 * Get AI explanation for risk metrics
 * @param {Object} riskMetrics - Risk metrics (beta, volatility, etc.)
 * @returns {Promise<string>} AI-generated explanation
 */
export const explainRiskMetrics = async (riskMetrics) => {
  try {
    const { explanation } = await call('explainRiskMetrics', riskMetrics || {});
    return explanation || 'Unable to generate explanation.';
  } catch (error) {
    console.error('Error explaining risk metrics:', error);
    return friendlyError(error, 'Unable to generate explanation. Please try again later.');
  }
};

export default {
  generatePortfolioInsights,
  getRebalancingRecommendations,
  explainRiskMetrics,
};
