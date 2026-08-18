// File: src/services/reconcilePortfolio.js
// Reconcile parsed portfolio rows to validated tickers via Yahoo search/validate

import { validateStockSymbol, searchStocks } from '../../services/api/stockAPI';
import { mapWithConcurrency } from '../../shared/helpers';

// simple levenshtein distance for fuzzy matching
const levenshtein = (a = '', b = '') => {
  const A = a.toLowerCase();
  const B = b.toLowerCase();
  const m = A.length; const n = B.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = A[i-1] === B[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
    }
  }
  return dp[m][n];
};

const pickBestSuggestion = (suggestions, original) => {
  let best = null;
  let bestScore = Infinity;
  for (const s of suggestions) {
    const score = Math.min(
      levenshtein(s.symbol || '', original),
      levenshtein(s.name || '', original)
    );
    if (score < bestScore) { bestScore = score; best = s; }
  }
  return best;
};

/**
 * Resolve each parsed row to a tradable symbol.
 *
 * Every entry carries `rowIndex` — its position in the parsed rows — because
 * the review UI needs to address the original row, not its position within the
 * needs-review subset.
 */
export async function reconcilePortfolio(rows, opts = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const concurrency = opts.concurrency || 6;

  const results = await mapWithConcurrency(list, async (r, rowIndex) => {
    const original = (r?.ticker || '').toString().trim();
    if (!original) {
      return { rowIndex, original, row: r, reason: 'Empty ticker', status: 'review' };
    }

    try {
      const ok = await validateStockSymbol(original);
      if (ok) {
        return { rowIndex, original, resolved: original, row: r, status: 'matched' };
      }
    } catch (e) {
      // fall through to fuzzy search
    }

    // Layer 2: fuzzy search via the Yahoo search endpoint
    try {
      const suggestions = await searchStocks(original);
      if (suggestions && suggestions.length) {
        return {
          rowIndex,
          original,
          row: r,
          suggestion: pickBestSuggestion(suggestions, original),
          status: 'review',
        };
      }
    } catch (e) {
      // treated as no match below
    }

    return { rowIndex, original, row: r, reason: 'No match found', status: 'review' };
  }, concurrency);

  return {
    matched: results.filter((r) => r.status === 'matched'),
    needsReview: results.filter((r) => r.status === 'review'),
    excluded: [],
    // rowIndex -> resolved symbol (null when the row still needs a decision)
    byRowIndex: Object.fromEntries(results.map((r) => [r.rowIndex, r.resolved || null])),
  };
}

export default { reconcilePortfolio };
