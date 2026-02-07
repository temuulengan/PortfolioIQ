import React, { useContext } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Surface, ProgressBar, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PortfolioContext } from '../context/PortfolioContext';
import {
  calculatePortfolioBeta,
  calculateVolatility,
  calculateConcentrationRisk,
  calculateDiversificationScore,
  isDiversified,
} from '../services/calculations';
import { RISK_THRESHOLDS, DIVERSIFICATION } from '../utils/constants';
import { COLORS, getRiskLevelColor } from '../utils/colors';

const RiskScreen = () => {
  const { holdings, selectedPortfolio } = useContext(PortfolioContext);

  if (!selectedPortfolio || holdings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="shield-check" size={80} color={COLORS.surfaceVariant} />
        <Text style={styles.emptyTitle}>No Data Available</Text>
        <Text style={styles.emptyText}>
          Add holdings to your portfolio to see risk analysis
        </Text>
      </View>
    );
  }

  const beta = calculatePortfolioBeta(holdings);
  const volatility = calculateVolatility(holdings);
  const concentrationRisk = calculateConcentrationRisk(holdings);
  const diversificationScore = calculateDiversificationScore(holdings);
  const isWellDiversified = isDiversified(holdings);

  const getBetaRiskLevel = (beta) => {
    if (beta < RISK_THRESHOLDS.LOW_BETA) return { level: 'Low', color: COLORS.success };
    if (beta < RISK_THRESHOLDS.MEDIUM_BETA) return { level: 'Medium', color: COLORS.warning };
    return { level: 'High', color: COLORS.critical };
  };

  const getVolatilityRiskLevel = (vol) => {
    if (vol < 10) return { level: 'Low', color: COLORS.success };
    if (vol < RISK_THRESHOLDS.HIGH_VOLATILITY) return { level: 'Medium', color: COLORS.warning };
    return { level: 'High', color: COLORS.critical };
  };

  const getConcentrationRiskLevel = (concentration) => {
    if (concentration < 30) return { level: 'Low', color: COLORS.success };
    if (concentration < RISK_THRESHOLDS.CONCENTRATION_WARNING)
      return { level: 'Medium', color: COLORS.warning };
    return { level: 'High', color: COLORS.critical };
  };

  const getDiversificationColor = (score) => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.warning;
    return COLORS.critical;
  };

  const betaRisk = getBetaRiskLevel(beta);
  const volatilityRisk = getVolatilityRiskLevel(volatility);
  const concentrationRiskLevel = getConcentrationRiskLevel(concentrationRisk);
  const diversificationColor = getDiversificationColor(diversificationScore);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Risk Analysis</Title>
        <Text style={styles.portfolioName}>{selectedPortfolio.name}</Text>
      </View>

      <Surface style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <MaterialCommunityIcons
            name="shield-check"
            size={32}
            color={isWellDiversified ? COLORS.success : COLORS.warning}
          />
          <Text style={styles.summaryTitle}>
            {isWellDiversified ? 'Well Diversified' : 'Needs Diversification'}
          </Text>
        </View>
        <Text style={styles.summaryDescription}>
          {isWellDiversified
            ? 'Your portfolio shows good diversification with acceptable risk levels.'
            : 'Consider adding more holdings or rebalancing to improve diversification.'}
        </Text>
      </Surface>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitle}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={24} color={COLORS.primary} />
              <Title style={styles.cardTitle}>Portfolio Beta</Title>
            </View>
            <Chip
              style={[styles.riskChip, { backgroundColor: betaRisk.color + '20' }]}
              textStyle={{ color: betaRisk.color, fontWeight: '600' }}
            >
              {betaRisk.level} Risk
            </Chip>
          </View>
          
          <Text style={styles.metricValue}>{beta.toFixed(2)}</Text>
          <ProgressBar
            progress={Math.min(beta / 2, 1)}
            color={betaRisk.color}
            style={styles.progressBar}
          />
          
          <Text style={styles.description}>
            Beta measures your portfolio's volatility compared to the market. A beta of 1 means your
            portfolio moves with the market. Lower beta indicates less volatility.
          </Text>

          <View style={styles.referenceContainer}>
            <Text style={styles.referenceText}>• Beta &lt; 0.8: Low Risk</Text>
            <Text style={styles.referenceText}>• Beta 0.8-1.2: Medium Risk</Text>
            <Text style={styles.referenceText}>• Beta &gt; 1.2: High Risk</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitle}>
              <MaterialCommunityIcons name="chart-bell-curve" size={24} color={COLORS.primary} />
              <Title style={styles.cardTitle}>Volatility</Title>
            </View>
            <Chip
              style={[styles.riskChip, { backgroundColor: volatilityRisk.color + '20' }]}
              textStyle={{ color: volatilityRisk.color, fontWeight: '600' }}
            >
              {volatilityRisk.level} Risk
            </Chip>
          </View>
          
          <Text style={styles.metricValue}>{volatility.toFixed(2)}%</Text>
          <ProgressBar
            progress={Math.min(volatility / 30, 1)}
            color={volatilityRisk.color}
            style={styles.progressBar}
          />
          
          <Text style={styles.description}>
            Volatility measures price fluctuations in your portfolio. Higher volatility means
            greater price swings and potentially higher risk.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitle}>
              <MaterialCommunityIcons name="chart-pie" size={24} color={COLORS.primary} />
              <Title style={styles.cardTitle}>Concentration Risk</Title>
            </View>
            <Chip
              style={[
                styles.riskChip,
                { backgroundColor: concentrationRiskLevel.color + '20' },
              ]}
              textStyle={{ color: concentrationRiskLevel.color, fontWeight: '600' }}
            >
              {concentrationRiskLevel.level} Risk
            </Chip>
          </View>
          
          <Text style={styles.metricValue}>{concentrationRisk.toFixed(1)}%</Text>
          <ProgressBar
            progress={concentrationRisk / 100}
            color={concentrationRiskLevel.color}
            style={styles.progressBar}
          />
          
          <Text style={styles.description}>
            Concentration risk shows what percentage of your portfolio is in your top 3 holdings.
            High concentration means less diversification.
          </Text>

          <View style={styles.referenceContainer}>
            <Text style={styles.referenceText}>• &lt; 30%: Well distributed</Text>
            <Text style={styles.referenceText}>• 30-40%: Moderate concentration</Text>
            <Text style={styles.referenceText}>• &gt; 40%: High concentration</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.metricHeader}>
            <View style={styles.metricTitle}>
              <MaterialCommunityIcons name="shield-star" size={24} color={COLORS.primary} />
              <Title style={styles.cardTitle}>Diversification Score</Title>
            </View>
            <Chip
              style={[styles.riskChip, { backgroundColor: diversificationColor + '20' }]}
              textStyle={{ color: diversificationColor, fontWeight: '600' }}
            >
              {diversificationScore >= 60 ? 'Good' : 'Needs Work'}
            </Chip>
          </View>
          
          <Text style={styles.metricValue}>{diversificationScore.toFixed(0)}/100</Text>
          <ProgressBar
            progress={diversificationScore / 100}
            color={diversificationColor}
            style={styles.progressBar}
          />
          
          <Text style={styles.description}>
            Overall diversification score based on number of holdings and allocation distribution.
            Aim for a score of 60 or higher.
          </Text>

          <Surface style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Holdings</Text>
              <Text style={styles.statValue}>{holdings.length}</Text>
              <Text style={styles.statHint}>
                {holdings.length >= DIVERSIFICATION.MIN_HOLDINGS_DIVERSIFIED
                  ? 'Good'
                  : `Add ${DIVERSIFICATION.MIN_HOLDINGS_DIVERSIFIED - holdings.length} more`}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Max Position</Text>
              <Text style={styles.statValue}>{concentrationRisk.toFixed(0)}%</Text>
              <Text style={styles.statHint}>
                {concentrationRisk <= DIVERSIFICATION.MAX_SINGLE_POSITION_PERCENT
                  ? 'Good'
                  : 'Too high'}
              </Text>
            </View>
          </Surface>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.metricTitle}>
            <MaterialCommunityIcons name="lightbulb-on" size={24} color={COLORS.gold} />
            <Title style={styles.cardTitle}>Recommendations</Title>
          </View>

          <View style={styles.recommendationsList}>
            {holdings.length < DIVERSIFICATION.MIN_HOLDINGS_DIVERSIFIED && (
              <View style={styles.recommendation}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.warning} />
                <Text style={styles.recommendationText}>
                  Add more holdings to improve diversification (minimum {DIVERSIFICATION.MIN_HOLDINGS_DIVERSIFIED} recommended)
                </Text>
              </View>
            )}

            {concentrationRisk > RISK_THRESHOLDS.CONCENTRATION_WARNING && (
              <View style={styles.recommendation}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.warning} />
                <Text style={styles.recommendationText}>
                  Rebalance portfolio to reduce concentration in top holdings
                </Text>
              </View>
            )}

            {beta > RISK_THRESHOLDS.MEDIUM_BETA && (
              <View style={styles.recommendation}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.warning} />
                <Text style={styles.recommendationText}>
                  Consider adding lower-beta stocks to reduce overall portfolio risk
                </Text>
              </View>
            )}

            {diversificationScore >= 80 && (
              <View style={styles.recommendation}>
                <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
                <Text style={styles.recommendationText}>
                  Excellent diversification! Keep monitoring and rebalancing regularly
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  portfolioName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  summaryCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  summaryDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  riskChip: {
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginVertical: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  referenceContainer: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  referenceText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statHint: {
    fontSize: 11,
    color: COLORS.textDisabled,
  },
  recommendationsList: {
    marginTop: 12,
    gap: 12,
  },
  recommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default RiskScreen;
