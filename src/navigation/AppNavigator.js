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

const MainTabs = () => {
  return (
    <Tab.Navigator
      lazy={true}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Holdings') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Portfolios') {
            iconName = focused ? 'folder-multiple' : 'folder-multiple-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'chart-line' : 'chart-line-variant';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'cog' : 'cog-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
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
        unmountOnBlur: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Holdings" component={HoldingsScreen} />
      <Tab.Screen name="Portfolios" component={PortfoliosScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);
  // AuthStack: screens for unauthenticated users
  const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );

  // AppStack: screens for authenticated users
  const AppStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen 
        name="AddHolding" 
        component={AddHoldingScreen}
        options={{
          headerShown: true,
          title: 'Add Holding',
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{
          headerShown: false,
          presentation: 'card'
        }}
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
