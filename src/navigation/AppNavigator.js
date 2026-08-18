import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../../shared/colors';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

// Screens
import AuthScreen from '../screens/AuthScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HoldingsScreen from '../screens/HoldingsScreen';
import AddHoldingScreen from '../screens/AddHoldingScreen';
import PortfoliosScreen from '../screens/PortfoliosScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import RiskScreen from '../screens/RiskScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FileUploadScreen from '../screens/FileUploadScreen';
import DebugDumpHoldingsScreen from '../screens/DebugDumpHoldingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: ['view-dashboard', 'view-dashboard-outline'],
  Holdings: ['briefcase', 'briefcase-outline'],
  Portfolios: ['folder-multiple', 'folder-multiple-outline'],
  Analytics: ['chart-line', 'chart-line-variant'],
  Risk: ['shield-check', 'shield-check-outline'],
  Settings: ['cog', 'cog-outline'],
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        const [active, inactive] = TAB_ICONS[route.name] || TAB_ICONS.Dashboard;
        return (
          <MaterialCommunityIcons
            name={focused ? active : inactive}
            size={size}
            color={color}
          />
        );
      },
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopColor: COLORS.tabBorder,
        borderTopWidth: 1,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarActiveTintColor: COLORS.tabActive,
      tabBarInactiveTintColor: COLORS.tabInactive,
      headerShown: false,
      // In React Navigation v6 these are screen options, not navigator props.
      lazy: true,
      unmountOnBlur: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Holdings" component={HoldingsScreen} />
    <Tab.Screen name="Portfolios" component={PortfoliosScreen} />
    <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    <Tab.Screen name="Risk" component={RiskScreen} />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

// Defined at module scope: nesting these inside AppNavigator would create a new
// component type on every render, remounting the whole tree and losing state.
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Auth" component={AuthScreen} />
  </Stack.Navigator>
);

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Main" component={MainTabs} />
    <Stack.Screen
      name="AddHolding"
      component={AddHoldingScreen}
      options={{
        headerShown: true,
        title: 'Add Holding',
        presentation: 'modal',
      }}
    />
    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{ headerShown: false, presentation: 'card' }}
    />
    <Stack.Screen
      name="FileUpload"
      component={FileUploadScreen}
      options={{ headerShown: true, title: 'Import Portfolio' }}
    />
    {__DEV__ && (
      <Stack.Screen
        name="DebugDumpHoldings"
        component={DebugDumpHoldingsScreen}
        options={{ headerShown: true, title: 'Debug: Dump Holdings' }}
      />
    )}
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <NavigationContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
