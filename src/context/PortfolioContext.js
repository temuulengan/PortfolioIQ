import React, { createContext, useContext } from 'react';
import { PortfolioListProvider, PortfolioListContext } from './PortfolioListContext';
import { HoldingsProvider, HoldingsContext } from './HoldingsContext';

export const PortfolioContext = createContext();

const CombinedProvider = ({ children }) => {
  const list = useContext(PortfolioListContext);
  const holdings = useContext(HoldingsContext);
  const combined = { ...list, ...holdings };
  return (
    <PortfolioContext.Provider value={combined}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const PortfolioProvider = ({ children }) => (
  <PortfolioListProvider>
    <HoldingsProvider>
      <CombinedProvider>{children}</CombinedProvider>
    </HoldingsProvider>
  </PortfolioListProvider>
);