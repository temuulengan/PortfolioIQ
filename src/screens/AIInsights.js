/**
 * AI-powered portfolio insights component using Groq LLaMA 3.1
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ActivityIndicator, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { generatePortfolioInsights, getRebalancingRecommendations } from '../../services/ai/aiService';
import { COLORS } from '../../shared/colors';
import {
  calculateVolatility,
  calculateConcentrationRisk,
  calculateDiversificationScore,
  calculateSharpeRatio,
} from '../../shared/calculations';

const splitToSentences = (text = '') =>
  text
    .split(/(?<=[.!?])\s+/)
    .map(item => item.trim())
    .filter(Boolean);

const stripMarkdown = (text = '') =>
  text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const parseList = (text = '') =>
  text
    .split('\n')
    .map(item => item.replace(/^[-*\d.)\s]+/, '').trim())
    .map(item => stripMarkdown(item))
    .filter(Boolean);

const parseMarkdownLines = (text = '') =>
  text
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => item.replace(/^[-*\d.)\s]+/, ''))
    .map(item => stripMarkdown(item))
    .filter(Boolean);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getHealthCardCopy = ({ gainLossPercent, concentration, volatility, holdingsCount }) => {
  let headline = 'Stable profile';
  let summary = 'Performance is steady with manageable portfolio risk.';

  if (gainLossPercent >= 8 && concentration < 38 && volatility < 18) {
    headline = 'Strong growth, balanced risk';
    summary = 'Return is strong and risk concentration is currently controlled.';
  } else if (gainLossPercent >= 0 && concentration >= 38) {
    headline = 'Growth with concentration risk';
    summary = 'Portfolio is positive, but top positions carry most of the downside risk.';
  } else if (gainLossPercent < 0 && volatility < 18) {
    headline = 'Drawdown, but controlled risk';
    summary = 'Portfolio is below cost basis, while volatility remains moderate.';
  } else if (gainLossPercent < 0 && volatility >= 18) {
    headline = 'High pressure, elevated risk';
    summary = 'Negative return and higher volatility suggest a defensive rebalance.';
  }

  return {
    headline,
    summary,
    basedOn: `Based on ${holdingsCount} holdings and latest market prices`,
  };
};

const SemiGauge = ({ value }) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const gaugeValue = clamp(safeValue, 0, 100);
  const strokeWidth = 11;
  const radius = 46 - Math.ceil(strokeWidth / 2);
  const centerX = 56;
  const centerY = 56;

  const startX = centerX - radius;
  const startY = centerY;
  const endX = centerX + radius;
  const endY = centerY;

  const trackPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  const progressAngle = Math.PI * (1 - gaugeValue / 100);
  const progressX = centerX + radius * Math.cos(progressAngle);
  const progressY = centerY - radius * Math.sin(progressAngle);

  const progressPath =
    gaugeValue <= 0
      ? null
      : gaugeValue >= 100
      ? trackPath
      : `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${progressX.toFixed(3)} ${progressY.toFixed(3)}`;

  return (
    <View style={styles.gaugeWrap}>
      <Svg width={112} height={70}>
        <Path
          d={trackPath}
          stroke={COLORS.chartGrid || '#E8E4DF'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {progressPath && (
          <Path
            d={progressPath}
            stroke={COLORS.chartLine || COLORS.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </Svg>
      <Text style={styles.gaugeValue}>{Math.round(gaugeValue)}%</Text>
    </View>
  );
};

const AIInsights = ({ holdings, portfolioValue, totalGainLoss }) => {
  const [insights, setInsights] = useState(null);
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const loadInsights = async () => {
    if (holdings.length === 0) {
      setError('Add holdings to your portfolio to get AI insights');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare portfolio data object
      const portfolioData = {
        totalValue: portfolioValue,
        totalGainLoss: totalGainLoss,
        gainLossPercent: portfolioValue > 0 ? (totalGainLoss / portfolioValue) * 100 : 0,
        holdings: holdings,
        diversificationScore: null, // Can be calculated if needed
        riskLevel: null,
        beta: null,
        volatility: null,
      };

      // Generate portfolio insights
      const insightsData = await generatePortfolioInsights(portfolioData);
      
      setInsights(insightsData);
    } catch (err) {
      console.error('AI Insights error:', err);
      if (err.message.includes('GROQ_API_KEY')) {
        setError('Groq API key not configured. Get your free key at console.groq.com');
      } else {
        setError(err.message || 'Failed to generate AI insights');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    if (holdings.length === 0) return;

    try {
      setLoading(true);
      const recsData = await getRebalancingRecommendations(holdings);
      setRecommendations(recsData);
    } catch (err) {
      console.error('Recommendations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (holdings.length > 0) {
      loadInsights();
    }
  }, [holdings.length]);

  useEffect(() => {
    if (showRecommendations && holdings.length > 0 && !recommendations) {
      loadRecommendations();
    }
  }, [showRecommendations]);

  const gainLossPercent = portfolioValue > 0 ? (totalGainLoss / portfolioValue) * 100 : 0;
  const volatility = holdings.length > 1 ? calculateVolatility(holdings) : 0;
  const concentration = holdings.length > 0 ? calculateConcentrationRisk(holdings) : 0;
  const diversificationScore = holdings.length > 0 ? calculateDiversificationScore(holdings) : 0;
  const sharpe = volatility > 0 ? calculateSharpeRatio(gainLossPercent, 3, volatility) : 0;

  const scoreFromReturn = clamp(50 + (gainLossPercent * 1.5), 20, 90);
  const concentrationPenalty = clamp((concentration - 30) * 0.6, 0, 25);
  const volatilityPenalty = clamp((volatility - 12) * 0.8, 0, 20);
  const diversificationBonus = clamp((diversificationScore - 50) * 0.4, 0, 15);
  const healthScore = clamp(
    scoreFromReturn - concentrationPenalty - volatilityPenalty + diversificationBonus,
    0,
    100
  );

  const riskLevel = healthScore >= 75 ? 'Low risk' : healthScore >= 55 ? 'Medium risk' : 'High risk';
  const riskColor = healthScore >= 75 ? COLORS.success : healthScore >= 55 ? COLORS.warning : COLORS.error;

  const insightSentences = splitToSentences(insights || '');
  const healthCopy = getHealthCardCopy({
    gainLossPercent,
    concentration,
    volatility,
    holdingsCount: holdings.length,
  });

  const whatThisMeans = insightSentences.slice(2, 5).length
    ? insightSentences.slice(2, 5)
    : [
        gainLossPercent >= 0
          ? 'Your portfolio is showing positive return over your total cost basis.'
          : 'Your portfolio is currently below cost basis and may need rebalancing.',
        concentration > 40
          ? 'Risk is concentrated in a few positions, increasing downside sensitivity.'
          : 'Position concentration is moderate and currently manageable.',
        diversificationScore < 60
          ? 'Diversification can be improved by adding uncorrelated sectors or asset classes.'
          : 'Diversification is in an acceptable range for current holdings.',
      ];

  const actionItems = parseList(recommendations).slice(0, 3);
  const recommendationLines = parseMarkdownLines(recommendations);
  const fallbackActions = [
    concentration > 40
      ? 'Reduce top holding size to lower single-asset concentration risk.'
      : 'Keep current allocation but monitor concentration weekly.',
    diversificationScore < 60
      ? 'Add sector balance using defensive assets (e.g., utilities/healthcare ETF).'
      : 'Maintain diversification and rebalance when drift exceeds target.',
    'Recheck in 7 days after price refresh to validate trend stability.',
  ];
  const displayedActions = actionItems.length ? actionItems : fallbackActions;

  if (holdings.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="robot" size={48} color={COLORS.surfaceVariant} />
            <Text style={styles.emptyText}>
              Add holdings to get AI-powered insights
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="robot" size={22} color={COLORS.primary} />
              <Text style={styles.title}>AI Insights</Text>
            </View>
            <Button mode="text" onPress={loadInsights} disabled={loading} compact>
              Refresh
            </Button>
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Analyzing your portfolio...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={32} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!loading && !error && (
            <>
              <View style={styles.healthCard}>
                <View style={styles.healthLeft}>
                  <SemiGauge value={healthScore} />
                </View>
                <View style={styles.healthRight}>
                  <Text style={styles.headline}>{healthCopy.headline}</Text>
                  <Text style={styles.summary}>{healthCopy.summary}</Text>
                  <Chip style={[styles.riskChip, { backgroundColor: `${riskColor}20` }]} textStyle={{ color: riskColor, fontWeight: '700' }}>
                    {riskLevel}
                  </Chip>
                  <Text style={styles.basedOn}>{healthCopy.basedOn}</Text>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>3 Key Insights</Text>
                <View style={styles.chipsWrap}>
                  <View style={styles.keyInsightPill}>
                    <View style={[styles.keyInsightDot, { backgroundColor: '#22C55E' }]} />
                    <Text style={styles.keyChipText}>Return: {gainLossPercent.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.keyInsightPill}>
                    <View style={[styles.keyInsightDot, { backgroundColor: '#D97706' }]} />
                    <Text style={styles.keyChipText}>
                      Volatility: {volatility < 10 ? 'Low' : volatility < 20 ? 'Medium' : 'High'}
                    </Text>
                  </View>
                  <View style={styles.keyInsightPill}>
                    <View style={[styles.keyInsightDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.keyChipText}>Sharpe: {Number.isFinite(sharpe) ? sharpe.toFixed(2) : 'N/A'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>What This Means</Text>
                {whatThisMeans.map((item, idx) => (
                  <View key={`${item}-${idx}`} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Action Box</Text>
                {displayedActions.map((item, idx) => (
                  <View key={`${item}-${idx}`} style={styles.actionRow}>
                    <MaterialCommunityIcons
                      name={idx === 0 ? 'arrow-down-circle' : idx === 1 ? 'plus-circle' : 'clock-outline'}
                      size={18}
                      color={idx === 0 ? COLORS.error : idx === 1 ? COLORS.warning : COLORS.info}
                    />
                    <Text style={styles.actionText}>{item}</Text>
                  </View>
                ))}

                <View style={styles.actionsRow}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowRecommendations(!showRecommendations)}
                    compact
                    style={styles.actionButton}
                    contentStyle={styles.changeButtonContent}
                    labelStyle={styles.changeButtonLabel}
                    icon={showRecommendations ? 'chevron-up' : 'tune-variant'}
                  >
                    {showRecommendations ? 'Hide details' : 'If I change this...'}
                  </Button>
                </View>

                {showRecommendations && recommendations && (
                  <View style={styles.recommendationsContainer}>
                    <Text style={styles.recommendationsTitle}>Detailed Recommendation Notes</Text>
                    {recommendationLines.map((line, idx) => (
                      <View key={`${line}-${idx}`} style={styles.recommendationRow}>
                        <Text style={styles.recommendationBullet}>•</Text>
                        <Text style={styles.recommendationText}>{line}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          <Text style={styles.disclaimer}>
            Deterministic metrics are computed locally; AI text is for explanation only.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    borderRadius: 14,
    backgroundColor: '#FCFCFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  healthCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderColor: '#1F1F1F',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  healthLeft: {
    width: 116,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  healthRight: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  headline: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  summary: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 10,
  },
  riskChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  basedOn: {
    fontSize: 11,
    color: COLORS.textDisabled,
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: '#F7F7F7',
    borderColor: '#1F1F1F',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keyChip: {
    backgroundColor: '#FDFDFD',
    borderColor: '#1F1F1F',
    borderWidth: 1,
    borderRadius: 18,
  },
  keyInsightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDFDFD',
    borderColor: '#1F1F1F',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  keyInsightDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  keyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    fontSize: 16,
    marginRight: 6,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDFDFD',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  actionText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 18,
    borderColor: '#1F1F1F',
    alignSelf: 'flex-start',
    backgroundColor: '#FDFDFD',
  },
  changeButtonContent: {
    height: 34,
    paddingHorizontal: 6,
  },
  changeButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: COLORS.textPrimary,
  },
  recommendationsContainer: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  recommendationsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textPrimary,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recommendationBullet: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginRight: 6,
    lineHeight: 19,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.textDisabled,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  gaugeWrap: {
    width: 112,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  gaugeValue: {
    position: 'absolute',
    top: 24,
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
});

export default AIInsights;
