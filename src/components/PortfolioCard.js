import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency, formatPercent } from '../../shared/helpers';
import { 
  calculatePortfolioValue,
  calculatePortfolioCostBasis,
  calculatePortfolioGainLoss,
  calculatePortfolioGainLossPercent 
} from '../../shared/calculations';

const PortfolioCard = ({ portfolio, holdings = [], onPress }) => {
  const totalValue = calculatePortfolioValue(holdings);
  const costBasis = calculatePortfolioCostBasis(holdings);
  const gainLoss = calculatePortfolioGainLoss(holdings);
  const gainLossPercent = calculatePortfolioGainLossPercent(holdings);

  const isPositive = gainLoss >= 0;

  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons 
              name="briefcase" 
              size={24} 
              color="#6200EE" 
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
            color="#757575" 
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
                  { color: isPositive ? '#4CAF50' : '#B00020' }
                ]}
              >
                {formatCurrency(gainLoss, portfolio.currency)}
              </Text>
              <Text 
                style={[
                  styles.gainLossPercent,
                  { color: isPositive ? '#4CAF50' : '#B00020' }
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
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
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
    fontWeight: 'bold',
    marginBottom: 0,
  },
  description: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
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
    fontSize: 14,
    color: '#757575',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  gainLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gainLossValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  gainLossPercent: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default PortfolioCard;
