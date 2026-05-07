import React, { createContext, useState, useEffect } from 'react';
import {
  loginUser,
  registerUser,
  signOut,
  getCurrentUser,
  resetPassword as resetUserPassword,
  onAuthChange,
} from '../../services/firebase/firebase';
import { getAuth, signInAnonymously } from 'firebase/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth state changes so we don't attempt Firestore reads
    // before a user is available.
    const unsub = onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // In development only: if no user is signed in, automatically sign in anonymously
      // to allow debugging flows that require auth (don't do this in production)
      if (__DEV__ && !currentUser) {
        try {
          const auth = getAuth();
          signInAnonymously(auth).catch(() => {});
        } catch (e) {
          // ignore
        }
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const login = async (email, password) => {
    try {
      const userData = await loginUser(email, password);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, displayName) => {
    try {
      const userData = await registerUser(email, password, displayName);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      await resetUserPassword(email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
