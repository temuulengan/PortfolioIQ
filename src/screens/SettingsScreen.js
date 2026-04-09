import React, { useContext, useState, useEffect } from 'react';
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
import { Switch, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { getUserProfile, updateUserProfile, updateAuthProfile } from '../services/firebase';

const SettingsScreen = () => {
  const { user, logout, resetPassword } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [editName, setEditName] = useState('');

  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [currency, setCurrency] = useState('USD');

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return setLoadingProfile(false);
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
        setCurrency(p?.currency || 'USD');
        setNotifEnabled(p?.notificationsEnabled !== false);
        setEditName(p?.displayName || user.displayName || '');
      } catch (err) {
        console.error('Error loading profile in Settings:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, [user]);

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
          description="Update your display name"
          left={(props) => <List.Icon {...props} icon="account-edit" color={COLORS.primary} />}
          onPress={() => setShowProfileDialog(true)}
        />

        <Divider />

        <List.Item
          title="Change Password"
          description="Send password reset email"
          left={(props) => <List.Icon {...props} icon="lock-reset" color={COLORS.primary} />}
            onPress={async () => {
            if (!user?.email) return Alert.alert('Error', 'No email available for this account');
            try {
              const res = await resetPassword(user.email);
              if (res?.success) {
                Alert.alert('Password Reset', 'A password reset email has been sent.');
              } else {
                throw new Error(res?.error || 'reset failed');
              }
            } catch (err) {
              console.error('Error sending reset:', err);
              Alert.alert('Error', 'Unable to send reset email.');
            }
          }}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>Preferences</List.Subheader>
        
        <List.Item
          title="Notifications"
          description={notifEnabled ? 'Enabled' : 'Disabled'}
          left={(props) => <List.Icon {...props} icon="bell" color={COLORS.primary} />}
          right={() => (
            <Switch value={notifEnabled} onValueChange={async (v) => {
              setNotifEnabled(v);
              try {
                setSaving(true);
                if (user) await updateUserProfile(user.uid, { notificationsEnabled: v });
              } catch (err) {
                console.error('Error saving notifications preference:', err);
                Alert.alert('Error', 'Unable to save notification preference');
                setNotifEnabled(!v);
              } finally { setSaving(false); }
            }} />
          )}
        />

        <Divider />

        <List.Item
          title="Currency"
          description="Default: USD"
          left={(props) => <List.Icon {...props} icon="currency-usd" color={COLORS.primary} />}
          onPress={() => setShowCurrencyDialog(true)}
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

      <Portal>
        <Dialog visible={showProfileDialog} onDismiss={() => setShowProfileDialog(false)}>
          <Dialog.Title>Edit Profile</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Display Name" value={editName} onChangeText={setEditName} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowProfileDialog(false)}>Cancel</Button>
            <Button onPress={async () => {
              if (!user) return;
              try {
                setSaving(true);
                // update auth profile and firestore profile
                await updateAuthProfile({ displayName: editName });
                await updateUserProfile(user.uid, { displayName: editName });
                setProfile(prev => ({ ...(prev||{}), displayName: editName }));
                Alert.alert('Saved', 'Display name updated');
                setShowProfileDialog(false);
              } catch (err) {
                console.error('Error updating profile:', err);
                Alert.alert('Error', 'Unable to update profile');
              } finally { setSaving(false); }
            }}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showCurrencyDialog} onDismiss={() => setShowCurrencyDialog(false)}>
          <Dialog.Title>Default Currency</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Currency Code" value={currency} onChangeText={setCurrency} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCurrencyDialog(false)}>Cancel</Button>
            <Button onPress={async () => {
              if (!user) return;
              try {
                setSaving(true);
                await updateUserProfile(user.uid, { currency: currency });
                Alert.alert('Saved', `Default currency set to ${currency}`);
                setShowCurrencyDialog(false);
              } catch (err) {
                console.error('Error saving currency:', err);
                Alert.alert('Error', 'Unable to save currency');
              } finally { setSaving(false); }
            }}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
