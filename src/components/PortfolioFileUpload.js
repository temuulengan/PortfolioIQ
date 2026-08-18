// File: src/components/PortfolioFileUpload.js
// UI component for selecting a CSV/XLSX portfolio file and starting parsing

import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, Text, Caption, Surface } from 'react-native-paper';
import { COLORS } from '../../shared/colors';
// Note: This component prefers `expo-document-picker` when available.
// It will dynamically import and gracefully show an error message if not present.

const PortfolioFileUpload = ({ onFileSelected }) => {
  const [fileInfo, setFileInfo] = useState(null);

  const pickFile = async () => {
    try {
      const mod = await import('expo-document-picker');
      const DocumentPicker = mod && mod.default ? mod.default : mod;
      if (!DocumentPicker || !DocumentPicker.getDocumentAsync) {
        throw new Error('expo-document-picker not available');
      }
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });

      // Support both older { type: 'success', name, uri } and newer { assets: [...] } shapes
      let picked = null;
      if (res && res.type === 'success') {
        picked = { name: res.name, size: res.size, uri: res.uri, mimeType: res.mimeType || res.type };
      } else if (res && Array.isArray(res.assets) && res.assets.length > 0) {
        const a = res.assets[0];
        picked = { name: a.name, size: a.size, uri: a.uri, mimeType: a.mimeType };
      }

      if (picked) {
        // normalize name from uri when missing
        let name = picked.name || '';
        if (!name && picked.uri) {
          try {
            const parts = picked.uri.split('/');
            name = parts[parts.length - 1] || picked.uri;
          } catch (e) {
            name = picked.uri;
          }
        }
        const ok = name.toLowerCase().endsWith('.csv') || name.toLowerCase().endsWith('.xlsx');
        if (!ok) {
          setFileInfo({ error: 'Only .csv and .xlsx files are accepted.' });
          onFileSelected && onFileSelected(null);
          return;
        }

        setFileInfo({ name, size: picked.size, uri: picked.uri });
        const fileObj = { name, size: picked.size, uri: picked.uri, mimeType: picked.mimeType };
        onFileSelected && onFileSelected(fileObj);
      }
    } catch (err) {
      console.error('File picker error', err);
      setFileInfo({ error: 'File picker unavailable — install expo-document-picker' });
      onFileSelected && onFileSelected(null);
    }
  };

  return (
    <Surface style={[styles.card, { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 }] }>
      <Text style={[styles.title, { color: COLORS.primary }]}>Import Portfolio</Text>
      <Caption style={{ color: COLORS.textSecondary }}>Supported: CSV, XLSX</Caption>
      <View style={styles.row}>
        <Button mode="contained" onPress={pickFile} style={{ backgroundColor: COLORS.primary }} labelStyle={{ color: COLORS.textWhite }}>Choose file</Button>
        <View style={{ width: 12 }} />
        <Button mode="outlined" onPress={() => { setFileInfo(null); onFileSelected && onFileSelected(null); }} style={{ borderColor: COLORS.primary }} labelStyle={{ color: COLORS.primary }}>Clear</Button>
      </View>

      {fileInfo ? (
        fileInfo.error ? (
          <Text style={{ color: COLORS.critical }}>{fileInfo.error}</Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: COLORS.textPrimary }}>Selected: {fileInfo.name} {fileInfo.size ? `(${Math.round(fileInfo.size/1024)} KB)` : ''}</Text>
          </View>
        )
      ) : (
        <Caption style={{ marginTop: 12, color: COLORS.textSecondary }}>No file selected</Caption>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 8, margin: 8 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', marginTop: 8 },
});

export default PortfolioFileUpload;
