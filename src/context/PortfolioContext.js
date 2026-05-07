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
import { getStockPrice, getMultipleStockPrices } from '../../services/api/stockAPI';
import { checkPriceAlerts, createNotification, NOTIFICATION_TYPES } from '../../services/notifications/notificationService';

export const PortfolioContext = createContext();

export const PortfolioProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const fetchIdRef = useRef(0);
  const holdingsUnsubscribeRef = useRef(null);

  // Load portfolios when user changes
  useEffect(() => {
    if (user) {
      loadPortfolios();
    } else {
      setPortfolios([]);
      setSelectedPortfolio(null);
      setHoldings([]);
    }
  }, [user]);

  // Load holdings when selected portfolio changes
  useEffect(() => {
    if (selectedPortfolio) {
      loadHoldings(selectedPortfolio.id);
    } else {
      setHoldings([]);
      setIsLoadingHoldings(false);
    }
  }, [selectedPortfolio]);

  const loadPortfolios = async () => {
    try {
      if (!user) return;
      setLoading(true);
      // Pass user.uid directly to avoid auth race condition
      const portfolioList = await getUserPortfolios(user.uid);
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

  const loadHoldings = async (portfolioId) => {
    const localFetchId = ++fetchIdRef.current;
    try {
      if (!user) return;
      setIsLoadingHoldings(true);
      setHoldings([]);

      // Pass user.uid directly to avoid auth race condition
      const holdingsList = await getPortfolioHoldings(portfolioId, user.uid);
      let visibleHoldings = Array.isArray(holdingsList) ? holdingsList.filter(h => !h.archived) : [];

      // Safety filter: ensure all holdings belong to this portfolioId
      const mismatched = visibleHoldings.filter(h => h.portfolioId !== portfolioId);
      if (mismatched.length) {
        console.error('Dropping holdings with mismatched portfolioId during loadHoldings:', mismatched.map(m => m.id));
        visibleHoldings = visibleHoldings.filter(h => h.portfolioId === portfolioId);
      }

      if (visibleHoldings && visibleHoldings.length > 0) {
        try {
          const symbols = visibleHoldings.map(h => h.symbol).filter(Boolean);
          if (symbols.length > 0) {
            const pricesData = await getMultipleStockPrices(symbols);

            const now = new Date().toISOString();
            const updatedHoldings = visibleHoldings.map((holding) => {
              const priceObj = pricesData.find(p => p.symbol === holding.symbol);
              if (priceObj && priceObj.price) {
                return { ...holding, currentPrice: priceObj.price, lastUpdated: now };
              }
              return holding;
            });

            if (localFetchId === fetchIdRef.current) {
              setHoldings(updatedHoldings.filter(h => h.portfolioId === portfolioId));
              setIsLoadingHoldings(false);

              // Persist price updates in background
              (async () => {
                try {
                  await Promise.all(updatedHoldings.map(async (holding) => {
                    const orig = visibleHoldings.find(h => h.id === holding.id) || {};
                    if (holding.currentPrice !== orig.currentPrice) {
                      try {
                        await updateHolding(holding.id, { currentPrice: holding.currentPrice, lastUpdated: holding.lastUpdated });
                      } catch (err) {
                        console.error(`Failed to persist updated price for ${holding.symbol}:`, err.message || err);
                      }
                    }
                  }));
                } catch (err) {
                  console.error('Background price persist failed:', err);
                }
              })();
            } else {
              console.warn('Stale holdings fetch result discarded for', portfolioId);
            }
          } else {
            if (localFetchId === fetchIdRef.current) {
              setHoldings(visibleHoldings);
              setIsLoadingHoldings(false);
            }
          }
        } catch (err) {
          console.error('Error refreshing prices after loading holdings:', err);
          if (localFetchId === fetchIdRef.current) {
            setHoldings(visibleHoldings);
            setIsLoadingHoldings(false);
          }
        }
      } else {
        if (localFetchId === fetchIdRef.current) {
          setHoldings(visibleHoldings);
          setIsLoadingHoldings(false);
        }
      }
    } catch (error) {
      console.error('Error loading holdings:', error);
      if (localFetchId === fetchIdRef.current) {
        setHoldings([]);
        setIsLoadingHoldings(false);
      }
    }
  };

  const createNewPortfolio = async (portfolioData) => {
    try {
      if (!user) throw new Error('User not authenticated');
      // Pass user.uid directly to avoid auth race condition
      const newPortfolio = await createPortfolio(portfolioData, user.uid);
      setPortfolios([...portfolios, newPortfolio]);
      fetchIdRef.current += 1;
      setHoldings([]);
      setIsLoadingHoldings(true);
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
        setSelectedPortfolio({ ...selectedPortfolio, ...updates });
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
        fetchIdRef.current += 1;
        setHoldings([]);
        setIsLoadingHoldings(true);
        setSelectedPortfolio(updatedPortfolios[0] || null);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const addNewHolding = async (holdingData) => {
    try {
      if (!selectedPortfolio) throw new Error('No portfolio selected');
      if (!user) throw new Error('User not authenticated');

      const priceData = await getStockPrice(holdingData.symbol);
      const currentPrice = priceData.price;

      // Pass user.uid directly to avoid auth race condition
      const newHolding = await addHolding(selectedPortfolio.id, {
        ...holdingData,
        currentPrice,
        lastUpdated: new Date().toISOString(),
      }, user.uid);

      if (newHolding.portfolioId && selectedPortfolio && newHolding.portfolioId !== selectedPortfolio.id) {
        console.error('Attempted to add holding for mismatched portfolioId:', newHolding.id);
      } else {
        setHoldings(prev => [...prev, newHolding]);
      }

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
      const updatedHoldings = holdings.map(h =>
        h.id === holdingId ? { ...h, ...updates } : h
      );
      const filtered = (selectedPortfolio && selectedPortfolio.id)
        ? updatedHoldings.filter(h => h.portfolioId === selectedPortfolio.id)
        : updatedHoldings;
      setHoldings(filtered);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteExistingHolding = async (holdingId) => {
    try {
      await deleteHolding(holdingId);
      const updatedHoldings = holdings.filter(h => h.id !== holdingId);
      const filtered = (selectedPortfolio && selectedPortfolio.id)
        ? updatedHoldings.filter(h => h.portfolioId === selectedPortfolio.id)
        : updatedHoldings;
      setHoldings(filtered);
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
        setIsRefreshingPrices(false);
        setRefreshing(false);
        return { success: true };
      }

      const symbols = holdings.map(h => h.symbol);
      const pricesData = await getMultipleStockPrices(symbols);

      const updatePromises = holdings.map(async (holding) => {
        const priceData = pricesData.find(p => p.symbol === holding.symbol);
        if (priceData && priceData.price) {
          await updateHolding(holding.id, {
            currentPrice: priceData.price,
            lastUpdated: new Date().toISOString(),
          });
          return { ...holding, currentPrice: priceData.price };
        }
        return holding;
      });

      const updatedHoldings = await Promise.all(updatePromises);
      setHoldings(prev => {
        const pid = selectedPortfolio?.id;
        return pid ? updatedHoldings.filter(h => h.portfolioId === pid) : updatedHoldings;
      });

      await checkPriceAlerts(updatedHoldings);

      setIsRefreshingPrices(false);
      setRefreshing(false);
      return { success: true };
    } catch (error) {
      console.error('Error refreshing prices:', error);
      setIsRefreshingPrices(false);
      setRefreshing(false);
      return { success: false, error: error.message };
    }
  };

  const selectPortfolio = (portfolio) => {
    fetchIdRef.current += 1;
    if (holdingsUnsubscribeRef.current && typeof holdingsUnsubscribeRef.current === 'function') {
      try { holdingsUnsubscribeRef.current(); } catch (e) { /* ignore */ }
      holdingsUnsubscribeRef.current = null;
    }
    setHoldings([]);
    setIsLoadingHoldings(true);
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