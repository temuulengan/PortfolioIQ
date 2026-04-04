import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { formatCurrency, formatPercent, formatRelativeTime } from '../../shared/helpers';
import {
  calculateHoldingValue,
  calculateCostBasis,
  calculateGainLoss,
  calculateGainLossPercent,
} from '../../shared/calculations';
import { COLORS, Spacing } from '../../shared/colors';

const HoldingCard = ({ holding, onPress, onLongPress }) => {
  const currentValue = calculateHoldingValue(holding.quantity, holding.currentPrice);
  const costBasis = calculateCostBasis(holding.quantity, holding.purchasePrice);
  const gainLoss = calculateGainLoss(holding.quantity, holding.purchasePrice, holding.currentPrice);
  const gainLossPercent = calculateGainLossPercent(holding.purchasePrice, holding.currentPrice);
  const isPositive = gainLoss >= 0;

  return (
    <TouchableOpacity
      style={styles.touchable}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.82}
    >
      <View style={styles.row}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>{holding.symbol?.[0] || '?'}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {holding.name || holding.symbol}{' '}
            <Text style={styles.ticker}>- {holding.symbol}</Text>
          </Text>
          <Text style={styles.subText} numberOfLines={1}>
            {formatCurrency(costBasis)} ({formatPercent(gainLossPercent)})
          </Text>
        </View>

        <View style={styles.right}>
          <Text style={styles.price}>{formatCurrency(currentValue)}</Text>
          <View style={[styles.badge, isPositive ? styles.gainBadge : styles.lossBadge]}>
            <Text style={[styles.badgeText, isPositive ? styles.gainText : styles.lossText]}>
              {isPositive ? '+' : ''}{gainLossPercent.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Shares: {holding.quantity}</Text>
        <Text style={styles.metaText}>Price: {formatCurrency(holding.currentPrice)}</Text>
        <Text style={[styles.metaText, { color: isPositive ? COLORS.gainText : COLORS.lossText }]}>
          P/L: {formatCurrency(gainLoss)}
        </Text>
      </View>

      {holding.lastUpdated && (
        <Text style={styles.lastUpdated}>Updated {formatRelativeTime(holding.lastUpdated)}</Text>
      )}

      <View style={styles.divider} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginHorizontal: Spacing.screenHorizontal,
    marginTop: 6,
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ticker: {
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  subText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  badge: {
    borderRadius: Spacing.badgeRadius,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gainBadge: {
    backgroundColor: COLORS.gainBg,
  },
  lossBadge: {
    backgroundColor: COLORS.lossBg,
  },
  gainText: {
    color: COLORS.gainText,
  },
  lossText: {
    color: COLORS.lossText,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  lastUpdated: {
    fontSize: 11,
    color: COLORS.textDisabled,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginTop: 10,
  },
});

export default HoldingCard;
