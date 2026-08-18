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
  onAuthStateChanged,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
} from 'firebase/firestore';

// Import Firebase configuration
import { firebaseConfig } from './firebase-config';

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with AsyncStorage persistence for React Native.
// initializeAuth must come first: getAuth() would silently create an in-memory
// instance with no persistence, signing the user out on every app restart.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  // Already initialized (fast refresh / duplicate import) — reuse it.
  auth = getAuth(app);
}

// Long polling avoids the Listen transport failures seen on flaky mobile networks.
// This must run before any getFirestore(app) call anywhere in the app.
let db;
try {
  db = initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false });
} catch (e) {
  db = getFirestore(app);
}

// Reduce Firestore client log verbosity to hide transport-level WARNs
try {
  setLogLevel('error');
} catch (err) {
  // ignore if unavailable
}

/**
 * Resolve the acting user id. Callers may pass a uid explicitly (contexts hold
 * one from onAuthStateChanged, which avoids a race with auth restore); otherwise
 * we fall back to the live currentUser.
 */
const requireUid = (uid) => {
  const resolved = uid || auth.currentUser?.uid;
  if (!resolved) throw new Error('User not authenticated');
  return resolved;
};

// ==================== AUTH FUNCTIONS ====================

/**
 * Register a new user
 */
export const registerUser = async (email, password, displayName) => {
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
};

/**
 * Sign in existing user
 */
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  await firebaseSignOut(auth);
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

/**
 * Get current user (synchronous — may be null during auth restore)
 */
export const getCurrentUser = () => auth.currentUser;

/**
 * Listen to auth state changes
 */
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

/**
 * Update Firebase Auth profile for current user (displayName, photoURL)
 */
export const updateAuthProfile = async (updates) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  await updateProfile(user, updates);
  return true;
};

// ==================== PORTFOLIO FUNCTIONS ====================

/**
 * Create a new portfolio
 */
export const createPortfolio = async (portfolioData, uid) => {
  const userId = requireUid(uid);

  const portfolio = {
    ...portfolioData,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, 'portfolios'), portfolio);
  return { id: docRef.id, ...portfolio };
};

/**
 * Get all portfolios for the current user
 */
export const getUserPortfolios = async (uid) => {
  const userId = requireUid(uid);

  const q = query(
    collection(db, 'portfolios'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Update portfolio
 */
export const updatePortfolio = async (portfolioId, updates) => {
  await updateDoc(doc(db, 'portfolios', portfolioId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Delete a portfolio along with its holdings and transactions
 */
export const deletePortfolio = async (portfolioId, uid) => {
  const userId = requireUid(uid);

  // Ensure the portfolio exists and belongs to the current user
  const portfolioRef = doc(db, 'portfolios', portfolioId);
  const portfolioSnap = await getDoc(portfolioRef);
  if (!portfolioSnap.exists()) throw new Error('Portfolio not found');
  if (portfolioSnap.data().userId !== userId) {
    throw new Error('Insufficient permissions to delete this portfolio');
  }

  for (const collectionName of ['holdings', 'transactions']) {
    const childQuery = query(
      collection(db, collectionName),
      where('portfolioId', '==', portfolioId),
      where('userId', '==', userId)
    );
    const childSnapshot = await getDocs(childQuery);
    await Promise.all(childSnapshot.docs.map((d) => deleteDoc(d.ref)));
  }

  await deleteDoc(portfolioRef);
};

// ==================== HOLDINGS FUNCTIONS ====================

/**
 * Add a new holding
 */
export const addHolding = async (portfolioId, holdingData, uid) => {
  const userId = requireUid(uid);

  const holding = {
    ...holdingData,
    portfolioId,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, 'holdings'), holding);
  return { id: docRef.id, ...holding };
};

/**
 * Add several holdings in one batched write (used by CSV/Excel import)
 */
export const addHoldingsBatch = async (portfolioId, holdingsData, uid) => {
  const userId = requireUid(uid);
  if (!Array.isArray(holdingsData) || holdingsData.length === 0) return [];

  const created = [];
  // Firestore batches are capped at 500 writes
  for (let i = 0; i < holdingsData.length; i += 400) {
    const slice = holdingsData.slice(i, i + 400);
    const batch = writeBatch(db);
    slice.forEach((holdingData) => {
      const ref = doc(collection(db, 'holdings'));
      const holding = {
        ...holdingData,
        portfolioId,
        userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      batch.set(ref, holding);
      created.push({ id: ref.id, ...holding });
    });
    await batch.commit();
  }

  return created;
};

/**
 * Get all holdings for a portfolio
 */
export const getPortfolioHoldings = async (portfolioId, uid) => {
  const userId = requireUid(uid);

  const q = query(
    collection(db, 'holdings'),
    where('portfolioId', '==', portfolioId),
    where('userId', '==', userId)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Update holding
 */
export const updateHolding = async (holdingId, updates) => {
  await updateDoc(doc(db, 'holdings', holdingId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Delete holding
 */
export const deleteHolding = async (holdingId) => {
  await deleteDoc(doc(db, 'holdings', holdingId));
};

/**
 * Permanently remove holdings that were soft-deleted (archived) but whose
 * delete never completed — e.g. the app was backgrounded during the undo window.
 * Returns the number of documents swept.
 */
export const purgeArchivedHoldings = async (portfolioId, uid) => {
  const userId = requireUid(uid);

  const q = query(
    collection(db, 'holdings'),
    where('portfolioId', '==', portfolioId),
    where('userId', '==', userId),
    where('archived', '==', true)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  return snapshot.size;
};

// ==================== TRANSACTIONS FUNCTIONS ====================

/**
 * Add a transaction (buy/sell/dividend) tied to a portfolio
 */
export const addTransaction = async (portfolioId, transactionData, uid) => {
  const userId = requireUid(uid);

  const tx = {
    ...transactionData,
    portfolioId,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, 'transactions'), tx);
  return { id: docRef.id, ...tx };
};

/**
 * Get all transactions for a portfolio (ordered by date desc)
 */
export const getPortfolioTransactions = async (portfolioId, uid) => {
  const userId = requireUid(uid);

  const q = query(
    collection(db, 'transactions'),
    where('portfolioId', '==', portfolioId),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Update a transaction
 */
export const updateTransaction = async (transactionId, updates) => {
  await updateDoc(doc(db, 'transactions', transactionId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Delete a transaction
 */
export const deleteTransaction = async (transactionId) => {
  await deleteDoc(doc(db, 'transactions', transactionId));
};

// ==================== USER FUNCTIONS ====================

/**
 * Get user profile
 */
export const getUserProfile = async (userId) => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
};

/**
 * Update user profile (creates the document if it does not exist yet)
 */
export const updateUserProfile = async (userId, updates) => {
  await setDoc(doc(db, 'users', userId), updates, { merge: true });
};

/**
 * Permanently delete the signed-in user: every Firestore document they own,
 * then the Auth record itself.
 *
 * Firebase requires a recent login before deleting an Auth user, so the caller
 * must supply the account password for re-authentication.
 */
export const deleteUserAccount = async (password) => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  if (!user.email) throw new Error('Account has no email address to re-authenticate with');
  if (!password) throw new Error('Password is required to delete your account');

  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);

  const uid = user.uid;
  for (const collectionName of ['holdings', 'transactions', 'portfolio_history', 'portfolios']) {
    const ownedQuery = query(collection(db, collectionName), where('userId', '==', uid));
    const snapshot = await getDocs(ownedQuery);
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  }

  await deleteDoc(doc(db, 'users', uid));
  await deleteUser(user);
};

// Export Firestore utilities
export { Timestamp, db, auth };
