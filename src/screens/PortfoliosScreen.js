import React, { useContext, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  FAB,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Menu,
  Portal,
  Dialog,
  Button,
  TextInput,
  HelperText,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PortfolioContext } from '../context/PortfolioContext';
import { formatCurrency, formatPercent } from '../../shared/helpers';
import { COLORS, getGainLossColor } from '../../shared/colors';
import {
  calculatePortfolioValue,
  calculatePortfolioCostBasis,
  calculatePortfolioGainLoss,
  calculatePortfolioGainLossPercent,
} from '../../shared/calculations';

const PortfoliosScreen = ({ navigation }) => {
  const {
    portfolios,
    selectedPortfolio,
    holdings,
    loading,
    createNewPortfolio,
    updateExistingPortfolio,
    deleteExistingPortfolio,
    selectPortfolio,
    loadPortfolios,
  } = useContext(PortfolioContext);

  const [menuVisible, setMenuVisible] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioType, setPortfolioType] = useState('stocks');
  const [portfolioCurrency, setPortfolioCurrency] = useState('USD');
  const [errors, setErrors] = useState({});

  const handleCreatePortfolio = () => {
    setEditingPortfolio(null);
    setPortfolioName('');
    setPortfolioType('stocks');
    setPortfolioCurrency('USD');
    setErrors({});
    setDialogVisible(true);
  };

  const handleEditPortfolio = (portfolio) => {
    setEditingPortfolio(portfolio);
    setPortfolioName(portfolio.name);
    setPortfolioType(portfolio.type || 'stocks');
    setPortfolioCurrency(portfolio.currency || 'USD');
    setErrors({});
    setMenuVisible(null);
    setDialogVisible(true);
  };

  const handleSavePortfolio = async () => {
    if (!portfolioName.trim()) {
      setErrors({ name: 'Portfolio name is required' });
      return;
    }

    if (editingPortfolio) {
      const result = await updateExistingPortfolio(editingPortfolio.id, {
        name: portfolioName.trim(),
        type: portfolioType,
        currency: portfolioCurrency,
      });

      if (result.success) {
        setDialogVisible(false);
      } else {
        Alert.alert('Error', result.error);
      }
    } else {
      const result = await createNewPortfolio({
        name: portfolioName.trim(),
        type: portfolioType,
        currency: portfolioCurrency,
      });

      if (result.success) {
        setDialogVisible(false);
      } else {
        Alert.alert('Error', result.error);
      }
    }
  };

  const handleDeletePortfolio = (portfolio) => {
    setMenuVisible(null);
    
    // Get holdings count for this portfolio
    const portfolioHoldings = holdings.filter(h => h.portfolioId === portfolio.id);
    const holdingsCount = portfolioHoldings.length;
    const totalValue = calculatePortfolioValue(portfolioHoldings);

    Alert.alert(
      'Delete Portfolio',
      `Delete "${portfolio.name}"?\n\nThis will permanently delete ${holdingsCount} holding${holdingsCount !== 1 ? 's' : ''} with a total value of ${formatCurrency(totalValue, portfolio.currency)}.\n\nThis action CANNOT be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Portfolio',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteExistingPortfolio(portfolio.id);
            if (!result.success) {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
  };

  const handleSelectPortfolio = (portfolio) => {
    selectPortfolio(portfolio);
    setMenuVisible(null);
  };

  const renderPortfolioCard = ({ item }) => {
    const portfolioHoldings = holdings.filter(h => h.portfolioId === item.id);
    const totalValue = calculatePortfolioValue(portfolioHoldings);
    const costBasis = calculatePortfolioCostBasis(portfolioHoldings);
    const gainLoss = calculatePortfolioGainLoss(portfolioHoldings);
    const gainLossPercent = portfolioHoldings.length > 0 ? calculatePortfolioGainLossPercent(portfolioHoldings) : 0;
    const isPositive = gainLoss >= 0;
    const isSelected = selectedPortfolio?.id === item.id;

    return (
      <Card
        style={[
          styles.portfolioCard,
          isSelected && styles.selectedCard,
        ]}
        onPress={() => handleSelectPortfolio(item)}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitle}>
              <MaterialCommunityIcons
                name={isSelected ? 'check-circle' : 'briefcase-outline'}
                size={24}
                color={isSelected ? COLORS.primary : COLORS.textSecondary}
              />
              <View style={styles.titleContainer}>
                <Title style={styles.portfolioTitle}>{item.name}</Title>
                {isSelected && (
                  <Text style={styles.selectedBadge}>Active</Text>
                )}
              </View>
            </View>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <TouchableOpacity
                  onPress={() => setMenuVisible(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={24}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              }
            >
              {!isSelected && (
                <Menu.Item
                  onPress={() => handleSelectPortfolio(item)}
                  title="Switch to Portfolio"
                  leadingIcon="swap-horizontal"
                />
              )}
              <Menu.Item
                onPress={() => handleEditPortfolio(item)}
                title="Edit Details"
                leadingIcon="pencil"
              />
              <Menu.Item
                onPress={() => handleDeletePortfolio(item)}
                title="Delete Portfolio"
                leadingIcon="delete"
                titleStyle={{ color: '#E53935' }}
              />
            </Menu>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Value</Text>
              <Text style={styles.statValue}>
                {formatCurrency(totalValue, item.currency)}
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Gain/Loss</Text>
              <View style={styles.gainLossContainer}>
                <MaterialCommunityIcons
                  name={isPositive ? 'trending-up' : 'trending-down'}
                  size={16}
                  color={getGainLossColor(isPositive)}
                />
                <Text
                  style={[
                    styles.gainLossValue,
                    { color: getGainLossColor(isPositive) },
                  ]}
                >
                  {formatCurrency(gainLoss, item.currency)}
                </Text>
                <Text
                  style={[
                    styles.gainLossPercent,
                    { color: getGainLossColor(isPositive) },
                  ]}
                >
                  ({formatPercent(gainLossPercent)})
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.holdingsCount}>
              {portfolioHoldings.length} holding{portfolioHoldings.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.portfolioType}>{item.type || 'stocks'}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="briefcase-plus-outline"
        size={80}
        color={COLORS.surfaceVariant}
      />
      <Text style={styles.emptyTitle}>No Portfolios</Text>
      <Text style={styles.emptyText}>
        Create your first portfolio to start tracking investments
      </Text>
    </View>
  );

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
      <View style={styles.header}>
        <Title style={styles.headerTitle}>My Portfolios</Title>
        <Text style={styles.headerSubtitle}>
          {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={portfolios}
        renderItem={renderPortfolioCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          portfolios.length === 0 ? styles.emptyListContent : styles.listContent
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        label="Create Portfolio"
        onPress={handleCreatePortfolio}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>
            {editingPortfolio ? 'Edit Portfolio' : 'Create Portfolio'}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Portfolio Name"
              value={portfolioName}
              onChangeText={setPortfolioName}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
              placeholder="e.g., Tech Stocks, Retirement, Crypto"
            />
            <HelperText type="error" visible={!!errors.name}>
              {errors.name}
            </HelperText>

            <TextInput
              label="Type"
              value={portfolioType}
              onChangeText={setPortfolioType}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., stocks, crypto, mixed"
            />

            <TextInput
              label="Currency"
              value={portfolioCurrency}
              onChangeText={setPortfolioCurrency}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., USD, EUR, GBP"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSavePortfolio}>
              {editingPortfolio ? 'Save' : 'Create'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  portfolioCard: {
    marginBottom: 16,
    elevation: 2,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  titleContainer: {
    flex: 1,
  },
  portfolioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 0,
  },
  selectedBadge: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  statsContainer: {
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  gainLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gainLossValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  gainLossPercent: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  holdingsCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  portfolioType: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
  input: {
    marginBottom: 8,
  },
});

export default PortfoliosScreen;
