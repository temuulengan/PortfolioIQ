import React, { useContext, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Title,
  Card,
  FAB,
  Surface,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PortfolioContext } from '../context/PortfolioContext';
import { AuthContext } from '../context/AuthContext';
import AIInsights from '../components/AIInsights';
import { formatCurrency, formatPercent } from '../../shared/helpers';
import { COLORS, getGainLossColor } from '../../shared/colors';
import {
  calculatePortfolioValue,
  calculatePortfolioCostBasis,
  calculatePortfolioGainLoss,
  calculatePortfolioGainLossPercent,
  calculateGainLossPercent,
  calculateAllocation,
  getTopPerformers,
} from '../../shared/calculations';

const DashboardScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const {
    portfolios,
    selectedPortfolio,
    holdings,
    loading,
    refreshing,
    loadPortfolios,
    refreshPrices,
  } = useContext(PortfolioContext);

  useEffect(() => {
    loadPortfolios();
  }, []);

  const handleRefresh = async () => {
    await Promise.all([loadPortfolios(), refreshPrices()]);
  };

  const totalValue = calculatePortfolioValue(holdings);
  const costBasis = calculatePortfolioCostBasis(holdings);
  const gainLoss = calculatePortfolioGainLoss(holdings);
  const gainLossPercent = holdings.length > 0 ? calculatePortfolioGainLossPercent(holdings) : 0;
  const isPositive = gainLoss >= 0;

  const topPerformers = getTopPerformers(holdings, 3);
  const allocations = calculateAllocation(holdings).slice(0, 5);

  if (loading && portfolios.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading portfolios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.displayName || 'Investor'}!</Text>
            <Title style={styles.headerTitle}>Your Portfolio</Title>
          </View>
          <TouchableOpacity>
            <MaterialCommunityIcons name="bell-outline" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {selectedPortfolio ? (
          <>
            <Surface style={styles.portfolioCard}>
              <Text style={styles.portfolioName}>{selectedPortfolio.name}</Text>
              
              <View style={styles.valueContainer}>
                <Text style={styles.valueLabel}>Total Value</Text>
                <Text style={styles.valueAmount}>
                  {formatCurrency(totalValue, selectedPortfolio.currency)}
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Cost Basis</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(costBasis, selectedPortfolio.currency)}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Gain/Loss</Text>
                  <View style={styles.gainLossContainer}>
                    <MaterialCommunityIcons
                      name={isPositive ? 'trending-up' : 'trending-down'}
                      size={20}
                      color={getGainLossColor(isPositive)}
                    />
                    <Text
                      style={[
                        styles.gainLossValue,
                        { color: getGainLossColor(isPositive) },
                      ]}
                    >
                      {formatCurrency(gainLoss, selectedPortfolio.currency)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.gainLossPercent,
                      { color: getGainLossColor(isPositive) },
                    ]}
                  >
                    {formatPercent(gainLossPercent)}
                  </Text>
                </View>
              </View>

              <View style={styles.holdingsInfo}>
                <Chip icon="briefcase" style={styles.chip}>
                  {holdings.length} Holdings
                </Chip>
                <Chip icon="chart-line" style={styles.chip}>
                  {selectedPortfolio.type || 'stocks'}
                </Chip>
              </View>
            </Surface>

            {topPerformers.length > 0 && (
              <Card style={styles.sectionCard}>
                <Card.Content>
                  <View style={styles.sectionHeader}>
                    <Title style={styles.sectionTitle}>Top Performers</Title>
                    <MaterialCommunityIcons name="trophy" size={24} color={COLORS.gold} />
                  </View>

                  {topPerformers.map((holding, index) => {
                    const percent = calculateGainLossPercent(
                      holding.purchasePrice,
                      holding.currentPrice
                    );
                    return (
                      <TouchableOpacity
                        key={holding.id}
                        style={styles.performerItem}
                        onPress={() => navigation.navigate('Holdings')}
                      >
                        <View style={styles.performerLeft}>
                          <Text style={styles.performerRank}>{index + 1}</Text>
                          <View>
                            <Text style={styles.performerSymbol}>{holding.symbol}</Text>
                            <Text style={styles.performerName} numberOfLines={1}>
                              {holding.name}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.performerGain, { color: getGainLossColor(percent >= 0) }]}>
                          {formatPercent(percent)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </Card.Content>
              </Card>
            )}

            {allocations.length > 0 && (
              <Card style={styles.sectionCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>Top Allocations</Title>

                  {allocations.map((item) => (
                    <View key={item.id} style={styles.allocationItem}>
                      <View style={styles.allocationLeft}>
                        <Text style={styles.allocationSymbol}>{item.symbol}</Text>
                        <View style={styles.allocationBar}>
                          <View
                            style={[
                              styles.allocationFill,
                              { width: `${item.allocationPercent}%` },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={styles.allocationPercent}>
                        {item.allocationPercent.toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}

            <AIInsights 
              holdings={holdings}
              portfolioValue={totalValue}
              totalGainLoss={gainLoss}
            />

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Holdings')}
              >
                <MaterialCommunityIcons name="briefcase-outline" size={32} color={COLORS.primary} />
                <Text style={styles.actionText}>Holdings</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Analytics')}
              >
                <MaterialCommunityIcons name="chart-bar" size={32} color={COLORS.primary} />
                <Text style={styles.actionText}>Analytics</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Risk')}
              >
                <MaterialCommunityIcons name="shield-check" size={32} color={COLORS.primary} />
                <Text style={styles.actionText}>Risk</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="briefcase-outline" size={80} color={COLORS.surfaceVariant} />
            <Text style={styles.emptyTitle}>No Portfolio Yet</Text>
            <Text style={styles.emptyText}>
              Create your first portfolio to start tracking investments
            </Text>
          </View>
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Holding"
        onPress={() => navigation.navigate('AddHolding')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  portfolioCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 4,
  },
  portfolioName: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  valueContainer: {
    marginBottom: 20,
  },
  valueLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  gainLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gainLossValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  gainLossPercent: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  holdingsInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.background,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  performerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  performerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  performerRank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gold,
    width: 24,
  },
  performerSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  performerName: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  performerGain: {
    fontSize: 16,
    fontWeight: '600',
  },
  allocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  allocationLeft: {
    flex: 1,
    marginRight: 12,
  },
  allocationSymbol: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  allocationBar: {
    height: 8,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 4,
    overflow: 'hidden',
  },
  allocationFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  allocationPercent: {
    fontSize: 14,
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    marginBottom: 80,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    elevation: 2,
    minWidth: 100,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
});

export default DashboardScreen;
