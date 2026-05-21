import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
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
} from '../../services/firebase/firebase';
import { getCurrentUser as svcGetCurrentUser } from '../../services/firebase/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../services/firebase/firebase';
import { getStockPrice, getMultipleStockPrices } from '../../services/api/stockAPI';
import { checkPriceAlerts, createNotification, NOTIFICATION_TYPES } from '../../services/notifications/notificationService';

export const PortfolioContext = createContext();

export const PortfolioProvider = ({ children }) => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const holdingsUnsubscribeRef = useRef(null);
  const holdingsPollingRef = useRef(null);
  const lastPriceRefreshRef = useRef(0);
  const PRICE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const holdingsKeyRef = useRef('');
  const listeningPortfolioRef = useRef(null);
  const backgroundPriceIntervalRef = useRef(null);

  // Load portfolios when user changes
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
  }, [user, authLoading]);

  
  useEffect(() => {
   
    if (authLoading) return;

    if (selectedPortfolio && user) {
      attachHoldingsListener(selectedPortfolio.id, user.uid);
      // start background price refresher on selected portfolio
      startBackgroundPriceRefresh();
    } else {
      unsubscribeHoldings();
      setHoldings([]);
      setIsLoadingHoldings(false);
      stopBackgroundPriceRefresh();
    }

    return () => unsubscribeHoldings();
  }, [selectedPortfolio?.id, user?.uid, authLoading]);

  const startBackgroundPriceRefresh = () => {
    stopBackgroundPriceRefresh();
    backgroundPriceIntervalRef.current = setInterval(async () => {
      try {
        if (!selectedPortfolio || !user) return;
        if (!holdings || holdings.length === 0) return;
        const symbols = holdings.map(h => h.symbol).filter(Boolean);
        if (symbols.length === 0) return;
        const pricesData = await getMultipleStockPrices(symbols);
        const now = new Date().toISOString();
        await Promise.all(holdings.map(async (holding) => {
          const priceObj = pricesData.find(p => p.symbol === holding.symbol);
          if (priceObj && priceObj.price && priceObj.price !== holding.currentPrice) {
            await updateHolding(holding.id, {
              currentPrice: priceObj.price,
              lastUpdated: now,
            });
          }
        }));
        await checkPriceAlerts(holdings);
      } catch (err) {
        console.error('[BackgroundPriceRefresh] failed:', err);
      }
    }, PRICE_REFRESH_INTERVAL);
  };

  const stopBackgroundPriceRefresh = () => {
    if (backgroundPriceIntervalRef.current) {
      clearInterval(backgroundPriceIntervalRef.current);
      backgroundPriceIntervalRef.current = null;
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const unsubscribeHoldings = () => {
    if (holdingsUnsubscribeRef.current && typeof holdingsUnsubscribeRef.current === 'function') {
      try { holdingsUnsubscribeRef.current(); } catch (e) { /* ignore */ }
      holdingsUnsubscribeRef.current = null;
    }
    if (holdingsPollingRef.current) {
      clearInterval(holdingsPollingRef.current);
      holdingsPollingRef.current = null;
    }
    // stop any background price refresh and clear listening marker
    stopBackgroundPriceRefresh();
    listeningPortfolioRef.current = null;
  };

  const startPollingHoldings = (portfolioId, uid, interval = 8000) => {
    // clear any existing poller
    if (holdingsPollingRef.current) {
      clearInterval(holdingsPollingRef.current);
      holdingsPollingRef.current = null;
    }

    console.warn(`[HoldingsListener] starting polling fallback - portfolio=${portfolioId} uid=${uid} interval=${interval}ms`);

    // initial fetch
    (async () => {
      try {
        const rows = await getPortfolioHoldings(portfolioId);
        const visible = Array.isArray(rows) ? rows.filter(h => !h.archived && h.portfolioId === portfolioId) : [];
        setHoldings(visible);
        setIsLoadingHoldings(false);
      } catch (err) {
        console.error('[HoldingsListener] polling initial fetch failed:', err);
        setIsLoadingHoldings(false);
      }
    })();

    holdingsPollingRef.current = setInterval(async () => {
      try {
        const rows = await getPortfolioHoldings(portfolioId);
        const visible = Array.isArray(rows) ? rows.filter(h => !h.archived && h.portfolioId === portfolioId) : [];
        setHoldings(visible);
      } catch (err) {
        console.error('[HoldingsListener] polling fetch failed:', err);
      }
    }, interval);
  };

  /**
   * Attach a real-time onSnapshot listener for holdings.
   * UI updates automatically whenever Firestore data changes.
   */
  const attachHoldingsListener = (portfolioId, uid, clearFirst = true) => {
    unsubscribeHoldings();
    setIsLoadingHoldings(true);
    if (clearFirst) setHoldings([]);

    console.log(`[HoldingsListener] attach requested - portfolio=${portfolioId} uid=${uid}`);

    const q = query(
      collection(db, 'holdings'),
      where('portfolioId', '==', portfolioId),
      where('userId', '==', uid)
    );

    let unsub = null;
    try {
      // prevent re-attaching if already listening to this portfolio
      if (listeningPortfolioRef.current === portfolioId && holdingsUnsubscribeRef.current) {
        console.log(`[HoldingsListener] already listening to portfolio=${portfolioId}, skipping reattach`);
        return;
      }

      unsub = onSnapshot(q, (snapshot) => {
        console.log(`[HoldingsListener] snapshot received - portfolio=${portfolioId} uid=${uid} size=${snapshot.size}`);
        console.log('[HoldingsListener] docIds=', snapshot.docs.map(d => d.id));

        const rawHoldings = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(h => !h.archived && h.portfolioId === portfolioId);

        // Build a lightweight key from ids + updatedAt to detect real changes
        const docKey = snapshot.docs.map(d => {
          const data = d.data();
          const updated = (data && data.updatedAt && typeof data.updatedAt.toMillis === 'function')
            ? data.updatedAt.toMillis()
            : (data && data.updatedAt) || '';
          return `${d.id}:${updated}`;
        }).join('|');

        if (docKey !== holdingsKeyRef.current) {
          holdingsKeyRef.current = docKey;
          setHoldings(rawHoldings);
        } else {
          // No meaningful change — skip updating state to avoid re-render
        }
        setIsLoadingHoldings(false);
        // Note: price refreshes are handled by the background interval (startBackgroundPriceRefresh)
        if (rawHoldings.length === 0) {
          // nothing to do
        }
      }, (error) => {
        console.error('[HoldingsListener] Holdings snapshot error:', error);
        setIsLoadingHoldings(false);
        // Start polling fallback when Listen transport fails
        try {
          startPollingHoldings(portfolioId, uid);
        } catch (e) {
          console.error('[HoldingsListener] failed to start polling fallback:', e);
        }
      });

      holdingsUnsubscribeRef.current = unsub;
      listeningPortfolioRef.current = portfolioId;
    } catch (err) {
      console.error('[HoldingsListener] Failed to attach holdings snapshot listener:', err);
      setIsLoadingHoldings(false);
      // start polling fallback so UI doesn't hang
      try {
        startPollingHoldings(portfolioId, uid);
      } catch (e) {
        console.error('[HoldingsListener] failed to start polling fallback after attach error:', e);
      }
      // ensure we don't leave a dangling unsubscribe
      if (unsub && typeof unsub === 'function') {
        try { unsub(); } catch (e) { /* ignore */ }
      }
    }
  };

  // ── Portfolio operations ──────────────────────────────────────────────────

  const loadHoldings = async (portfolioId) => {
    try {
      if (authLoading) return;
      if (!user) return;
      setIsLoadingHoldings(true);
      setHoldings([]);

      const rows = await getPortfolioHoldings(portfolioId);
      const visible = Array.isArray(rows) ? rows.filter(h => !h.archived && h.portfolioId === portfolioId) : [];
      setHoldings(visible);
      setIsLoadingHoldings(false);
      return visible;
    } catch (err) {
      console.error('loadHoldings failed:', err);
      setIsLoadingHoldings(false);
      return [];
    }
  };

  const loadPortfolios = async () => {
    try {
      if (authLoading) return;
      if (!user) return;
      
      const svcUser = svcGetCurrentUser && svcGetCurrentUser();
      if (!svcUser) return;
      setLoading(true);
      const portfolioList = await getUserPortfolios(svcUser.uid || user.uid);
      setPortfolios(portfolioList);

      if (portfolioList.length > 0 && !selectedPortfolio) {
        setSelectedPortfolio(portfolioList[0]);
      }
    } catch (error) {
      console.error('Error loading portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewPortfolio = async (portfolioData) => {
    try {
      if (!user) throw new Error('User not authenticated');
      const newPortfolio = await createPortfolio(portfolioData, user.uid);
      setPortfolios(prev => [...prev, newPortfolio]);
      // Triggers useEffect → attachHoldingsListener automatically
      setSelectedPortfolio(newPortfolio);
      return { success: true, portfolio: newPortfolio };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateExistingPortfolio = async (portfolioId, updates) => {
    try {
      await updatePortfolio(portfolioId, updates);
      const updatedPortfolios = portfolios.map(p =>
        p.id === portfolioId ? { ...p, ...updates } : p
      );
      setPortfolios(updatedPortfolios);
      if (selectedPortfolio?.id === portfolioId) {
        setSelectedPortfolio(prev => ({ ...prev, ...updates }));
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteExistingPortfolio = async (portfolioId) => {
    try {
      await deletePortfolio(portfolioId);
      const updatedPortfolios = portfolios.filter(p => p.id !== portfolioId);
      setPortfolios(updatedPortfolios);
      if (selectedPortfolio?.id === portfolioId) {
        setHoldings([]);
        setSelectedPortfolio(updatedPortfolios[0] || null);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // ── Holdings operations ───────────────────────────────────────────────────

  const addNewHolding = async (holdingData) => {
    try {
      if (!selectedPortfolio) throw new Error('No portfolio selected');
      if (!user) throw new Error('User not authenticated');

      const priceData = await getStockPrice(holdingData.symbol);
      const currentPrice = priceData.price;

      // Write to Firestore — onSnapshot pushes update to UI automatically
      const newHolding = await addHolding(selectedPortfolio.id, {
        ...holdingData,
        currentPrice,
        lastUpdated: new Date().toISOString(),
      }, user.uid);

      await createNotification({
        type: NOTIFICATION_TYPES.HOLDING_ADDED,
        title: 'New Holding Added',
        message: `${holdingData.symbol}: ${holdingData.quantity} shares at $${currentPrice.toFixed(2)}`,
        data: { holdingId: newHolding.id, symbol: holdingData.symbol },
      });

      return { success: true, holding: newHolding };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateExistingHolding = async (holdingId, updates) => {
    try {
      // Write to Firestore — onSnapshot pushes update to UI automatically
      await updateHolding(holdingId, updates);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteExistingHolding = async (holdingId) => {
    try {
      // Write to Firestore — onSnapshot pushes update to UI automatically
      await deleteHolding(holdingId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const refreshPrices = async () => {
    try {
      setIsRefreshingPrices(true);
      setRefreshing(true);

      if (holdings.length === 0) {
        return { success: true };
      }

      const symbols = holdings.map(h => h.symbol);
      const pricesData = await getMultipleStockPrices(symbols);

      // Write updated prices — onSnapshot pushes changes back to UI
      await Promise.all(holdings.map(async (holding) => {
        const priceData = pricesData.find(p => p.symbol === holding.symbol);
        if (priceData && priceData.price) {
          await updateHolding(holding.id, {
            currentPrice: priceData.price,
            lastUpdated: new Date().toISOString(),
          });
        }
      }));

      await checkPriceAlerts(holdings);

      return { success: true };
    } catch (error) {
      console.error('Error refreshing prices:', error);
      return { success: false, error: error.message };
    } finally {
      setIsRefreshingPrices(false);
      setRefreshing(false);
    }
  };

  const selectPortfolio = (portfolio) => {
    
    setSelectedPortfolio(portfolio);
  };

  return (
    <PortfolioContext.Provider
      value={{
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
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};