import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Searchbar, List, Text, ActivityIndicator, HelperText } from 'react-native-paper';
import { searchStocks } from '../../services/api/stockAPI';
import { debounce } from '../../shared/helpers';

const StockSearchBar = ({ onSelectStock, placeholder = 'Search stocks...' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const handleSearch = debounce(async (query) => {
    if (query.length < 1) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      setLoading(true);
      const results = await searchStocks(query);
      setSearchResults(results);
      setSearchError(null);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setSearchError(error?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, 500);

  const onChangeSearch = (query) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleSelectStock = (stock) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    onSelectStock(stock);
  };

  const getStockIcon = (type) => {
    switch (type) {
      case 'EQUITY':
        return 'chart-line';
      case 'ETF':
        return 'chart-bar';
      case 'MUTUALFUND':
        return 'chart-box';
      case 'INDEX':
        return 'chart-timeline-variant';
      default:
        return 'chart-line';
    }
  };

  const renderStockItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleSelectStock(item)}>
      <List.Item
        title={item.symbol}
        description={`${item.name || 'N/A'} - ${item.exchange || 'N/A'}`}
        left={props => (
          <List.Icon 
            {...props} 
            icon={getStockIcon(item.type)}
            color="#6200EE"
          />
        )}
        style={styles.listItem}
      />
    </TouchableOpacity>
  );

  const renderEmptyResults = () => {
    if (loading) {
      return null;
    }

    if (searchQuery.length > 0 && searchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No stocks found</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder={placeholder}
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchInput}
        icon="magnify"
        clearIcon="close"
      />

      {searchError && (
        <HelperText type="error" visible={!!searchError}>
          {searchError}
        </HelperText>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6200EE" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {showResults && !loading && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={searchResults}
            renderItem={renderStockItem}
            keyExtractor={(item, index) => `${item.symbol}-${index}`}
            ListEmptyComponent={renderEmptyResults}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 999,
  },
  searchbar: {
    elevation: 2,
    borderRadius: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    borderRadius: 8,
    elevation: 2,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#757575',
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    borderRadius: 8,
    elevation: 3,
    maxHeight: 300,
  },
  resultsList: {
    borderRadius: 8,
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
  },
});

export default StockSearchBar;
