import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../../shared/colors';

/**
 * Catches render-time errors anywhere below it so a single bad component shows
 * a recoverable screen instead of taking the whole app down.
 *
 * Deliberately built from plain React Native primitives: if the theme provider
 * or a UI library is what failed, a fallback that depends on them fails too.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error:', error, errorInfo?.componentStack);
    if (this.props.onError) this.props.onError(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. Your portfolio data is safe — it is stored
            in the cloud, not on this screen.
          </Text>

          {__DEV__ && (
            <View style={styles.details}>
              <Text style={styles.detailsTitle}>{error.name}: {error.message}</Text>
              <Text style={styles.stack}>{error.stack}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonLabel}>Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  details: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsTitle: { fontSize: 13, fontWeight: '600', color: COLORS.critical, marginBottom: 8 },
  stack: { fontSize: 11, color: COLORS.textSecondary },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonLabel: { color: COLORS.textWhite, fontSize: 16, fontWeight: '600' },
});

export default ErrorBoundary;
