import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '@env';
import { createNotification, NOTIFICATION_TYPES } from '../notifications/notificationService';

// Initialize Groq client
const groq = new Groq({
  apiKey: GROQ_API_KEY || 'your_api_key_here',
  dangerouslyAllowBrowser: true, // Required for React Native
});

/**
 * Generate AI portfolio insights using LLaMA 3.1
 * @param {Object} portfolioData - Portfolio data including holdings, performance, risk metrics
 * @returns {Promise<string>} AI-generated insights
 */
export const generatePortfolioInsights = async (portfolioData) => {
  try {
    const {
      totalValue,
      totalGainLoss,
      gainLossPercent,
      holdings,
      diversificationScore,
      riskLevel,
      beta,
      volatility,
    } = portfolioData;

    const prompt = `You are a professional financial advisor analyzing an investment portfolio. 

Portfolio Summary:
- Total Value: $${totalValue?.toFixed(2) || 0}
- Total Gain/Loss: $${totalGainLoss?.toFixed(2) || 0} (${gainLossPercent?.toFixed(2) || 0}%)
- Number of Holdings: ${holdings?.length || 0}
- Diversification Score: ${diversificationScore || 'N/A'}/100
- Risk Level: ${riskLevel || 'N/A'}
- Portfolio Beta: ${beta?.toFixed(2) || 'N/A'}
- Volatility: ${volatility?.toFixed(2) || 'N/A'}%

Top Holdings:
${holdings?.slice(0, 5).map((h, i) => `${i + 1}. ${h.symbol}: $${(h.quantity * h.currentPrice).toFixed(2)} (${((h.quantity * h.currentPrice / totalValue) * 100).toFixed(1)}%)`).join('\n') || 'No holdings'}

Provide a concise analysis (3-4 sentences) covering:
1. Overall portfolio health and performance
2. Risk assessment and diversification quality
3. One specific actionable recommendation

Keep it professional, clear, and actionable.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile', // Using LLaMA 3.3 70B model
      temperature: 0.7,
      max_tokens: 300,
    });

    const insights = completion.choices[0]?.message?.content || 'Unable to generate insights at this time.';
    
    // Create notification for new AI insights
    await createNotification({
      type: NOTIFICATION_TYPES.INSIGHT,
      title: 'New AI Insights Available',
      message: insights.substring(0, 100) + (insights.length > 100 ? '...' : ''),
      data: { fullInsights: insights },
    });
    
    return insights;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    if (error.message?.includes('API key')) {
      return 'Please add your Groq API key to .env file. Get a free key at https://console.groq.com';
    }
    return 'Unable to generate insights. Please try again later.';
  }
};

/**
 * Get AI recommendations for portfolio rebalancing
 * @param {Array} holdings - Array of portfolio holdings
 * @param {Object} targetAllocation - Desired allocation percentages
 * @returns {Promise<string>} AI-generated rebalancing recommendations
 */
export const getRebalancingRecommendations = async (holdings, targetAllocation) => {
  try {
    const prompt = `As a financial advisor, analyze this portfolio and suggest rebalancing actions.

Current Holdings:
${holdings.map((h, i) => `${i + 1}. ${h.symbol}: ${h.quantity} shares at $${h.currentPrice}, Total: $${(h.quantity * h.currentPrice).toFixed(2)}`).join('\n')}

Provide 2-3 specific rebalancing recommendations to improve diversification and risk-adjusted returns. Be concise and actionable.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.6,
      max_tokens: 250,
    });

    return completion.choices[0]?.message?.content || 'Unable to generate recommendations.';
  } catch (error) {
    console.error('Error generating rebalancing recommendations:', error);
    return 'Unable to generate recommendations. Please try again later.';
  }
};

/**
 * Get AI explanation for risk metrics
 * @param {Object} riskMetrics - Risk metrics (beta, volatility, etc.)
 * @returns {Promise<string>} AI-generated explanation
 */
export const explainRiskMetrics = async (riskMetrics) => {
  try {
    const { beta, volatility, concentrationRisk, diversificationScore } = riskMetrics;

    const prompt = `Explain these portfolio risk metrics in simple terms for a retail investor:

- Beta: ${beta?.toFixed(2) || 'N/A'}
- Volatility: ${volatility?.toFixed(2) || 'N/A'}%
- Concentration Risk: ${concentrationRisk?.toFixed(2) || 'N/A'}%
- Diversification Score: ${diversificationScore || 'N/A'}/100

Provide a brief explanation (2-3 sentences) that helps the investor understand their portfolio's risk profile.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile', // Using LLaMA 3.3 70B model
      temperature: 0.5,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || 'Unable to generate explanation.';
  } catch (error) {
    console.error('Error explaining risk metrics:', error);
    return 'Unable to generate explanation. Please try again later.';
  }
};

export default {
  generatePortfolioInsights,
  getRebalancingRecommendations,
  explainRiskMetrics,
};
