import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, Dialog, Portal, Button, TextInput, List } from 'react-native-paper';
import { getPortfolioTransactions, addTransaction, deleteTransaction } from '../services/firebase';
import { useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';
import { COLORS, Spacing } from '../../shared/colors';

const TransactionsScreen = ({ portfolio }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({ type: 'buy', symbol: '', quantity: '', price: '' });
  const portfolioContext = useContext(PortfolioContext);

  const load = async () => {
    if (!portfolio) return;
    setLoading(true);
    try {
      const txs = await getPortfolioTransactions(portfolio.id);
      setTransactions(txs);
    } catch (err) {
      console.error('load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [portfolio]);

  const openAdd = () => { setForm({ type: 'buy', symbol: '', quantity: '', price: '' }); setVisible(true); };
  const closeAdd = () => setVisible(false);

  const handleAdd = async () => {
    if (!portfolio) return;
    const q = Number(form.quantity) || 0;
    const p = Number(form.price) || 0;
    if (!form.symbol || q <= 0) { Alert.alert('Validation', 'Symbol and positive quantity required'); return; }
    try {
      const tx = await addTransaction(portfolio.id, { type: form.type, symbol: form.symbol.toUpperCase(), quantity: q, price: p });
      // Reconcile transaction into holdings (basic FIFO-like behavior):
      // - buy: increase existing holding quantity (or create new holding)
      // - sell: reduce quantity, delete holding if quantity <= 0
      if (portfolioContext && portfolioContext.selectedPortfolio?.id === portfolio.id) {
        const existing = (portfolioContext.holdings || []).find(h => (h.symbol || '').toUpperCase() === form.symbol.toUpperCase());
        if (form.type === 'buy') {
          if (existing) {
            // compute new average cost
            const oldQty = Number(existing.quantity) || 0;
            const oldCost = Number(existing.purchasePrice ?? existing.avgCost ?? 0) || 0;
            const newQty = oldQty + q;
            const newAvg = newQty > 0 ? ((oldQty * oldCost) + (q * p)) / newQty : p;
            await portfolioContext.updateExistingHolding(existing.id, { quantity: newQty, avgCost: newAvg, purchasePrice: newAvg });
          } else {
            // create new holding with this tx as initial
            await portfolioContext.addNewHolding({ symbol: form.symbol.toUpperCase(), quantity: q, purchasePrice: p });
          }
        } else if (form.type === 'sell') {
          if (existing) {
            const oldQty = Number(existing.quantity) || 0;
            const newQty = oldQty - q;
            if (newQty > 0) {
              await portfolioContext.updateExistingHolding(existing.id, { quantity: newQty });
            } else {
              // remove holding
              await portfolioContext.deleteExistingHolding(existing.id);
            }
          }
        }
      }
      await load();
      closeAdd();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add transaction');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteTransaction(id); await load(); } catch (e) { Alert.alert('Error', e.message || 'Failed'); } } }
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.type.toUpperCase()} • ${item.symbol}`}
            description={`${item.quantity} @ ${item.price || '-'} `}
            right={() => <List.Icon icon="delete" color={COLORS.error} onPress={() => handleDelete(item.id)} />}
          />
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No transactions</Text></View>}
      />

      <FAB style={styles.fab} icon="plus" label="Add" onPress={openAdd} />

      <Portal>
        <Dialog visible={visible} onDismiss={closeAdd}>
          <Dialog.Title>Add Transaction</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Type (buy/sell/dividend)" value={form.type} onChangeText={(t) => setForm({...form, type: t})} />
            <TextInput label="Symbol" value={form.symbol} onChangeText={(t) => setForm({...form, symbol: t})} style={{ marginTop: 8 }} />
            <TextInput label="Quantity" keyboardType="numeric" value={String(form.quantity)} onChangeText={(t) => setForm({...form, quantity: t})} style={{ marginTop: 8 }} />
            <TextInput label="Price" keyboardType="numeric" value={String(form.price)} onChangeText={(t) => setForm({...form, price: t})} style={{ marginTop: 8 }} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeAdd}>Cancel</Button>
            <Button onPress={handleAdd}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.screenHorizontal, backgroundColor: COLORS.background },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: COLORS.primary },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary },
});

export default TransactionsScreen;
