import React, { useEffect, useState, useContext } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button, Card, ActivityIndicator } from 'react-native-paper';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase/firebase';
import { AuthContext } from '../context/AuthContext';

const DebugDumpHoldingsScreen = ({ route }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState(null);

  const portfolioId = route?.params?.portfolioId || 'vEQoYWW5Oc4g2jZWHj1p';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Must include userId filter to satisfy Firestore security rules
        const q = query(
          collection(db, 'holdings'),
          where('portfolioId', '==', portfolioId),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const out = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!mounted) return;
        console.log('Debug holdings dump', JSON.stringify(out, null, 2));
        setDocs(out);
      } catch (e) {
        console.error('Debug dump failed', e);
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [portfolioId, user]);

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <Card style={{ padding: 12, marginBottom: 12 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Debug: Holdings Dump for {portfolioId}</Text>
        {loading ? <ActivityIndicator animating /> : null}
        {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
        {!loading && !error && (
          <View>
            <Text>{`Found ${docs.length} documents`}</Text>
            {docs.map(d => (
              <Card key={d.id} style={{ marginTop: 8, padding: 8 }}>
                <Text style={{ fontWeight: '700' }}>{d.symbol || d.ticker || d.id}</Text>
                <Text>id: {d.id}</Text>
                <Text>quantity: {String(d.quantity)}</Text>
                <Text>currentPrice: {String(d.currentPrice)}</Text>
                <Text>purchasePrice: {String(d.purchasePrice ?? d.avgCost ?? '')}</Text>
                <Text>raw JSON:</Text>
                <Text selectable style={{ fontFamily: 'monospace' }}>{JSON.stringify(d, null, 2)}</Text>
              </Card>
            ))}
          </View>
        )}
      </Card>
      <Button mode="contained" onPress={() => { console.log('Full dump:', JSON.stringify(docs, null, 2)); }}>Log full dump</Button>
    </ScrollView>
  );
};

export default DebugDumpHoldingsScreen;