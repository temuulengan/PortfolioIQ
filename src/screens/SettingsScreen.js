import React, { useContext, useState } from 'react';
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
  Dialog,
  Portal,
  Button,
  TextInput,
  Menu,
  Surface,
  Text,
  Title,
} from 'react-native-paper';
import { COLORS } from '../../shared/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { PortfolioContext } from '../context/PortfolioContext';

const SettingsScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const {
    portfolios,
    selectedPortfolio,
    selectPortfolio,
    createNewPortfolio,
    updateExistingPortfolio,
    deleteExistingPortfolio,
  } = useContext(PortfolioContext);

  const [portfolioDialogVisible, setPortfolioDialogVisible] = useState(false);
  const [editPortfolioDialogVisible, setEditPortfolioDialogVisible] = useState(false);
  const [portfolioMenuVisible, setPortfolioMenuVisible] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioDescription, setNewPortfolioDescription] = useState('');
  const [editPortfolioName, setEditPortfolioName] = useState('');
  const [editPortfolioDescription, setEditPortfolioDescription] = useState('');

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

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) {
      Alert.alert('Error', 'Please enter a portfolio name');
      return;
    }

    const result = await createNewPortfolio({
      name: newPortfolioName,
      description: newPortfolioDescription,
      currency: 'USD',
      type: 'stocks',
    });

    if (result.success) {
      setNewPortfolioName('');
      setNewPortfolioDescription('');
      setPortfolioDialogVisible(false);
      Alert.alert('Success', 'Portfolio created successfully!');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleEditPortfolio = () => {
    if (!selectedPortfolio) return;
    
    setEditPortfolioName(selectedPortfolio.name);
    setEditPortfolioDescription(selectedPortfolio.description || '');
    setEditPortfolioDialogVisible(true);
    setPortfolioMenuVisible(false);
  };

  const handleUpdatePortfolio = async () => {
    if (!editPortfolioName.trim()) {
      Alert.alert('Error', 'Please enter a portfolio name');
      return;
    }

    const result = await updateExistingPortfolio(selectedPortfolio.id, {
      name: editPortfolioName,
      description: editPortfolioDescription,
    });

    if (result.success) {
      setEditPortfolioDialogVisible(false);
      Alert.alert('Success', 'Portfolio updated successfully!');
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleDeletePortfolio = () => {
    if (!selectedPortfolio) return;

    setPortfolioMenuVisible(false);

    Alert.alert(
      'Delete Portfolio',
      `Are you sure you want to delete "${selectedPortfolio.name}"? This will also delete all holdings in this portfolio.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteExistingPortfolio(selectedPortfolio.id);
            if (!result.success) {
              Alert.alert('Error', result.error);
            }
          },
        },
      ]
    );
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
        <List.Subheader>Portfolio Management</List.Subheader>
        
        <List.Item
          title="Current Portfolio"
          description={selectedPortfolio?.name || 'No portfolio selected'}
          left={(props) => <List.Icon {...props} icon="briefcase" color={COLORS.primary} />}
          right={(props) => (
            <Menu
              visible={portfolioMenuVisible}
              onDismiss={() => setPortfolioMenuVisible(false)}
              anchor={
                <List.Icon
                  {...props}
                  icon="dots-vertical"
                  onPress={() => setPortfolioMenuVisible(true)}
                />
              }
            >
              <Menu.Item
                onPress={handleEditPortfolio}
                title="Edit Portfolio"
                leadingIcon="pencil"
              />
              <Menu.Item
                onPress={handleDeletePortfolio}
                title="Delete Portfolio"
                leadingIcon="delete"
              />
            </Menu>
          )}
        />

        {portfolios.length > 1 && (
          <>
            <Divider />
            <List.Accordion
              title="Switch Portfolio"
              left={(props) => <List.Icon {...props} icon="swap-horizontal" />}
            >
              {portfolios.map((portfolio) => (
                <List.Item
                  key={portfolio.id}
                  title={portfolio.name}
                  description={portfolio.description}
                  onPress={() => {
                    selectPortfolio(portfolio);
                  }}
                  right={(props) =>
                    selectedPortfolio?.id === portfolio.id ? (
                      <List.Icon {...props} icon="check" color={COLORS.success} />
                    ) : null
                  }
                  style={styles.portfolioItem}
                />
              ))}
            </List.Accordion>
          </>
        )}

        <Divider />
        <List.Item
          title="Create New Portfolio"
          description="Start tracking a new investment portfolio"
          left={(props) => <List.Icon {...props} icon="plus-circle" color={COLORS.success} />}
          onPress={() => setPortfolioDialogVisible(true)}
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

      {/* Create Portfolio Dialog */}
      <Portal>
        <Dialog
          visible={portfolioDialogVisible}
          onDismiss={() => setPortfolioDialogVisible(false)}
        >
          <Dialog.Title>Create New Portfolio</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Portfolio Name"
              value={newPortfolioName}
              onChangeText={setNewPortfolioName}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., My Stocks"
            />
            <TextInput
              label="Description (Optional)"
              value={newPortfolioDescription}
              onChangeText={setNewPortfolioDescription}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={2}
              placeholder="e.g., Long-term growth stocks"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPortfolioDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleCreatePortfolio}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit Portfolio Dialog */}
      <Portal>
        <Dialog
          visible={editPortfolioDialogVisible}
          onDismiss={() => setEditPortfolioDialogVisible(false)}
        >
          <Dialog.Title>Edit Portfolio</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Portfolio Name"
              value={editPortfolioName}
              onChangeText={setEditPortfolioName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Description (Optional)"
              value={editPortfolioDescription}
              onChangeText={setEditPortfolioDescription}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={2}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditPortfolioDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleUpdatePortfolio}>Update</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
  portfolioItem: {
    paddingLeft: 32,
  },
  input: {
    marginBottom: 12,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default SettingsScreen;
