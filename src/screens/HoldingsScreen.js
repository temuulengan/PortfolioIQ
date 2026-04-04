import React, { useContext, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import {
  Text,
  FAB,
  Searchbar,
  Menu,
  ActivityIndicator,
  Chip,
  Snackbar,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { PortfolioContext } from '../context/PortfolioContext';
import HoldingCard from '../components/HoldingCard';
import { sortBy, formatCurrency } from '../../shared/helpers';
import { calculatePortfolioValue } from '../../shared/calculations';
import { COLORS, Spacing, Shadow } from '../../shared/colors';

const HoldingsScreen = ({ navigation }) => {
  const {
    holdings,
    loading,
    refreshing,
    refreshPrices,
    deleteExistingHolding,
    selectedPortfolio,
  } = useContext(PortfolioContext);

  const { updateExistingHolding } = useContext(PortfolioContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('symbol');
  const [sortOrder, setSortOrder] = useState('asc');
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeView, setActiveView] = useState('holdings');
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  const handleRefresh = async () => {
    await refreshPrices();
  };

  // Quick-delete with Undo: archive immediately, schedule permanent delete
  const pendingDeletesRef = useRef({});
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', holdingId: null });

  const handleDeleteHolding = async (holdingId, symbol, name) => {
    try {
      // Archive the holding (soft-delete)
      const res = await updateExistingHolding(holdingId, { archived: true });
      if (!res.success) {
        Alert.alert('Error', res.error || 'Failed to archive holding');
        return;
      }

      // Show undo snackbar
      setSnackbar({ visible: true, message: `${symbol} removed`, holdingId });

      // Schedule permanent deletion in 8s
      const timeoutId = setTimeout(async () => {
        try {
          await deleteExistingHolding(holdingId);
        } catch (err) {
          console.error('Permanent delete failed:', err);
        }
        // cleanup
        delete pendingDeletesRef.current[holdingId];
      }, 8000);

      pendingDeletesRef.current[holdingId] = timeoutId;
    } catch (error) {
      console.error('Delete holding error:', error);
      Alert.alert('Error', error?.message || 'Failed to delete holding');
    }
  };

  const renderRightActions = (progress, dragX, item) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteHolding(item.id, item.symbol, item.name)}
        >
          <Animated.View style={[{ transform: [{ scale }] }]}>
            <MaterialCommunityIcons name="delete" size={24} color="#FFF" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const filteredHoldings = holdings.filter((holding) =>
    (holding.symbol && holding.symbol.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (holding.name && holding.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedHoldings = sortBy(filteredHoldings, sortKey, sortOrder);
  const totalValue = calculatePortfolioValue(holdings);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setMenuVisible(false);
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="briefcase-outline" size={80} color={COLORS.surfaceVariant} />
      <Text style={styles.emptyTitle}>No Holdings</Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'No holdings match your search'
          : 'Add your first holding to get started'}
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          onPress={() => setActiveView('holdings')}
          style={[styles.segmentButton, activeView === 'holdings' && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentText, activeView === 'holdings' && styles.segmentTextActive]}>
            Holdings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveView('transactions')}
          style={[styles.segmentButton, activeView === 'transactions' && styles.segmentButtonActive]}
        >
          <Text style={[styles.segmentText, activeView === 'transactions' && styles.segmentTextActive]}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.totalValue}>{formatCurrency(totalValue, selectedPortfolio?.currency)}</Text>
      <Text style={styles.sectionLabel}>Portfolio Holdings</Text>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search holdings..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.statsContainer}>
          <Chip icon="briefcase" style={styles.chip}>
            {holdings.length} Holdings
          </Chip>
        </View>

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setMenuVisible(true)}
            >
              <MaterialCommunityIcons name="sort" size={20} color={COLORS.primary} />
              <Text style={styles.sortText}>Sort</Text>
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => handleSort('symbol')}
            title="Symbol"
            leadingIcon="alphabetical"
          />
          <Menu.Item
            onPress={() => handleSort('name')}
            title="Name"
            leadingIcon="text"
          />
          <Menu.Item
            onPress={() => handleSort('currentPrice')}
            title="Price"
            leadingIcon="currency-usd"
          />
          <Menu.Item
            onPress={() => handleSort('quantity')}
            title="Quantity"
            leadingIcon="numeric"
          />
        </Menu>
      </View>
    </View>
  );

  if (loading && holdings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading holdings...</Text>
      </View>
    );
  }

  if (!selectedPortfolio) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={80} color={COLORS.surfaceVariant} />
        <Text style={styles.emptyTitle}>No Portfolio Selected</Text>
        <Text style={styles.emptyText}>
          Please create or select a portfolio first
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {activeView === 'holdings' ? (
        <FlatList
          data={sortedHoldings}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
              overshootRight={false}
              friction={2}
            >
              <HoldingCard
                holding={item}
                onPress={() => {
                  // Navigate to holding details (not implemented)
                }}
              />
            </Swipeable>
          )}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            <View style={styles.periodRow}>
              {['1D', '1W', '1M', '1Y', '5Y'].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodPill,
                    selectedPeriod === period && styles.periodPillActive,
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text
                    style={[
                      styles.periodText,
                      selectedPeriod === period && styles.periodTextActive,
                    ]}
                  >
                    {period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={
            sortedHoldings.length === 0 ? styles.emptyListContent : styles.listContent
          }
        />
      ) : (
        <View style={styles.transactionsEmptyWrap}>
          {renderHeader()}
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="swap-horizontal-circle-outline" size={72} color={COLORS.surfaceVariant} />
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptyText}>Transaction history UI is reserved for the next release.</Text>
          </View>
        </View>
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Holding"
        color={COLORS.textWhite}
        onPress={() => navigation.navigate('AddHolding')}
      />

      {/* Undo Snackbar for quick deletes */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '', holdingId: null })}
        action={{
          label: 'Undo',
          onPress: async () => {
            const holdingId = snackbar.holdingId;
            const timeoutId = pendingDeletesRef.current[holdingId];
            if (timeoutId) {
              clearTimeout(timeoutId);
              delete pendingDeletesRef.current[holdingId];
            }

            // Unarchive the holding
            const res = await updateExistingHolding(holdingId, { archived: false });
            if (!res.success) {
              Alert.alert('Error', res.error || 'Failed to restore holding');
            }

            setSnackbar({ visible: false, message: '', holdingId: null });
          },
        }}
        duration={8000}
      >
        {snackbar.message}
      </Snackbar>
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
  header: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: COLORS.background,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.divider,
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: COLORS.surface,
    ...Shadow.card,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchbar: {
    elevation: 0,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    fontSize: 16,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    gap: 4,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  deleteButton: {
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 8,
    marginRight: 16,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  periodRow: {
    marginTop: 12,
    marginBottom: 96,
    marginHorizontal: Spacing.screenHorizontal,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: COLORS.textWhite,
  },
  emptyListContent: {
    flexGrow: 1,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
  },
  transactionsEmptyWrap: {
    flex: 1,
  },
});

export default HoldingsScreen;
