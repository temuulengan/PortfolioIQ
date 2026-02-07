import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency, formatPercent, formatRelativeTime } from '../utils/helpers';
import {
  calculateHoldingValue,
  calculateCostBasis,
  calculateGainLoss,
  calculateGainLossPercent,
} from '../services/calculations';

const HoldingCard = ({ holding, onPress, onLongPress }) => {
  const currentValue = calculateHoldingValue(holding.quantity, holding.currentPrice);
  const costBasis = calculateCostBasis(holding.quantity, holding.purchasePrice);
  const gainLoss = calculateGainLoss(holding.quantity, holding.purchasePrice, holding.currentPrice);
  const gainLossPercent = calculateGainLossPercent(holding.purchasePrice, holding.currentPrice);

  const isPositive = gainLoss >= 0;

  return (
    <Card 
      style={styles.card} 
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.symbol}>{holding.symbol}</Text>
            {holding.name && (
              <Text style={styles.name} numberOfLines={1}>
                {holding.name}
              </Text>
            )}
          </View>
          <MaterialCommunityIcons 
            name="dots-vertical" 
            size={20} 
            color="#757575" 
          />
        </View>

        <View style={styles.mainInfo}>
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              {formatCurrency(holding.currentPrice)}
            </Text>
            <View style={styles.changeContainer}>
              <MaterialCommunityIcons 
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={16}
                color={isPositive ? '#4CAF50' : '#B00020'}
              />
              <Text 
                style={[
                  styles.changeText,
                  { color: isPositive ? '#4CAF50' : '#B00020' }
                ]}
              >
                {formatPercent(gainLossPercent)}
              </Text>
            </View>
          </View>

          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Shares</Text>
            <Text style={styles.quantityValue}>{holding.quantity}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Market Value</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(currentValue)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Cost</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(costBasis)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Gain/Loss</Text>
            <Text 
              style={[
                styles.detailValue,
                styles.gainLossText,
                { color: isPositive ? '#4CAF50' : '#B00020' }
              ]}
            >
              {formatCurrency(gainLoss)}
            </Text>
          </View>
        </View>

        {holding.lastUpdated && (
          <Text style={styles.lastUpdated}>
            Updated {formatRelativeTime(holding.lastUpdated)}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  name: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  mainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    flex: 1,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quantityContainer: {
    alignItems: 'flex-end',
  },
  quantityLabel: {
    fontSize: 12,
    color: '#757575',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  detailsContainer: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#757575',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000000',
  },
  gainLossText: {
    fontWeight: '600',
  },
  lastUpdated: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: 8,
    textAlign: 'right',
  },
});

export default HoldingCard;
