import React, { useState, useContext } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TextInput,
  Button,
  Text,
  Surface,
  Title,
  HelperText,
  Snackbar,
} from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import { isValidEmail, isValidPassword, getErrorMessage } from '../../shared/helpers';
import { COLORS } from '../../shared/colors';

const AuthScreen = () => {
  const { login, register, resetPassword } = useContext(AuthContext);

  const inputTheme = {
    colors: {
      primary: COLORS.primary,
      outline: COLORS.border,
      onSurfaceVariant: COLORS.textSecondary,
      error: COLORS.error,
    },
  };

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!isValidPassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      if (!displayName) {
        newErrors.displayName = 'Name is required';
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        const result = await login(email, password);
        if (!result.success) {
          showSnackbar(getErrorMessage(result.error));
        }
      } else {
        const result = await register(email, password, displayName);
        if (!result.success) {
          showSnackbar(getErrorMessage(result.error));
        }
      }
    } catch (error) {
      showSnackbar(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showSnackbar('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      showSnackbar('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email);
      if (result.success) {
        showSnackbar('Password reset email sent!');
      } else {
        showSnackbar(getErrorMessage(result.error));
      }
    } catch (error) {
      showSnackbar(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Title style={styles.title}>PortfolioIQ</Title>
            <Text style={styles.subtitle}>
              {isLogin ? 'Welcome Back!' : 'Create Account'}
            </Text>
          </View>

        <Surface style={styles.formContainer}>
          {!isLogin && (
            <>
              <TextInput
                label="Full Name"
                value={displayName}
                onChangeText={setDisplayName}
                mode="outlined"
                style={styles.input}
                theme={inputTheme}
                error={!!errors.displayName}
                autoCapitalize="words"
              />
              <HelperText type="error" visible={!!errors.displayName}>
                {errors.displayName}
              </HelperText>
            </>
          )}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            theme={inputTheme}
            keyboardType="email-address"
            autoCapitalize="none"
            error={!!errors.email}
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email}
          </HelperText>

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            theme={inputTheme}
            secureTextEntry={!showPassword}
            error={!!errors.password}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
          <HelperText type="error" visible={!!errors.password}>
            {errors.password}
          </HelperText>

          {!isLogin && (
            <>
              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                style={styles.input}
                theme={inputTheme}
                secureTextEntry={!showPassword}
                error={!!errors.confirmPassword}
              />
              <HelperText type="error" visible={!!errors.confirmPassword}>
                {errors.confirmPassword}
              </HelperText>
            </>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            buttonColor={COLORS.primary}
            textColor={COLORS.textWhite}
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </Button>

          {isLogin && (
            <Button
              mode="text"
              onPress={handleForgotPassword}
              disabled={loading}
              style={styles.forgotButton}
              textColor={COLORS.primary}
            >
              Forgot Password?
            </Button>
          )}

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <Button
              mode="text"
              onPress={toggleMode}
              disabled={loading}
              compact
              textColor={COLORS.primary}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </Button>
          </View>
        </Surface>
      </ScrollView>

      </SafeAreaView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  formContainer: {
    padding: 24,
    borderRadius: 16,
    elevation: 0,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    marginBottom: 4,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  forgotButton: {
    marginTop: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  toggleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  snackbar: {
    backgroundColor: COLORS.backgroundDark,
  },
});

export default AuthScreen;
