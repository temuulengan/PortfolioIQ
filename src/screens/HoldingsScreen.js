import React, { useContext, useState } from 'react';
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
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { PortfolioContext } from '../context/PortfolioContext';
import HoldingCard from '../components/HoldingCard';
import { sortBy } from '../../shared/helpers';
import { COLORS } from '../../shared/colors';

const HoldingsScreen = ({ navigation }) => {
  const {
    holdings,
    loading,
    refreshing,
    refreshPrices,
    deleteExistingHolding,
    selectedPortfolio,
  } = useContext(PortfolioContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('symbol');
  const [sortOrder, setSortOrder] = useState('asc');
  const [menuVisible, setMenuVisible] = useState(false);

  const handleRefresh = async () => {
    await refreshPrices();
  };

  const handleDeleteHolding = (holdingId, symbol, name) => {
    Alert.alert(
      'Delete Holding',
      `Delete ${symbol}?\n\nThis will permanently remove ${name} from your portfolio. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteExistingHolding(holdingId);
            if (!result.success) {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={
          sortedHoldings.length === 0 ? styles.emptyListContent : styles.listContent
        }
      />

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
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchbar: {
    elevation: 0,
    borderRadius: 8,
    backgroundColor: COLORS.background,
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
    backgroundColor: '#E8F5E9',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
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
});

export default HoldingsScreen;
