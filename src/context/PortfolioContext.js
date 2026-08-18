import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from './AuthContext';
import {
  getUserPortfolios,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioHoldings,
  addHolding,
  updateHolding,
  deleteHolding,
  purgeArchivedHoldings,
  db,
} from '../../services/firebase/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getStockPrice, getMultipleStockPrices } from '../../services/api/stockAPI';
import {
  checkPriceAlerts,
  createNotification,
  NOTIFICATION_TYPES,
} from '../../services/notifications/notificationService';

export const PortfolioContext = createContext();

const DEFAULT_REFRESH_MINUTES = 15;
const PRICE_REFRESH_SETTING_KEY = 'priceRefreshInterval';

export const PortfolioProvider = ({ children }) => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [refreshMinutes, setRefreshMinutes] = useState(DEFAULT_REFRESH_MINUTES);

  const holdingsUnsubscribeRef = useRef(null);
  const holdingsPollingRef = useRef(null);
  const holdingsKeyRef = useRef('');
  const listeningPortfolioRef = useRef(null);

  // The background refresher runs on a timer, long after the effect that started
  // it closed over state. It reads live values through these refs instead.
  const holdingsRef = useRef([]);
  const uidRef = useRef(null);
  const selectedPortfolioRef = useRef(null);

  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);
  useEffect(() => { uidRef.current = user?.uid || null; }, [user?.uid]);
  useEffect(() => { selectedPortfolioRef.current = selectedPortfolio; }, [selectedPortfolio]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const unsubscribeHoldings = useCallback(() => {
    if (typeof holdingsUnsubscribeRef.current === 'function') {
      try { holdingsUnsubscribeRef.current(); } catch (e) { /* ignore */ }
    }
    holdingsUnsubscribeRef.current = null;

    if (holdingsPollingRef.current) {
      clearInterval(holdingsPollingRef.current);
      holdingsPollingRef.current = null;
    }
    listeningPortfolioRef.current = null;
    holdingsKeyRef.current = '';
  }, []);

  const visibleHoldings = (rows, portfolioId) =>
    Array.isArray(rows) ? rows.filter((h) => !h.archived && h.portfolioId === portfolioId) : [];

  const startPollingHoldings = useCallback((portfolioId, uid, interval = 8000) => {
    if (holdingsPollingRef.current) {
      clearInterval(holdingsPollingRef.current);
      holdingsPollingRef.current = null;
    }

    console.warn(`[HoldingsListener] starting polling fallback - portfolio=${portfolioId}`);

    const fetchOnce = async () => {
      try {
        const rows = await getPortfolioHoldings(portfolioId, uid);
        setHoldings(visibleHoldings(rows, portfolioId));
      } catch (err) {
        console.error('[HoldingsListener] polling fetch failed:', err);
      } finally {
        setIsLoadingHoldings(false);
      }
    };

    fetchOnce();
    holdingsPollingRef.current = setInterval(fetchOnce, interval);
  }, []);

  /**
   * Attach a real-time onSnapshot listener for holdings.
   * UI updates automatically whenever Firestore data changes.
   */
  const attachHoldingsListener = useCallback((portfolioId, uid, clearFirst = true) => {
    // Already listening to this portfolio — nothing to do.
    if (listeningPortfolioRef.current === portfolioId && holdingsUnsubscribeRef.current) {
      return;
    }

    unsubscribeHoldings();
    setIsLoadingHoldings(true);
    if (clearFirst) setHoldings([]);

    const q = query(
      collection(db, 'holdings'),
      where('portfolioId', '==', portfolioId),
      where('userId', '==', uid)
    );

    try {
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const rawHoldings = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((h) => !h.archived && h.portfolioId === portfolioId);

          // Build a lightweight key from ids + updatedAt to detect real changes
          const docKey = snapshot.docs
            .map((d) => {
              const data = d.data();
              const updated =
                data?.updatedAt && typeof data.updatedAt.toMillis === 'function'
                  ? data.updatedAt.toMillis()
                  : data?.updatedAt || '';
              return `${d.id}:${updated}`;
            })
            .join('|');

          if (docKey !== holdingsKeyRef.current) {
            holdingsKeyRef.current = docKey;
            setHoldings(rawHoldings);
          }
          setIsLoadingHoldings(false);
        },
        (error) => {
          console.error('[HoldingsListener] snapshot error:', error);
          setIsLoadingHoldings(false);
          // Start polling fallback when the Listen transport fails
          startPollingHoldings(portfolioId, uid);
        }
      );

      holdingsUnsubscribeRef.current = unsub;
      listeningPortfolioRef.current = portfolioId;
    } catch (err) {
      console.error('[HoldingsListener] failed to attach listener:', err);
      setIsLoadingHoldings(false);
      startPollingHoldings(portfolioId, uid);
    }
  }, [startPollingHoldings, unsubscribeHoldings]);

  // ── Price syncing ─────────────────────────────────────────────────────────

  /**
   * Fetch fresh prices for the given holdings, persist the ones that moved, and
   * raise alerts based on the change since the previous refresh.
   */
  const syncPrices = useCallback(async (holdingsList, { force = false } = {}) => {
    const list = Array.isArray(holdingsList) ? holdingsList : [];
    const symbols = [...new Set(list.map((h) => h.symbol).filter(Boolean))];
    if (symbols.length === 0) return { success: true };

    const pricesData = await getMultipleStockPrices(symbols, { force });
    if (!pricesData.length) return { success: true };

    const priceBySymbol = Object.fromEntries(pricesData.map((p) => [p.symbol, p]));
    const previousPrices = Object.fromEntries(
      list.filter((h) => h.symbol).map((h) => [h.symbol, h.currentPrice])
    );
    const now = new Date().toISOString();

    await Promise.all(
      list.map(async (holding) => {
        const priceData = priceBySymbol[holding.symbol];
        if (!priceData?.price || priceData.price === holding.currentPrice) return;
        await updateHolding(holding.id, {
          currentPrice: priceData.price,
          previousClose: priceData.previousClose ?? holding.previousClose ?? null,
          lastUpdated: now,
        });
      })
    );

    const updated = list.map((h) => ({
      ...h,
      currentPrice: priceBySymbol[h.symbol]?.price ?? h.currentPrice,
    }));
    await checkPriceAlerts(updated, previousPrices);

    return { success: true };
  }, []);

  const refreshPrices = useCallback(async () => {
    try {
      setIsRefreshingPrices(true);
      setRefreshing(true);
      return await syncPrices(holdingsRef.current, { force: true });
    } catch (error) {
      console.error('Error refreshing prices:', error);
      return { success: false, error: error.message };
    } finally {
      setIsRefreshingPrices(false);
      setRefreshing(false);
    }
  }, [syncPrices]);

  // Load the user's price-refresh preference (minutes; 0 disables auto refresh)
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PRICE_REFRESH_SETTING_KEY)
      .then((stored) => {
        const parsed = Number(stored);
        if (!cancelled && stored != null && Number.isFinite(parsed) && parsed >= 0) {
          setRefreshMinutes(parsed);
        }
      })
      .catch(() => { /* keep default */ });
    return () => { cancelled = true; };
  }, []);

  // Background price refresher. Reads holdings through a ref so the interval
  // always sees the current list rather than the empty one it was created with.
  useEffect(() => {
    if (!selectedPortfolio || !user || refreshMinutes <= 0) return undefined;

    const intervalId = setInterval(async () => {
      try {
        if (!selectedPortfolioRef.current || !uidRef.current) return;
        await syncPrices(holdingsRef.current);
      } catch (err) {
        console.error('[BackgroundPriceRefresh] failed:', err);
      }
    }, refreshMinutes * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [selectedPortfolio?.id, user?.uid, refreshMinutes, syncPrices]);

  // ── Portfolio operations ──────────────────────────────────────────────────

  const loadPortfolios = useCallback(async () => {
    if (authLoading || !user) return [];
    try {
      setLoading(true);
      const portfolioList = await getUserPortfolios(user.uid);
      setPortfolios(portfolioList);
      setSelectedPortfolio((current) => current || portfolioList[0] || null);
      return portfolioList;
    } catch (error) {
      console.error('Error loading portfolios:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  const loadHoldings = useCallback(async (portfolioId) => {
    if (authLoading || !user) return [];
    try {
      setIsLoadingHoldings(true);
      const rows = await getPortfolioHoldings(portfolioId, user.uid);
      const visible = visibleHoldings(rows, portfolioId);
      setHoldings(visible);
      return visible;
    } catch (err) {
      console.error('loadHoldings failed:', err);
      return [];
    } finally {
      setIsLoadingHoldings(false);
    }
  }, [authLoading, user]);

  const createNewPortfolio = useCallback(async (portfolioData) => {
    try {
      if (!user) throw new Error('User not authenticated');
      const newPortfolio = await createPortfolio(portfolioData, user.uid);
      setPortfolios((prev) => [...prev, newPortfolio]);
      // Triggers the effect below → attachHoldingsListener automatically
      setSelectedPortfolio(newPortfolio);
      return { success: true, portfolio: newPortfolio };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [user]);

  const updateExistingPortfolio = useCallback(async (portfolioId, updates) => {
    try {
      await updatePortfolio(portfolioId, updates);
      setPortfolios((prev) =>
        prev.map((p) => (p.id === portfolioId ? { ...p, ...updates } : p))
      );
      setSelectedPortfolio((prev) =>
        prev?.id === portfolioId ? { ...prev, ...updates } : prev
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const deleteExistingPortfolio = useCallback(async (portfolioId) => {
    try {
      await deletePortfolio(portfolioId, user?.uid);

      const remaining = portfolios.filter((p) => p.id !== portfolioId);
      setPortfolios(remaining);

      if (selectedPortfolio?.id === portfolioId) {
        setHoldings([]);
        setSelectedPortfolio(remaining[0] || null);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [user?.uid, portfolios, selectedPortfolio?.id]);

  // ── Holdings operations ───────────────────────────────────────────────────

  const addNewHolding = useCallback(async (holdingData) => {
    try {
      if (!selectedPortfolio) throw new Error('No portfolio selected');
      if (!user) throw new Error('User not authenticated');

      let currentPrice = null;
      let previousClose = null;
      try {
        const priceData = await getStockPrice(holdingData.symbol);
        currentPrice = priceData.price;
        previousClose = priceData.previousClose ?? null;
      } catch (priceError) {
        // A quote outage should not block recording the position; the next
        // refresh fills the price in.
        console.warn(`Could not fetch price for ${holdingData.symbol}:`, priceError.message);
      }

      // Write to Firestore — onSnapshot pushes the update to the UI automatically
      const newHolding = await addHolding(
        selectedPortfolio.id,
        {
          ...holdingData,
          currentPrice,
          previousClose,
          lastUpdated: new Date().toISOString(),
        },
        user.uid
      );

      await createNotification({
        type: NOTIFICATION_TYPES.HOLDING_ADDED,
        title: 'New Holding Added',
        message: currentPrice
          ? `${holdingData.symbol}: ${holdingData.quantity} shares at $${currentPrice.toFixed(2)}`
          : `${holdingData.symbol}: ${holdingData.quantity} shares`,
        data: { holdingId: newHolding.id, symbol: holdingData.symbol },
      });

      return { success: true, holding: newHolding };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [selectedPortfolio, user]);

  const updateExistingHolding = useCallback(async (holdingId, updates) => {
    try {
      await updateHolding(holdingId, updates);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const deleteExistingHolding = useCallback(async (holdingId) => {
    try {
      await deleteHolding(holdingId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const selectPortfolio = useCallback((portfolio) => setSelectedPortfolio(portfolio), []);

  /**
   * Called by Settings when the user picks a new refresh cadence (minutes).
   */
  const applyPriceRefreshInterval = useCallback((minutes) => {
    const parsed = Number(minutes);
    if (Number.isFinite(parsed) && parsed >= 0) setRefreshMinutes(parsed);
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  // Load portfolios when the signed-in user changes
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      loadPortfolios();
    } else {
      setPortfolios([]);
      setSelectedPortfolio(null);
      setHoldings([]);
      unsubscribeHoldings();
    }
  }, [user, authLoading, loadPortfolios, unsubscribeHoldings]);

  // Attach the holdings listener for the selected portfolio
  useEffect(() => {
    if (authLoading) return undefined;

    if (selectedPortfolio && user) {
      attachHoldingsListener(selectedPortfolio.id, user.uid);

      // Sweep holdings whose undo-window delete never completed (app killed
      // mid-timer), so they don't linger invisibly in Firestore forever.
      purgeArchivedHoldings(selectedPortfolio.id, user.uid).catch((err) =>
        console.warn('Archived holdings sweep failed:', err.message)
      );
    } else {
      unsubscribeHoldings();
      setHoldings([]);
      setIsLoadingHoldings(false);
    }

    return () => unsubscribeHoldings();
  }, [selectedPortfolio?.id, user?.uid, authLoading, attachHoldingsListener, unsubscribeHoldings]);

  const value = useMemo(
    () => ({
      portfolios,
      selectedPortfolio,
      holdings,
      loading,
      isLoadingHoldings,
      refreshing,
      isRefreshingPrices,
      loadPortfolios,
      loadHoldings,
      createNewPortfolio,
      updateExistingPortfolio,
      deleteExistingPortfolio,
      addNewHolding,
      updateExistingHolding,
      deleteExistingHolding,
      refreshPrices,
      selectPortfolio,
      applyPriceRefreshInterval,
    }),
    [
      portfolios,
      selectedPortfolio,
      holdings,
      loading,
      isLoadingHoldings,
      refreshing,
      isRefreshingPrices,
      loadPortfolios,
      loadHoldings,
      createNewPortfolio,
      updateExistingPortfolio,
      deleteExistingPortfolio,
      addNewHolding,
      updateExistingHolding,
      deleteExistingHolding,
      refreshPrices,
      selectPortfolio,
      applyPriceRefreshInterval,
    ]
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
};
