// File: src/components/ReconciliationPanel.js
// UI to review unmatched tickers, allow manual override/exclusion and run analysis

import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, List, Divider, Surface } from 'react-native-paper';
import { COLORS } from '../../shared/colors';

const ReconciliationPanel = ({ report, onResolveRow, onExcludeRow, onRun, initialHoldings }) => {
  // report: { matched: [], needsReview: [], excluded: [] }
  const [overrides, setOverrides] = useState({});

  const unresolvedCount = (report?.needsReview || []).length;

  const allResolved = unresolvedCount === 0;

  const handleChange = (idx, value) => setOverrides(prev => ({ ...prev, [idx]: value }));

  return (
    <Surface style={[styles.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 }] }>
      <Text style={[styles.title, { color: COLORS.primary }]}>Reconciliation</Text>
      <Text style={{ color: COLORS.textSecondary }}>{(report?.matched?.length || 0)} matched — {(report?.needsReview?.length || 0)} need review</Text>

      {(report?.needsReview || []).map((item, idx) => (
        <View key={idx} style={styles.row}>
          <List.Item title={item.original || '(empty)'} description={item.suggestion ? `${item.suggestion.symbol} — ${item.suggestion.name}` : item.reason || ''} />
          <View style={styles.controls}>
            <TextInput placeholder="Override symbol" value={overrides[idx] || ''} onChangeText={(v) => handleChange(idx, v)} style={{ width: 160 }} />
            <Button mode="outlined" onPress={() => onResolveRow && onResolveRow(idx, overrides[idx] || item.suggestion?.symbol)} disabled={!overrides[idx] && !item.suggestion} style={{ borderColor: COLORS.primary, color: COLORS.primary }}>Apply</Button>
            <Button mode="text" onPress={() => onExcludeRow && onExcludeRow(idx)} style={{ marginLeft: 8, color: COLORS.primary }}>Exclude</Button>
          </View>
          <Divider style={{ backgroundColor: COLORS.border }} />
        </View>
      ))}

      <View style={{ marginTop: 12 }}>
        <Button mode="contained" onPress={onRun} disabled={!allResolved} style={{ backgroundColor: COLORS.primary }} labelStyle={{ color: COLORS.textWhite }}>Run Analysis</Button>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 8, margin: 8 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  row: { marginTop: 8 },
  controls: { flexDirection: 'row', alignItems: 'center' },
});

export default ReconciliationPanel;
