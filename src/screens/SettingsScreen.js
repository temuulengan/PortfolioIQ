import React, { useContext, useState, useEffect, useRef } from 'react';
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
import { PortfolioContext } from '../context/PortfolioContext';
import { Switch, Button, Dialog, Portal, TextInput, IconButton } from 'react-native-paper';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, updateUserProfile, updateAuthProfile, deleteUserAccount } from '../../services/firebase/firebase';

const SettingsScreen = () => {
  const { user, logout, resetPassword } = useContext(AuthContext);
  const { applyPriceRefreshInterval } = useContext(PortfolioContext);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [displayName, setDisplayName] = useState('');

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [editName, setEditName] = useState('');

  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [currency, setCurrency] = useState('USD');

  const [refreshInterval, setRefreshInterval] = useState(15);
  const prevCurrencyRef = useRef(currency);

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return setLoadingProfile(false);
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);
        setCurrency(p?.currency || 'USD');
        setNotifEnabled(p?.notificationsEnabled !== false);
        setEditName(p?.displayName || user.displayName || '');
        setDisplayName(p?.displayName || user.displayName || '');
        const storedInterval = p?.priceRefreshInterval ?? 15;
        setRefreshInterval(storedInterval);
        applyPriceRefreshInterval(storedInterval);
      } catch (err) {
        console.error('Error loading profile in Settings:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, [user, applyPriceRefreshInterval]);

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

      {loadingProfile ? (
        <Surface style={styles.profileCard}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5E7EB', marginBottom: 12 }} />
          <View style={{ height: 20, width: 160, backgroundColor: '#E5E7EB', borderRadius: 8, marginBottom: 6 }} />
          <View style={{ height: 14, width: 220, backgroundColor: '#E5E7EB', borderRadius: 8 }} />
        </Surface>
      ) : (
        <Surface style={styles.profileCard}>
          <Avatar.Text
            size={64}
            label={displayName?.substring(0, 2).toUpperCase() || 'U'}
            style={styles.avatar}
          />
          <Text style={styles.displayName}>{displayName || user?.displayName || user?.email || ''}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Surface>
      )}

      {!loadingProfile && (
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
                  Alert.alert('Password Reset', `A password reset email has been sent to ${user.email}. Check your spam folder if you don't see it within a few minutes.`);
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
      )}

      {!loadingProfile && (
        <List.Section>
          <List.Subheader>Preferences</List.Subheader>
          
          <List.Item
            title="Notifications"
            description={notifEnabled ? 'Enabled' : 'Disabled'}
            left={(props) => <List.Icon {...props} icon="bell" color={COLORS.primary} />}
            right={() => (
              <Switch color={COLORS.primary} value={notifEnabled} onValueChange={async (v) => {
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
            description={`Default: ${currency}`}
            left={(props) => <List.Icon {...props} icon="currency-usd" color={COLORS.primary} />}
            onPress={() => setShowCurrencyDialog(true)}
          />

          {/* Price Refresh setting rendered as separate chip row to avoid overflow */}
          <Divider />
          <List.Item title="Price Refresh" description="How often to refresh prices" left={(props) => <List.Icon {...props} icon="timer" color={COLORS.primary} />} />
          <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 10 }}>
            {[
              { label: '15 min', value: 15 },
              { label: '1 hr', value: 60 },
              { label: 'Manual', value: 0 },
            ].map(opt => {
              const active = refreshInterval === opt.value;
              return (
                <Button
                  key={opt.value}
                  mode={active ? 'contained' : 'outlined'}
                  style={[
                    { marginRight: 6 },
                    active ? { backgroundColor: COLORS.primary } : { borderColor: COLORS.primary, borderWidth: 1 },
                  ]}
                  labelStyle={{ color: active ? '#ffffff' : COLORS.primary }}
                  onPress={async () => {
                    if (!user) return;
                    try {
                      setSaving(true);
                      await updateUserProfile(user.uid, { priceRefreshInterval: opt.value });
                      setRefreshInterval(opt.value);
                      await AsyncStorage.setItem('priceRefreshInterval', String(opt.value));
                      // Push it to the provider so the background refresher
                      // actually picks up the new cadence.
                      applyPriceRefreshInterval(opt.value);
                    } catch (err) {
                      console.error('Error saving refresh interval:', err);
                      Alert.alert('Error', 'Unable to save refresh interval');
                    } finally { setSaving(false); }
                  }}
                >{opt.label}</Button>
              );
            })}
          </View>
        </List.Section>
      )}

      {!loadingProfile && (
        <>
          <Divider />
          <List.Section>
            <List.Subheader>App Information</List.Subheader>
            
            <List.Item
              title="Version"
              description={`${Constants.expoConfig?.version || '1.0.0'}`}
              left={(props) => <List.Icon {...props} icon="information" color={COLORS.primary} />}
            />

            <List.Item
              title="About PortfolioIQ"
              description="Investment portfolio tracking app"
              left={(props) => <List.Icon {...props} icon="shield-check" color={COLORS.primary} />}
            />
          </List.Section>
        </>
      )}

      <Portal>
        <Dialog visible={showProfileDialog} onDismiss={() => setShowProfileDialog(false)}>
          <Dialog.Title>Edit Profile</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Display Name" value={editName} onChangeText={setEditName} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowProfileDialog(false)}>Cancel</Button>
            <Button disabled={saving} loading={saving} onPress={async () => {
              if (!user) return;
              try {
                setSaving(true);
                // update auth profile and firestore profile
                await updateAuthProfile({ displayName: editName });
                await updateUserProfile(user.uid, { displayName: editName });
                setProfile(prev => ({ ...(prev||{}), displayName: editName }));
                // ensure immediate UI update
                setDisplayName(editName);
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
            <View>
              {['USD','EUR','GBP','JPY','KRW','AUD','CAD','CHF','HKD','SGD'].map(code => (
                <List.Item
                  key={code}
                  title={code}
                  onPress={async () => {
                    if (!user) return;
                    const prev = currency;
                    prevCurrencyRef.current = prev;
                    try {
                      setSaving(true);
                      setCurrency(code);
                      await updateUserProfile(user.uid, { currency: code });
                      Alert.alert('Saved', `Default currency set to ${code}`);
                      setShowCurrencyDialog(false);
                    } catch (err) {
                      console.error('Error saving currency:', err);
                      setCurrency(prevCurrencyRef.current);
                      Alert.alert('Error', 'Unable to save currency preference');
                    } finally { setSaving(false); }
                  }}
                  left={(props) => <List.Icon {...props} icon="currency-usd" color={COLORS.primary} />}
                  right={() => (
                    currency === code ? <IconButton icon="check" color={COLORS.primary} /> : null
                  )}
                />
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCurrencyDialog(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 12 }}>
              This permanently deletes your account, portfolios, holdings and transactions.
              This cannot be undone.
            </Text>
            <Text style={{ marginBottom: 12, color: COLORS.textSecondary }}>
              Firebase requires a recent sign-in before deleting an account, so please
              confirm your password.
            </Text>
            <TextInput
              label="Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={deleting} onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              disabled={deleting || !deletePassword}
              loading={deleting}
              textColor={COLORS.critical}
              onPress={async () => {
                try {
                  setDeleting(true);
                  await deleteUserAccount(deletePassword);
                  setShowDeleteDialog(false);
                  // Auth state change unmounts this screen; no logout call needed.
                } catch (err) {
                  console.error('Error deleting account:', err);
                  const message =
                    err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential'
                      ? 'That password is incorrect.'
                      : err?.message || 'Unable to delete account';
                  Alert.alert('Error', message);
                } finally {
                  setDeleting(false);
                  setDeletePassword('');
                }
              }}
            >
              Delete Forever
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {!loadingProfile && (
        <List.Section style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
          <List.Item
            title="Logout"
            description="Sign out of your account"
            left={(props) => <List.Icon {...props} icon="logout" color={COLORS.critical} />}
            onPress={handleLogout}
            titleStyle={{ color: COLORS.critical }}
          />
        </List.Section>
      )}

      <View style={styles.bottomSpacing} />
      {/* Data management section */}
      {!loadingProfile && (
        <>
          <Divider />
          <List.Section>
            <List.Subheader>Data</List.Subheader>
            <List.Item
              title="Export Holdings"
              description="Download CSV of your holdings"
              left={(props) => <List.Icon {...props} icon="download" />}
              onPress={() => Alert.alert('Export', 'Export feature coming soon. This will download a CSV of your holdings.')}
            />
            <List.Item
              title="Delete Account"
              titleStyle={{ color: COLORS.critical }}
              left={(props) => <List.Icon {...props} icon="account-remove" color={COLORS.critical} />}
              onPress={() => {
                setDeletePassword('');
                setShowDeleteDialog(true);
              }}
            />
          </List.Section>
        </>
      )}
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
