import React, { createContext, useState, useEffect, useContext } from 'react';
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

export const PortfolioContext = createContext();

export const PortfolioProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    }
  }, [selectedPortfolio]);

  const loadPortfolios = async () => {
    try {
      setLoading(true);
      const portfolioList = await getUserPortfolios(user.uid);
      setPortfolios(portfolioList);
      
      // Auto-select first portfolio if none selected
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
    try {
      setLoading(true);
      const holdingsList = await getPortfolioHoldings(portfolioId);
      setHoldings(holdingsList);
    } catch (error) {
      console.error('Error loading holdings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewPortfolio = async (portfolioData) => {
    try {
      const newPortfolio = await createPortfolio(user.uid, portfolioData);
      setPortfolios([...portfolios, newPortfolio]);
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
        setSelectedPortfolio(updatedPortfolios[0] || null);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const addNewHolding = async (holdingData) => {
    try {
      if (!selectedPortfolio) {
        throw new Error('No portfolio selected');
      }

      // Get current stock price
      const priceData = await getStockPrice(holdingData.symbol);
      const currentPrice = priceData.price;

      const newHolding = await addHolding(selectedPortfolio.id, {
        ...holdingData,
        currentPrice,
        lastUpdated: new Date().toISOString(),
      });

      setHoldings([...holdings, newHolding]);
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
      setHoldings(updatedHoldings);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteExistingHolding = async (holdingId) => {
    try {
      await deleteHolding(holdingId);
      const updatedHoldings = holdings.filter(h => h.id !== holdingId);
      setHoldings(updatedHoldings);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const refreshPrices = async () => {
    try {
      setRefreshing(true);
      
      if (holdings.length === 0) return;

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
      setHoldings(updatedHoldings);
      return { success: true };
    } catch (error) {
      console.error('Error refreshing prices:', error);
      return { success: false, error: error.message };
    } finally {
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
        refreshing,
        loadPortfolios,
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
