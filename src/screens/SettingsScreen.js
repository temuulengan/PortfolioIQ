import React, { useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  List,
  Avatar,
  Divider,
  Surface,
  Text,
  Title,
} from 'react-native-paper';
import { COLORS } from '../../shared/colors';
import { AuthContext } from '../context/AuthContext';

const SettingsScreen = () => {
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Settings</Title>
      </View>

      <Surface style={styles.profileCard}>
        <Avatar.Text
          size={64}
          label={user?.displayName?.substring(0, 2).toUpperCase() || 'U'}
          style={styles.avatar}
        />
        <Text style={styles.displayName}>{user?.displayName || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </Surface>

      <List.Section>
        <List.Subheader>Account</List.Subheader>
        
        <List.Item
          title="Profile Settings"
          description="Update your personal information"
          left={(props) => <List.Icon {...props} icon="account-edit" color={COLORS.primary} />}
          onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available soon')}
        />

        <Divider />

        <List.Item
          title="Change Password"
          description="Update your account password"
          left={(props) => <List.Icon {...props} icon="lock-reset" color={COLORS.primary} />}
          onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon')}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Preferences</List.Subheader>
        
        <List.Item
          title="Notifications"
          description="Manage notification settings"
          left={(props) => <List.Icon {...props} icon="bell" color={COLORS.primary} />}
          onPress={() => Alert.alert('Coming Soon', 'Notification settings will be available soon')}
        />

        <Divider />

        <List.Item
          title="Currency"
          description="Default: USD"
          left={(props) => <List.Icon {...props} icon="currency-usd" color={COLORS.primary} />}
          onPress={() => Alert.alert('Coming Soon', 'Currency settings will be available soon')}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>App Information</List.Subheader>
        
        <List.Item
          title="Version"
          description="1.0.0"
          left={(props) => <List.Icon {...props} icon="information" />}
        />

        <List.Item
          title="About PortfolioIQ"
          description="Investment portfolio tracking app"
          left={(props) => <List.Icon {...props} icon="shield-check" />}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Item
          title="Logout"
          description="Sign out of your account"
          left={(props) => <List.Icon {...props} icon="logout" color={COLORS.critical} />}
          onPress={handleLogout}
          titleStyle={{ color: COLORS.critical }}
        />
      </List.Section>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileCard: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  avatar: {
    backgroundColor: COLORS.primary,
    marginBottom: 12,
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default SettingsScreen;
