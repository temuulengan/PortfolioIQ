import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { PortfolioProvider } from './src/context/PortfolioContext';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/utils/theme';

// Ignore VirtualizedList warning
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <PortfolioProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </PortfolioProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
