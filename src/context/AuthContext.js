import React, { createContext, useState, useEffect } from 'react';
import {
  loginUser,
  registerUser,
  signOut,
  getCurrentUser,
  resetPassword as resetUserPassword,
  onAuthChange,
} from '../../services/firebase/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to Firebase auth state and keep `loading` true until the
    // first onAuthChange callback fires. Do NOT auto sign-in anonymously.
    setLoading(true);
    const unsub = onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

const unsub = onAuthChange((currentUser) => {
  console.log('=== AUTH STATE ===');
  console.log('uid:', currentUser?.uid);
  console.log('email:', currentUser?.email);
  console.log('isAnonymous:', currentUser?.isAnonymous);
  setUser(currentUser);
  setLoading(false);
});

  const login = async (email, password) => {
    setLoading(true);
    try {
      const userData = await loginUser(email, password);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, displayName) => {
    setLoading(true);
    try {
      const userData = await registerUser(email, password, displayName);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut();
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
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
