import axios from 'axios';
import { mapWithConcurrency } from '../../shared/helpers';

const YAHOO_FINANCE_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';

// A request with no timeout can hang for as long as the socket stays open,
// leaving the UI spinning forever. Cap it.
const REQUEST_TIMEOUT_MS = 12000;

// Yahoo rate limits aggressively once a portfolio has more than a handful of
// symbols, so requests are pooled rather than fired all at once.
const MAX_CONCURRENT_REQUESTS = 5;

const QUOTE_TTL_MS = 30 * 1000;
const HISTORY_TTL_MS = 10 * 60 * 1000;
const SEARCH_TTL_MS = 5 * 60 * 1000;

const client = axios.create({ timeout: REQUEST_TIMEOUT_MS });

// ==================== CACHING ====================

const cache = new Map();

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
};

const setCached = (key, value, ttl) => {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
};

/** Drop every cached response (used by tests and forced refreshes). */
export const clearStockCache = () => cache.clear();

// ==================== TRANSPORT ====================

const isRetryable = (error) => {
  if (error?.code === 'ECONNABORTED') return true; // timeout
  const status = error?.response?.status;
  if (!status) return true; // network error
  return status === 429 || status >= 500;
};

/**
 * Issue a GET, retrying transient failures with a short backoff. Yahoo answers
 * a burst of requests with 429s, and a single immediate retry recovers most of
 * them without the caller ever seeing an error.
 */
const get = async (url, params, { retries = 2 } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await client.get(url, { params });
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetryable(error)) break;
      const backoff = 400 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  throw lastError;
};

// ==================== PRICES ====================

/**
 * Get current stock price and basic info
 */
export const getStockPrice = async (symbol, { force = false } = {}) => {
  const cacheKey = `quote:${symbol}`;
  if (!force) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await get(`${YAHOO_FINANCE_BASE_URL}/chart/${symbol}`, {
      interval: '1d',
      range: '1d',
    });

    const meta = response.data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    if (!Number.isFinite(price)) {
      throw new Error(`No price returned for ${symbol}`);
    }

    const previousClose = Number.isFinite(meta.previousClose) ? meta.previousClose : null;
    const quote = {
      symbol,
      price,
      previousClose,
      change: previousClose != null ? price - previousClose : null,
      changePercent:
        previousClose != null && previousClose !== 0
          ? ((price - previousClose) / previousClose) * 100
          : null,
      currency: meta.currency,
    };

    setCached(cacheKey, quote, QUOTE_TTL_MS);
    return quote;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch price for ${symbol}`);
  }
};

/**
 * Get multiple stock prices, a few at a time.
 * Symbols that fail are omitted rather than failing the whole batch.
 */
export const getMultipleStockPrices = async (symbols, { force = false } = {}) => {
  const unique = [...new Set((symbols || []).filter(Boolean))];
  if (unique.length === 0) return [];

  const results = await mapWithConcurrency(
    unique,
    async (symbol) => {
      try {
        return await getStockPrice(symbol, { force });
      } catch (error) {
        return null;
      }
    },
    MAX_CONCURRENT_REQUESTS
  );

  return results.filter(Boolean);
};

/**
 * Get historical price data.
 * Daily bars do not change intraday, so these are cached for longer.
 */
export const getHistoricalPrices = async (symbol, period = '1mo', interval = '1d') => {
  const cacheKey = `history:${symbol}:${period}:${interval}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await get(`${YAHOO_FINANCE_BASE_URL}/chart/${symbol}`, {
      interval,
      range: period,
    });

    const result = response.data?.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const quotes = result?.indicators?.quote?.[0];

    if (!Array.isArray(timestamps) || !quotes) {
      throw new Error(`No historical data returned for ${symbol}`);
    }

    const history = {
      symbol,
      dates: timestamps.map((ts) => new Date(ts * 1000).toISOString()),
      prices: quotes.close || [],
      volumes: quotes.volume || [],
    };

    setCached(cacheKey, history, HISTORY_TTL_MS);
    return history;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch historical data for ${symbol}`);
  }
};

// ==================== SEARCH ====================

/**
 * Search for stocks by name or symbol
 */
export const searchStocks = async (query) => {
  const normalized = (query || '').trim();
  if (!normalized) return [];

  const cacheKey = `search:${normalized.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await get(YAHOO_SEARCH_URL, {
      q: normalized,
      quotesCount: 10,
      newsCount: 0,
    });

    const quotes = response.data?.quotes || [];
    const results = quotes.map((quote) => ({
      symbol: quote.symbol,
      name: quote.longname || quote.shortname,
      type: quote.quoteType,
      exchange: quote.exchange,
    }));

    setCached(cacheKey, results, SEARCH_TTL_MS);
    return results;
  } catch (error) {
    console.error('Error searching stocks:', error?.response?.data || error.message || error);
    // Return an empty array on failure so the UI can handle it gracefully
    return [];
  }
};

/**
 * Validate if a stock symbol exists.
 * Uses search rather than the chart endpoint, which logs a 404 for bad symbols.
 */
export const validateStockSymbol = async (symbol) => {
  try {
    const results = await searchStocks(symbol);
    if (!results || !results.length) return false;
    const target = (symbol || '').toLowerCase();
    return results.some((r) => (r.symbol || '').toLowerCase() === target);
  } catch (err) {
    return false;
  }
};
