import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Title, Paragraph, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency, formatPercent } from '../../shared/helpers';
import { 
  calculatePortfolioValue,
  calculatePortfolioCostBasis,
  calculatePortfolioGainLoss,
  calculatePortfolioGainLossPercent 
} from '../../shared/calculations';
import { COLORS, Shadow, Spacing } from '../../shared/colors';

const PortfolioCard = ({ portfolio, holdings = [], onPress }) => {
  const totalValue = calculatePortfolioValue(holdings);
  const costBasis = calculatePortfolioCostBasis(holdings);
  const gainLoss = calculatePortfolioGainLoss(holdings);
  const gainLossPercent = calculatePortfolioGainLossPercent(holdings);

  const isPositive = gainLoss >= 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons 
              name="briefcase" 
              size={24} 
              color={COLORS.primary}
              style={styles.icon}
            />
            <View>
              <Title style={styles.title}>{portfolio.name}</Title>
              {portfolio.description && (
                <Paragraph style={styles.description} numberOfLines={1}>
                  {portfolio.description}
                </Paragraph>
              )}
            </View>
          </View>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={24} 
            color={COLORS.textSecondary}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Value</Text>
            <Text style={styles.statValue}>
              {formatCurrency(totalValue, portfolio.currency)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Cost Basis</Text>
            <Text style={styles.statValue}>
              {formatCurrency(costBasis, portfolio.currency)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Gain/Loss</Text>
            <View style={styles.gainLossContainer}>
              <Text 
                style={[
                  styles.gainLossValue,
                  { color: isPositive ? COLORS.gainText : COLORS.lossText }
                ]}
              >
                {formatCurrency(gainLoss, portfolio.currency)}
              </Text>
              <Text 
                style={[
                  styles.gainLossPercent,
                  { color: isPositive ? COLORS.gainText : COLORS.lossText }
                ]}
              >
                ({formatPercent(gainLossPercent)})
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Holdings</Text>
            <Text style={styles.statValue}>{holdings.length}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.screenHorizontal,
    marginVertical: 8,
    borderRadius: Spacing.cardRadius,
    backgroundColor: COLORS.surface,
    ...Shadow.card,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 0,
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 12,
  },
  statsContainer: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  gainLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gainLossValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  gainLossPercent: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default PortfolioCard;
