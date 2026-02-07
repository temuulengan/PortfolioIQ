/**
 * AI-powered portfolio insights component using Groq LLaMA 3.1
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ActivityIndicator, Button, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { generatePortfolioInsights, getRebalancingRecommendations } from '../services/aiService';
import { COLORS } from '../utils/colors';

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
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="robot" size={24} color={COLORS.primary} />
            <Text style={styles.title}>AI Insights</Text>
            <Chip
              mode="outlined"
              compact
              style={styles.chip}
              textStyle={styles.chipText}
            >
              Powered by LLaMA 3.1
            </Chip>
          </View>
          
          <Button
            mode="text"
            onPress={loadInsights}
            disabled={loading}
            compact
          >
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
            {error.includes('API key') && (
              <Button
                mode="outlined"
                onPress={() => {/* Navigate to settings or show instructions */}}
                style={styles.errorButton}
              >
                Setup Instructions
              </Button>
            )}
          </View>
        )}

        {!loading && !error && insights && (
          <View style={styles.insightsContainer}>
            <Text style={styles.insightsText}>{insights}</Text>
            
            <View style={styles.actionsRow}>
              <Button
                mode={showRecommendations ? 'contained' : 'outlined'}
                onPress={() => setShowRecommendations(!showRecommendations)}
                compact
                style={styles.actionButton}
              >
                {showRecommendations ? 'Hide' : 'Show'} Recommendations
              </Button>
            </View>

            {showRecommendations && recommendations && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>
                  Rebalancing Recommendations
                </Text>
                <Text style={styles.recommendationText}>{recommendations}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.disclaimer}>
          AI-generated insights are for informational purposes only and should not be considered financial advice.
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  chip: {
    height: 24,
    backgroundColor: '#F3E5F5',
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 10,
    color: COLORS.primary,
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
  insightsContainer: {
    marginBottom: 12,
  },
  insightsText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionButton: {
    marginHorizontal: 4,
  },
  recommendationsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.textDisabled,
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default AIInsights;
