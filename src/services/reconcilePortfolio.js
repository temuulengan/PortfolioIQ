// File: src/services/reconcilePortfolio.js
// Reconcile parsed portfolio rows to validated tickers via Yahoo search/validate

import { validateStockSymbol, searchStocks } from '../../services/api/stockAPI';

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

export async function reconcilePortfolio(rows, opts = {}) {
  // rows: [{ ticker, shares, weight, avgCost }]
  const matched = [];
  const needsReview = [];
  const excluded = [];

  // iterate rows and validate
  for (const r of rows) {
    const original = (r.ticker || '').toString().trim();
    if (!original) {
      needsReview.push({ original, reason: 'Empty ticker', row: r });
      continue;
    }

    try {
      const ok = await validateStockSymbol(original);
      if (ok) {
        matched.push({ original, resolved: original, row: r });
        continue;
      }
    } catch (e) {
      // proceed to search
    }

    // Layer 2: fuzzy search via Yahoo search endpoint
    const suggestions = await searchStocks(original);
    if (suggestions && suggestions.length) {
      // pick best by exact symbol/name distance
      let best = null; let bestScore = Infinity;
      for (const s of suggestions) {
        const score = Math.min(levenshtein(s.symbol || '', original), levenshtein(s.name || '', original));
        if (score < bestScore) { bestScore = score; best = s; }
      }
      needsReview.push({ original, suggestion: best, row: r });
      continue;
    }

    // no suggestions — flag for manual review
    needsReview.push({ original, reason: 'No match found', row: r });
  }

  return { matched, needsReview, excluded };
}

export default { reconcilePortfolio };
