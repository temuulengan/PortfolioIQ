import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { getUserPortfolios, createPortfolio, updatePortfolio, deletePortfolio } from '../../services/firebase/firebase';
import { getCurrentUser as svcGetCurrentUser } from '../../services/firebase/firebase';

export const PortfolioListContext = createContext();

export const PortfolioListProvider = ({ children }) => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      loadPortfolios();
    } else {
      setPortfolios([]);
      setSelectedPortfolio(null);
    }
  }, [user, authLoading]);

  const loadPortfolios = async () => {
    try {
      if (authLoading) return;
      if (!user) return;
      const svcUser = svcGetCurrentUser && svcGetCurrentUser();
      if (!svcUser) return;
      setLoading(true);
      const list = await getUserPortfolios(svcUser.uid || user.uid);
      setPortfolios(list);
      if (list.length > 0 && !selectedPortfolio) setSelectedPortfolio(list[0]);
    } catch (err) {
      console.error('Error loading portfolios:', err);
    } finally {
      setLoading(false);
    }
  };

  const createNewPortfolio = async (portfolioData) => {
    try {
      if (!user) throw new Error('User not authenticated');
      const newPortfolio = await createPortfolio(portfolioData, user.uid);
      setPortfolios(prev => [...prev, newPortfolio]);
      setSelectedPortfolio(newPortfolio);
      return { success: true, portfolio: newPortfolio };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateExistingPortfolio = async (portfolioId, updates) => {
    try {
      await updatePortfolio(portfolioId, updates);
      const updatedPortfolios = portfolios.map(p => p.id === portfolioId ? { ...p, ...updates } : p);
      setPortfolios(updatedPortfolios);
      if (selectedPortfolio?.id === portfolioId) setSelectedPortfolio(prev => ({ ...prev, ...updates }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteExistingPortfolio = async (portfolioId) => {
    try {
      await deletePortfolio(portfolioId);
      const updated = portfolios.filter(p => p.id !== portfolioId);
      setPortfolios(updated);
      if (selectedPortfolio?.id === portfolioId) {
        setSelectedPortfolio(updated[0] || null);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const selectPortfolio = (portfolio) => {
    setSelectedPortfolio(portfolio);
  };

  return (
    <PortfolioListContext.Provider value={{
      portfolios,
      selectedPortfolio,
      loading,
      loadPortfolios,
      createNewPortfolio,
      updateExistingPortfolio,
      deleteExistingPortfolio,
      selectPortfolio,
    }}>
      {children}
    </PortfolioListContext.Provider>
  );
};
