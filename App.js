import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { PortfolioProvider } from './src/context/PortfolioContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './shared/theme';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';

// Ignore VirtualizedList warning
LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

const MIN_SPLASH_MS = 800; // minimum time to keep the native splash visible

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      try {
        // Keep splash screen visible while we prepare resources
        // (fonts, cached data, or initial API calls). Add any async
        // initialization tasks here.
        const start = Date.now();
        await SplashScreen.preventAutoHideAsync();

        // TODO: await real init tasks here (fonts, cached snapshot, auth)

        const elapsed = Date.now() - start;
        if (elapsed < MIN_SPLASH_MS) {
          const wait = MIN_SPLASH_MS - elapsed;
          console.log(`Splash: prepared in ${elapsed}ms, waiting ${wait}ms`);
          await new Promise((r) => setTimeout(r, wait));
        } else {
          console.log(`Splash: prepared in ${elapsed}ms`);
        }
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
        console.log('Splash: hiding now');
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
    </SafeAreaProvider>
  );
}
