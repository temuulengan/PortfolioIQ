import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, Card, Title, Chip, Surface, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { PortfolioContext } from '../context/PortfolioContext';
import { AuthContext } from '../context/AuthContext';
import { formatCurrency, formatPercent } from '../../shared/helpers';
import {
  calculatePortfolioValue,
  calculateAllocation,
  calculateAssetTypeAllocation,
  calculateGainLossPercent,
  getTopPerformers,
  getBottomPerformers,
} from '../../shared/calculations';
import { getPortfolioHistory, generateHistoricalData } from '../../services/history/historyService';
import { CHART_COLORS } from '../../shared/constants';
import { COLORS, getGainLossColor } from '../../shared/colors';

const AnalyticsScreen = () => {
  const { holdings, selectedPortfolio } = useContext(PortfolioContext);
  const { user } = useContext(AuthContext);
  const [timeRange, setTimeRange] = useState('1M');
  const [historicalData, setHistoricalData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const screenWidth = Dimensions.get('window').width;

  const totalValue = calculatePortfolioValue(holdings);
  const allocations = calculateAllocation(holdings);
  const assetTypeAllocations = calculateAssetTypeAllocation(holdings);
  const topPerformers = getTopPerformers(holdings, 5);
  const bottomPerformers = getBottomPerformers(holdings, 5);

  // Load historical data when portfolio or time range changes
  useEffect(() => {
    if (!selectedPortfolio) return;
    
    const loadHistoricalData = async () => {
      try {
        setLoadingHistory(true);
        setHistoryError(null);
        
        // Map time range to days
        const daysMap = {
          '1M': 30,
          '3M': 90,
          '6M': 180,
          '1Y': 365,
        };
        
        const days = daysMap[timeRange] || 30;
        
        // Try to get existing historical data
        let history = await getPortfolioHistory(selectedPortfolio.id, days);
        
        // If no history exists, generate from current holdings
        if (history.length === 0 && holdings && holdings.length > 0) {
          history = await generateHistoricalData(holdings, days);
        }
        
        setHistoricalData(history);
      } catch (error) {
        console.error('Error loading historical data:', error);
        setHistoryError(error.message);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    loadHistoricalData();
  }, [selectedPortfolio, timeRange, holdings]);

  // Prepare line chart data from historical data
  const prepareLineChartData = () => {
    if (loadingHistory) {
      return {
        labels: ['Loading...'],
        datasets: [{ data: [0] }],
      };
    }
    
    if (historicalData.length === 0) {
      // Fallback to current value if no history
      return {
        labels: ['Now'],
        datasets: [{ data: [totalValue] }],
      };
    }
    
    // Group data by time range
    const maxPoints = 6;
    const step = Math.ceil(historicalData.length / maxPoints);
    const sampledData = historicalData.filter((_, index) => index % step === 0);
    
    // Ensure we include the latest data point
    if (sampledData[sampledData.length - 1] !== historicalData[historicalData.length - 1]) {
      sampledData.push(historicalData[historicalData.length - 1]);
    }
    
    const labels = sampledData.map(item => {
      const date = item.date?.toDate ? item.date.toDate() : new Date(item.date);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return `${month} ${day}`;
    });
    
    const data = sampledData.map(item => item.totalValue || 0);
    
    return {
      labels,
      datasets: [{ data }],
    };
  };

  const lineChartData = prepareLineChartData();
  // Prepare pie chart data for holdings allocation
  const holdingsPieData = allocations.slice(0, 5).map((item, index) => ({
    name: item.symbol,
    value: item.value,
    color: CHART_COLORS.colors[index % CHART_COLORS.colors.length],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  // Prepare pie chart data for asset type allocation
  const assetTypePieData = assetTypeAllocations.map((item, index) => ({
    name: item.type,
    value: item.value,
    color: CHART_COLORS.colors[index % CHART_COLORS.colors.length],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  if (!selectedPortfolio || holdings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="chart-line" size={80} color={COLORS.surfaceVariant} />
        <Text style={styles.emptyTitle}>No Data Available</Text>
        <Text style={styles.emptyText}>
          Add holdings to your portfolio to see analytics
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Analytics</Title>
        <Text style={styles.portfolioName}>{selectedPortfolio.name}</Text>
      </View>

      <Surface style={styles.valueCard}>
        <Text style={styles.valueLabel}>Portfolio Value</Text>
        <Text style={styles.valueAmount}>
          {formatCurrency(totalValue, selectedPortfolio.currency)}
        </Text>
      </Surface>

      <View style={styles.chartSection}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Portfolio Growth</Text>
            <SegmentedButtons
              value={timeRange}
              onValueChange={setTimeRange}
              buttons={[
                { value: '1M', label: '1M' },
                { value: '3M', label: '3M' },
                { value: '6M', label: '6M' },
                { value: '1Y', label: '1Y' },
              ]}
              style={styles.timeRangeButtons}
            />
          </View>
          {loadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading historical data...</Text>
            </View>
          ) : historyError ? (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={32} color={COLORS.error} />
              <Text style={styles.errorText}>{historyError}</Text>
            </View>
          ) : (
            <LineChart
              data={lineChartData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          )}
      </View>

      <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Holdings Allocation</Text>
          {holdingsPieData.length > 0 ? (
            <PieChart
              data={holdingsPieData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text style={styles.noDataText}>No data available</Text>
          )}
      </View>

      <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Asset Type Distribution</Text>
          {assetTypePieData.length > 0 ? (
            <PieChart
              data={assetTypePieData}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <Text style={styles.noDataText}>No data available</Text>
          )}
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Top Performers</Text>
          {topPerformers.map((holding, index) => {
            const gainLossPercent = calculateGainLossPercent(
              holding.purchasePrice,
              holding.currentPrice
            );
            const isPositive = gainLossPercent >= 0;
            return (
              <View key={holding.id} style={styles.performerRow}>
                <Text style={styles.performerRank}>{index + 1}</Text>
                <View style={styles.performerInfo}>
                  <Text style={styles.performerSymbol}>{holding.symbol}</Text>
                  <Text style={styles.performerName} numberOfLines={1}>
                    {holding.name}
                  </Text>
                </View>
                <View style={styles.performerGain}>
                  <MaterialCommunityIcons
                    name={isPositive ? "trending-up" : "trending-down"}
                    size={16}
                    color={getGainLossColor(isPositive)}
                  />
                  <Text style={[styles.performerGainText, { color: getGainLossColor(isPositive) }]}>
                    {formatPercent(gainLossPercent)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {bottomPerformers.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Bottom Performers</Text>
            {bottomPerformers.map((holding, index) => {
              const gainLossPercent = calculateGainLossPercent(
                holding.purchasePrice,
                holding.currentPrice
              );
              const isPositive = gainLossPercent >= 0;
              return (
                <View key={holding.id} style={styles.performerRow}>
                  <Text style={styles.performerRank}>{index + 1}</Text>
                  <View style={styles.performerInfo}>
                    <Text style={styles.performerSymbol}>{holding.symbol}</Text>
                    <Text style={styles.performerName} numberOfLines={1}>
                      {holding.name}
                    </Text>
                  </View>
                  <View style={styles.performerGain}>
                    <MaterialCommunityIcons
                      name={isPositive ? "trending-up" : "trending-down"}
                      size={16}
                      color={getGainLossColor(isPositive)}
                    />
                    <Text style={[styles.performerGainText, { color: getGainLossColor(isPositive) }]}>
                      {formatPercent(gainLossPercent)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}

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
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 60,
    backgroundColor: COLORS.background,
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
  valueCard: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  valueAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 0,
  },
  chartSection: {
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  timeRangeButtons: {
    marginTop: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    padding: 20,
  },
  performerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  performerRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDisabled,
    width: 24,
    marginRight: 12,
  },
  performerInfo: {
    flex: 1,
  },
  performerSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  performerName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  performerGain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  performerGainText: {
    fontSize: 14,
    fontWeight: '600',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.error,
    textAlign: 'center',
  },
});

export default AnalyticsScreen;
