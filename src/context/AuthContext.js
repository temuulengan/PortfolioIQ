import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  loginUser,
  registerUser,
  signOut,
  resetPassword as resetUserPassword,
  onAuthChange,
} from '../../services/firebase/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase auth state and keep `loading` true until the first
  // onAuthChange callback fires. This is the single source of truth for `user`:
  // the login/register/logout helpers below deliberately do not set it themselves.
  useEffect(() => {
    const unsub = onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      await loginUser(email, password);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    setLoading(true);
    try {
      await registerUser(email, password, displayName);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    try {
      await resetUserPassword(email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, resetPassword }),
    [user, loading, login, register, logout, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
