import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc
} from 'firebase/firestore';

// Import Firebase configuration
import { firebaseConfig } from '../../services/firebase/firebase-config';

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with AsyncStorage persistence (only if not already initialized)
let auth;
try {
  auth = getAuth(app);
} catch {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

const db = getFirestore(app);

// ==================== AUTH FUNCTIONS ====================

/**
 * Register a new user
 */
export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (displayName) {
      await updateProfile(user, { displayName });
    }

    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: displayName || '',
      createdAt: Timestamp.now(),
    });

    return user;
  } catch (error) {
    throw error;
  }
};

/**
 * Sign in existing user
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    throw error;
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
};

/**
 * Get current user (synchronous — may be null during auth restore)
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Listen to auth state changes
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Update Firebase Auth profile for current user (displayName, photoURL)
 */
export const updateAuthProfile = async (updates) => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    await updateProfile(user, updates);
    return true;
  } catch (error) {
    throw error;
  }
};

// ==================== PORTFOLIO FUNCTIONS ====================

/**
 * Create a new portfolio
 * uid is passed from context to avoid auth race condition
 */
export const createPortfolio = async (portfolioData, uid) => {
  try {
    if (!uid) throw new Error('User not authenticated');

    const portfolio = {
      ...portfolioData,
      userId: uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'portfolios'), portfolio);
    return { id: docRef.id, ...portfolio };
  } catch (error) {
    throw error;
  }
};

/**
 * Get all portfolios for current user
 * uid is passed from context to avoid auth race condition
 */
export const getUserPortfolios = async (uid) => {
  try {
    if (!uid) throw new Error('User not authenticated');

    const q = query(
      collection(db, 'portfolios'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const portfolios = [];
    querySnapshot.forEach((doc) => {
      portfolios.push({ id: doc.id, ...doc.data() });
    });

    return portfolios;
  } catch (error) {
    throw error;
  }
};

/**
 * Update portfolio
 */
export const updatePortfolio = async (portfolioId, updates) => {
  try {
    const portfolioRef = doc(db, 'portfolios', portfolioId);
    await updateDoc(portfolioRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete portfolio and all its holdings
 */
export const deletePortfolio = async (portfolioId) => {
  try {
    const holdingsQuery = query(
      collection(db, 'holdings'),
      where('portfolioId', '==', portfolioId)
    );
    const holdingsSnapshot = await getDocs(holdingsQuery);
    const deletePromises = holdingsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    await deleteDoc(doc(db, 'portfolios', portfolioId));
  } catch (error) {
    throw error;
  }
};

// ==================== HOLDINGS FUNCTIONS ====================

/**
 * Add a new holding
 * uid is passed from context to avoid auth race condition
 */
export const addHolding = async (portfolioId, holdingData, uid) => {
  try {
    if (!uid) throw new Error('User not authenticated');

    const holding = {
      ...holdingData,
      portfolioId: portfolioId,
      userId: uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'holdings'), holding);
    return { id: docRef.id, ...holding };
  } catch (error) {
    throw error;
  }
};

/**
 * Get all holdings for a portfolio
 * uid is passed from context to avoid auth race condition
 */
export const getPortfolioHoldings = async (portfolioId, uid) => {
  try {
    if (!uid) throw new Error('User not authenticated');

    const q = query(
      collection(db, 'holdings'),
      where('portfolioId', '==', portfolioId),
      where('userId', '==', uid)
    );

    const querySnapshot = await getDocs(q);
    const holdings = [];
    querySnapshot.forEach((doc) => {
      holdings.push({ id: doc.id, ...doc.data() });
    });

    return holdings;
  } catch (error) {
    throw error;
  }
};

/**
 * Update holding
 */
export const updateHolding = async (holdingId, updates) => {
  try {
    const holdingRef = doc(db, 'holdings', holdingId);
    await updateDoc(holdingRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete holding
 */
export const deleteHolding = async (holdingId) => {
  try {
    await deleteDoc(doc(db, 'holdings', holdingId));
  } catch (error) {
    throw error;
  }
};

// ==================== TRANSACTIONS FUNCTIONS ====================

/**
 * Add a transaction (buy/sell/dividend) tied to a portfolio
 * uid is passed from context to avoid auth race condition
 */
export const addTransaction = async (portfolioId, transactionData, uid) => {
  try {
    if (!uid) throw new Error('User not authenticated');

    const tx = {
      ...transactionData,
      portfolioId,
      userId: uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'transactions'), tx);
    return { id: docRef.id, ...tx };
  } catch (error) {
    throw error;
  }
};

/**
 * Get all transactions for a portfolio (ordered by date desc)
 * uid is passed from context to avoid auth race condition
 */
export const getPortfolioTransactions = async (portfolioId, uid) => {
  try {
    if (!uid) throw new Error('User not authenticated');

    const q = query(
      collection(db, 'transactions'),
      where('portfolioId', '==', portfolioId),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const txs = [];
    snapshot.forEach(doc => txs.push({ id: doc.id, ...doc.data() }));
    return txs;
  } catch (error) {
    throw error;
  }
};

/**
 * Update a transaction
 */
export const updateTransaction = async (transactionId, updates) => {
  try {
    const txRef = doc(db, 'transactions', transactionId);
    await updateDoc(txRef, { ...updates, updatedAt: Timestamp.now() });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a transaction
 */
export const deleteTransaction = async (transactionId) => {
  try {
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (error) {
    throw error;
  }
};

// ==================== USER FUNCTIONS ====================

/**
 * Get user profile
 */
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, updates, { merge: true });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete user account
 * IMPORTANT: requires recent re-authentication before calling FirebaseAuth.currentUser.delete()
 */
export const deleteUserAccount = async (userId) => {
  // TODO: implement full account deletion (Firestore documents + Auth user delete with reauth)
  console.warn('deleteUserAccount called for', userId);
};

// Export Firestore utilities
export { Timestamp, db, auth };