import axios from 'axios';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance';

/**
 * Get current stock price and basic info
 */
export const getStockPrice = async (symbol) => {
  try {
    const response = await axios.get(`${YAHOO_FINANCE_BASE_URL}/chart/${symbol}`, {
      params: {
        interval: '1d',
        range: '1d',
      },
    });

    const data = response.data.chart.result[0];
    const meta = data.meta;
    const quote = data.indicators.quote[0];

    return {
      symbol: symbol,
      price: meta.regularMarketPrice,
      previousClose: meta.previousClose,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      currency: meta.currency,
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    throw new Error(`Failed to fetch price for ${symbol}`);
  }
};

/**
 * Get multiple stock prices at once
 */
export const getMultipleStockPrices = async (symbols) => {
  try {
    const promises = symbols.map(symbol => getStockPrice(symbol));
    const results = await Promise.allSettled(promises);

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
  } catch (error) {
    console.error('Error fetching multiple prices:', error);
    throw new Error('Failed to fetch prices');
  }
};

/**
 * Get historical price data
 */
export const getHistoricalPrices = async (symbol, period = '1mo', interval = '1d') => {
  try {
    const response = await axios.get(`${YAHOO_FINANCE_BASE_URL}/chart/${symbol}`, {
      params: {
        interval: interval,
        range: period,
      },
    });

    const data = response.data.chart.result[0];
    const timestamps = data.timestamp;
    const quotes = data.indicators.quote[0];

    return {
      symbol: symbol,
      dates: timestamps.map(ts => new Date(ts * 1000).toISOString()),
      prices: quotes.close,
      volumes: quotes.volume,
    };
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    throw new Error(`Failed to fetch historical data for ${symbol}`);
  }
};

/**
 * Search for stocks by name or symbol
 */
export const searchStocks = async (query) => {
  try {
    const response = await axios.get('https://query1.finance.yahoo.com/v1/finance/search', {
      params: {
        q: query,
        quotesCount: 10,
        newsCount: 0,
      },
    });

    const quotes = response.data && response.data.quotes ? response.data.quotes : [];
    return quotes.map(quote => ({
      symbol: quote.symbol,
      name: quote.longname || quote.shortname,
      type: quote.quoteType,
      exchange: quote.exchange,
    }));
  } catch (error) {
    console.error('Error searching stocks:', error?.response?.data || error.message || error);
    // Return an empty array on failure so UI can handle gracefully
    return [];
  }
};

/**
 * Get stock quote with detailed information
 */
export const getStockQuote = async (symbol) => {
  try {
    const response = await axios.get(`${YAHOO_FINANCE_BASE_URL}/quote`, {
      params: {
        symbols: symbol,
      },
    });

    const quote = response.data.quoteResponse.results[0];

    return {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName,
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      changePercent: quote.regularMarketChangePercent,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      pe: quote.trailingPE,
      eps: quote.epsTrailingTwelveMonths,
      high52Week: quote.fiftyTwoWeekHigh,
      low52Week: quote.fiftyTwoWeekLow,
      dividendYield: quote.dividendYield,
      currency: quote.currency,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    throw new Error(`Failed to fetch quote for ${symbol}`);
  }
};

/**
 * Get stock statistics
 */
export const getStockStatistics = async (symbol) => {
  try {
    const response = await axios.get(`${YAHOO_FINANCE_BASE_URL}/quoteSummary/${symbol}`, {
      params: {
        modules: 'defaultKeyStatistics,financialData',
      },
    });

    const data = response.data.quoteSummary.result[0];
    const stats = data.defaultKeyStatistics;
    const financial = data.financialData;

    return {
      symbol: symbol,
      beta: stats.beta,
      forwardPE: stats.forwardPE,
      trailingPE: stats.trailingPE,
      profitMargin: financial.profitMargins,
      returnOnEquity: financial.returnOnEquity,
      returnOnAssets: financial.returnOnAssets,
      revenueGrowth: financial.revenueGrowth,
      debtToEquity: financial.debtToEquity,
    };
  } catch (error) {
    console.error(`Error fetching statistics for ${symbol}:`, error);
    throw new Error(`Failed to fetch statistics for ${symbol}`);
  }
};

/**
 * Validate if a stock symbol exists
 */
export const validateStockSymbol = async (symbol) => {
  try {
    await getStockPrice(symbol);
    return true;
  } catch (error) {
    return false;
  }
};
