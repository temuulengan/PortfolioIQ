import React, { useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  HelperText,
  Chip,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import StockSearchBar from '../components/StockSearchBar';
import { PortfolioContext } from '../context/PortfolioContext';
import { COLORS } from '../../shared/colors';
import { isPositiveNumber, isValidPurchaseDate } from '../../shared/helpers';
import { ASSET_TYPES, ASSET_TYPE_LABELS } from '../../shared/constants';

const AddHoldingScreen = ({ navigation }) => {
  const { addNewHolding, selectedPortfolio } = useContext(PortfolioContext);

  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [assetType, setAssetType] = useState(ASSET_TYPES.STOCK);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!selectedStock) {
      newErrors.stock = 'Please select a stock';
    }

    if (!quantity || !isPositiveNumber(quantity)) {
      newErrors.quantity = 'Enter a valid quantity';
    }

    if (!purchasePrice || !isPositiveNumber(purchasePrice)) {
      newErrors.purchasePrice = 'Enter a valid price';
    }

    if (!purchaseDate || !isValidPurchaseDate(purchaseDate)) {
      newErrors.purchaseDate = 'Enter a valid date (not in future)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setErrors({ ...errors, stock: null });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (!selectedPortfolio) {
      Alert.alert('Error', 'Please select a portfolio first');
      return;
    }

    setLoading(true);
    try {
      const result = await addNewHolding({
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        quantity: parseFloat(quantity),
        purchasePrice: parseFloat(purchasePrice),
        purchaseDate: purchaseDate,
        assetType: assetType,
        notes: notes,
      });

      if (result.success) {
        Alert.alert('Success', 'Holding added successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedStock(null);
    setQuantity('');
    setPurchasePrice('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setAssetType(ASSET_TYPES.STOCK);
    setNotes('');
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Search Stock</Text>
        <StockSearchBar
          onSelectStock={handleSelectStock}
          placeholder="Search by symbol or name..."
        />
        <HelperText type="error" visible={!!errors.stock}>
          {errors.stock}
        </HelperText>

        {selectedStock && (
          <Surface style={styles.selectedStock}>
            <View style={styles.stockInfo}>
              <Text style={styles.stockSymbol}>{selectedStock.symbol}</Text>
              <Text style={styles.stockName}>{selectedStock.name}</Text>
              <Chip style={styles.stockType}>{selectedStock.type}</Chip>
            </View>
          </Surface>
        )}

        <Text style={styles.sectionTitle}>Purchase Details</Text>

        <TextInput
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          mode="outlined"
          style={styles.input}
          keyboardType="decimal-pad"
          error={!!errors.quantity}
          placeholder="Number of shares"
        />
        <HelperText type="error" visible={!!errors.quantity}>
          {errors.quantity}
        </HelperText>

        <TextInput
          label="Purchase Price"
          value={purchasePrice}
          onChangeText={setPurchasePrice}
          mode="outlined"
          style={styles.input}
          keyboardType="decimal-pad"
          error={!!errors.purchasePrice}
          placeholder="Price per share"
          left={<TextInput.Icon icon="currency-usd" />}
        />
        <HelperText type="error" visible={!!errors.purchasePrice}>
          {errors.purchasePrice}
        </HelperText>

        <TextInput
          label="Purchase Date"
          value={purchaseDate}
          onChangeText={setPurchaseDate}
          mode="outlined"
          style={styles.input}
          error={!!errors.purchaseDate}
          placeholder="YYYY-MM-DD"
          left={<TextInput.Icon icon="calendar" />}
        />
        <HelperText type="error" visible={!!errors.purchaseDate}>
          {errors.purchaseDate}
        </HelperText>

        <Text style={styles.sectionTitle}>Asset Type</Text>
        <View style={styles.assetTypeContainer}>
          {Object.values(ASSET_TYPES).map((type) => (
            <Chip
              key={type}
              selected={assetType === type}
              onPress={() => setAssetType(type)}
              style={styles.assetChip}
            >
              {ASSET_TYPE_LABELS[type]}
            </Chip>
          ))}
        </View>

        <TextInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          style={styles.input}
          multiline
          numberOfLines={3}
          placeholder="Add any notes about this holding..."
        />

        {quantity && purchasePrice && (
          <Surface style={styles.summary}>
            <Text style={styles.summaryLabel}>Total Cost</Text>
            <Text style={styles.summaryValue}>
              ${(parseFloat(quantity) * parseFloat(purchasePrice)).toFixed(2)}
            </Text>
          </Surface>
        )}

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={handleClear}
            style={styles.button}
            disabled={loading}
          >
            Clear
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={[styles.button, styles.submitButton]}
            loading={loading}
            disabled={loading || !selectedStock}
          >
            Add Holding
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 12,
  },
  selectedStock: {
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
    elevation: 2,
  },
  stockInfo: {
    gap: 4,
  },
  stockSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  stockName: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  stockType: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#E3F2FD',
  },
  input: {
    marginBottom: 4,
  },
  assetTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  assetChip: {
    marginBottom: 4,
  },
  summary: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    backgroundColor: '#E8F5E9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
});

export default AddHoldingScreen;
