import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Searchbar, List, Text, ActivityIndicator, HelperText } from 'react-native-paper';
import { searchStocks } from '../../services/api/stockAPI';

const SEARCH_DEBOUNCE_MS = 400;

const StockSearchBar = ({ onSelectStock, placeholder = 'Search stocks...' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // A debounced function built during render is a *new* function on every
  // keystroke, so its timer never gets a chance to cancel the previous one.
  // Keep one timer for the component's lifetime instead.
  const timerRef = useRef(null);
  // Responses can arrive out of order; only the newest request may write state.
  const requestIdRef = useRef(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const runSearch = useCallback(async (query) => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      const results = await searchStocks(query);
      if (requestId !== requestIdRef.current) return; // superseded
      setSearchResults(results);
      setSearchError(null);
      setShowResults(true);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Search error:', error);
      setSearchResults([]);
      setSearchError(error?.message || 'Search failed');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  const onChangeSearch = (query) => {
    setSearchQuery(query);
    clearTimeout(timerRef.current);

    if (query.trim().length < 1) {
      requestIdRef.current += 1; // discard any in-flight response
      setSearchResults([]);
      setShowResults(false);
      setLoading(false);
      return;
    }

    timerRef.current = setTimeout(() => runSearch(query.trim()), SEARCH_DEBOUNCE_MS);
  };

  const handleSelectStock = (stock) => {
    clearTimeout(timerRef.current);
    requestIdRef.current += 1;
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
