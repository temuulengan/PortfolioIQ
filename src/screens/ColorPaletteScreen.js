import React from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Title, Surface } from 'react-native-paper';
import { COLORS } from '../../shared/colors';

const ColorRow = ({ name, value }) => (
  <TouchableOpacity onPress={() => Alert.alert(name, value)}>
    <View style={styles.row}>
      <View style={[styles.swatch, { backgroundColor: value }]} />
      <View style={styles.meta}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const ColorPaletteScreen = () => {
  const entries = Object.entries(COLORS).filter(([k]) => typeof COLORS[k] === 'string');
  // sort alphabetically for predictable order
  entries.sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Surface style={styles.header}>
        <Title>App Color Palette</Title>
        <Text>Tap a swatch to view the color code.</Text>
      </Surface>

      <Surface style={styles.card}>
        {entries.map(([name, value]) => (
          <ColorRow key={name} name={name} value={value} />
        ))}
      </Surface>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  header: { marginBottom: 12, padding: 12, borderRadius: 8 },
  card: { padding: 8, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 },
  swatch: { width: 56, height: 40, borderRadius: 6, marginRight: 12, borderWidth: 1, borderColor: '#00000010' },
  meta: { flex: 1 },
  name: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '600' },
  value: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
});

export default ColorPaletteScreen;
