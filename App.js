import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { PortfolioProvider } from './src/context/PortfolioContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { theme } from './shared/theme';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';

// Ignore VirtualizedList warning
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      try {
        // Hold the native splash only for as long as setup actually takes.
        // A fixed minimum was adding ~0.8s of dead time to every cold start;
        // auth restore already renders its own spinner behind the navigator.
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn(e);
      } finally {
        if (mounted) setAppIsReady(true);
      }
    }

    prepare();

    return () => { mounted = false; };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide the splash screen once the root view has been laid out
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Splash hide failed', e);
      }
    }
  }, [appIsReady]);

  if (!appIsReady) {
    // While preparing, render an empty view (splash remains visible)
    return <View style={{ flex: 1 }} />;
  }

  return (
    <SafeAreaProvider>
      {/* Outside the providers: if one of them throws, the fallback must still render. */}
      <ErrorBoundary>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <PortfolioProvider>
            <NotificationProvider>
              <StatusBar style="auto" />
              <AppNavigator />
            </NotificationProvider>
          </PortfolioProvider>
        </AuthProvider>
      </PaperProvider>
      </View>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
