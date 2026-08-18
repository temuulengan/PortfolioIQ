/**
 * PortfolioIQ Cloud Functions
 *
 * These exist so the Groq API key never ships inside the mobile app. Anything
 * bundled into the client — including values injected by react-native-dotenv —
 * can be extracted from the APK/IPA, so the key lives here and the app calls
 * these authenticated endpoints instead.
 *
 * Setup:
 *   firebase functions:secrets:set GROQ_API_KEY
 *   firebase deploy --only functions
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const Groq = require('groq-sdk');

const GROQ_API_KEY = defineSecret('GROQ_API_KEY');

const MODEL = 'llama-3.3-70b-versatile';

const callGroq = async (prompt, { temperature = 0.7, maxTokens = 300 }) => {
  const groq = new Groq({ apiKey: GROQ_API_KEY.value() });

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: MODEL,
    temperature,
    max_tokens: maxTokens,
  });

  return completion.choices[0]?.message?.content || '';
};

const requireAuth = (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use AI features.');
  }
};

const num = (value, digits = 2) =>
  Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : 'N/A';

/** Summarise a portfolio's health, risk and one recommendation. */
exports.generatePortfolioInsights = onCall(
  { secrets: [GROQ_API_KEY], cors: true },
  async (request) => {
    requireAuth(request);

    const {
      totalValue,
      totalGainLoss,
      gainLossPercent,
      holdings = [],
      diversificationScore,
      riskLevel,
      beta,
      volatility,
    } = request.data || {};

    const topHoldings = holdings.slice(0, 5).map((h, i) => {
      const value = Number(h.quantity) * Number(h.currentPrice);
      const share = Number(totalValue) > 0 ? (value / Number(totalValue)) * 100 : 0;
      return `${i + 1}. ${h.symbol}: $${num(value)} (${num(share, 1)}%)`;
    });

    const prompt = `You are a professional financial advisor analyzing an investment portfolio.

Portfolio Summary:
- Total Value: $${num(totalValue)}
- Total Gain/Loss: $${num(totalGainLoss)} (${num(gainLossPercent)}%)
- Number of Holdings: ${holdings.length}
- Diversification Score: ${diversificationScore ?? 'N/A'}/100
- Risk Level: ${riskLevel ?? 'N/A'}
- Portfolio Beta: ${num(beta)}
- Volatility: ${num(volatility)}%

Top Holdings:
${topHoldings.join('\n') || 'No holdings'}

Provide a concise analysis (3-4 sentences) covering:
1. Overall portfolio health and performance
2. Risk assessment and diversification quality
3. One specific actionable recommendation

Keep it professional, clear, and actionable.`;

    try {
      const insights = await callGroq(prompt, { temperature: 0.7, maxTokens: 300 });
      return { insights };
    } catch (error) {
      console.error('generatePortfolioInsights failed:', error);
      throw new HttpsError('internal', 'Unable to generate insights right now.');
    }
  }
);

/** Suggest rebalancing actions for a set of holdings. */
exports.getRebalancingRecommendations = onCall(
  { secrets: [GROQ_API_KEY], cors: true },
  async (request) => {
    requireAuth(request);

    const { holdings = [] } = request.data || {};
    if (!holdings.length) {
      throw new HttpsError('invalid-argument', 'No holdings supplied.');
    }

    const lines = holdings.map(
      (h, i) =>
        `${i + 1}. ${h.symbol}: ${h.quantity} shares at $${h.currentPrice}, Total: $${num(
          Number(h.quantity) * Number(h.currentPrice)
        )}`
    );

    const prompt = `As a financial advisor, analyze this portfolio and suggest rebalancing actions.

Current Holdings:
${lines.join('\n')}

Provide 2-3 specific rebalancing recommendations to improve diversification and risk-adjusted returns. Be concise and actionable.`;

    try {
      const recommendations = await callGroq(prompt, { temperature: 0.6, maxTokens: 250 });
      return { recommendations };
    } catch (error) {
      console.error('getRebalancingRecommendations failed:', error);
      throw new HttpsError('internal', 'Unable to generate recommendations right now.');
    }
  }
);

/** Explain risk metrics in plain language. */
exports.explainRiskMetrics = onCall(
  { secrets: [GROQ_API_KEY], cors: true },
  async (request) => {
    requireAuth(request);

    const { beta, volatility, concentrationRisk, diversificationScore } = request.data || {};

    const prompt = `Explain these portfolio risk metrics in simple terms for a retail investor:

- Beta: ${num(beta)}
- Volatility: ${num(volatility)}%
- Concentration Risk: ${num(concentrationRisk)}%
- Diversification Score: ${diversificationScore ?? 'N/A'}/100

Provide a brief explanation (2-3 sentences) that helps the investor understand their portfolio's risk profile.`;

    try {
      const explanation = await callGroq(prompt, { temperature: 0.5, maxTokens: 200 });
      return { explanation };
    } catch (error) {
      console.error('explainRiskMetrics failed:', error);
      throw new HttpsError('internal', 'Unable to generate explanation right now.');
    }
  }
);
