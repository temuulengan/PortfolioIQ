import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { PortfolioListContext } from './PortfolioListContext';
import { AuthContext } from './AuthContext';
import {
  getPortfolioHoldings,
  addHolding,
  updateHolding,
  deleteHolding,
} from '../../services/firebase/firebase';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase/firebase';
import { getMultipleStockPrices } from '../../services/api/stockAPI';
import { checkPriceAlerts, createNotification, NOTIFICATION_TYPES } from '../../services/notifications/notificationService';

export const HoldingsContext = createContext();

export const HoldingsProvider = ({ children }) => {
  const { selectedPortfolio } = useContext(PortfolioListContext);
  const { user, loading: authLoading } = useContext(AuthContext);

  const [holdings, setHoldings] = useState([]);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  const holdingsUnsubscribeRef = useRef(null);
  const holdingsPollingRef = useRef(null);
  const holdingsKeyRef = useRef('');
  const listeningPortfolioRef = useRef(null);
  const backgroundPriceIntervalRef = useRef(null);
  const PRICE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (authLoading) return;
    if (selectedPortfolio && user) {
      attachHoldingsListener(selectedPortfolio.id, user.uid);
      startBackgroundPriceRefresh();
    } else {
      unsubscribeHoldings();
      setHoldings([]);
      setIsLoadingHoldings(false);
      stopBackgroundPriceRefresh();
    }
    return () => unsubscribeHoldings();
  }, [selectedPortfolio?.id, user?.uid, authLoading]);

  const unsubscribeHoldings = () => {
    if (holdingsUnsubscribeRef.current && typeof holdingsUnsubscribeRef.current === 'function') {
      try { holdingsUnsubscribeRef.current(); } catch (e) { /* ignore */ }
      holdingsUnsubscribeRef.current = null;
    }
    if (holdingsPollingRef.current) {
      clearInterval(holdingsPollingRef.current);
      holdingsPollingRef.current = null;
    }
    stopBackgroundPriceRefresh();
    listeningPortfolioRef.current = null;
  };

  const startPollingHoldings = (portfolioId, uid, interval = 8000) => {
    if (holdingsPollingRef.current) {
      clearInterval(holdingsPollingRef.current);
      holdingsPollingRef.current = null;
    }

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

  const attachHoldingsListener = (portfolioId, uid, clearFirst = true) => {
    unsubscribeHoldings();
    setIsLoadingHoldings(true);
    if (clearFirst) setHoldings([]);

    const q = query(
      collection(db, 'holdings'),
      where('portfolioId', '==', portfolioId),
      where('userId', '==', uid)
    );

    let unsub = null;
    try {
      if (listeningPortfolioRef.current === portfolioId && holdingsUnsubscribeRef.current) {
        return;
      }

      unsub = onSnapshot(q, (snapshot) => {
        const rawHoldings = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(h => !h.archived && h.portfolioId === portfolioId);

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
        }
        setIsLoadingHoldings(false);

      }, (error) => {
        console.error('[HoldingsListener] Holdings snapshot error:', error);
        setIsLoadingHoldings(false);
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
      try { startPollingHoldings(portfolioId, uid); } catch (e) { console.error(e); }
      if (unsub && typeof unsub === 'function') { try { unsub(); } catch (e) { } }
    }
  };

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

        // Use a single batch write to update multiple holdings in one commit
        const batch = writeBatch(db);
        let anyUpdate = false;
        holdings.forEach((holding) => {
          const priceObj = pricesData.find(p => p.symbol === holding.symbol);
          if (priceObj && priceObj.price && priceObj.price !== holding.currentPrice) {
            anyUpdate = true;
            batch.update(doc(db, 'holdings', holding.id), {
              currentPrice: priceObj.price,
              lastUpdated: now,
            });
          }
        });

        if (anyUpdate) await batch.commit();

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

  const loadHoldings = async (portfolioId) => {
    try {
      if (authLoading) return [];
      if (!user) return [];
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

  const addNewHolding = async (holdingData) => {
    try {
      if (!selectedPortfolio) throw new Error('No portfolio selected');
      if (!user) throw new Error('User not authenticated');

      const priceData = await getMultipleStockPrices([holdingData.symbol]);
      const currentPrice = priceData[0]?.price ?? 0;

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
      await updateHolding(holdingId, updates);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteExistingHolding = async (holdingId) => {
    try {
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

      if (holdings.length === 0) return { success: true };

      const symbols = holdings.map(h => h.symbol);
      const pricesData = await getMultipleStockPrices(symbols);

      // Batch updates to reduce round-trips
      const batch = writeBatch(db);
      let any = false;
      const now = new Date().toISOString();
      holdings.forEach((holding) => {
        const priceData = pricesData.find(p => p.symbol === holding.symbol);
        if (priceData && priceData.price) {
          any = true;
          batch.update(doc(db, 'holdings', holding.id), {
            currentPrice: priceData.price,
            lastUpdated: now,
          });
        }
      });
      if (any) await batch.commit();

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

  return (
    <HoldingsContext.Provider value={{
      holdings,
      isLoadingHoldings,
      refreshing,
      isRefreshingPrices,
      loadHoldings,
      addNewHolding,
      updateExistingHolding,
      deleteExistingHolding,
      refreshPrices,
    }}>
      {children}
    </HoldingsContext.Provider>
  );
};
