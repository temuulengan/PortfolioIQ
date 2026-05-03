// File: src/hooks/useFileUploadPipeline.js
// Hook to connect file upload -> parse -> reconcile -> enrichment -> analysis

import { useState, useCallback } from 'react';
import { parsePortfolioFile } from '../services/parsePortfolioFile';
import { reconcilePortfolio } from '../services/reconcilePortfolio';
import { getMultipleStockPrices, validateStockSymbol, searchStocks } from '../../services/api/stockAPI';

export const useFileUploadPipeline = (onComplete) => {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [report, setReport] = useState(null);
  const [resolvedHoldings, setResolvedHoldings] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectFile = useCallback((f) => setFile(f), []);

  const parse = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    const { rows, errors } = await parsePortfolioFile(file);
    setParsedRows(rows || []);
    setParseErrors(errors || []);
    setLoading(false);
    return { rows, errors };
  }, [file]);

  const reconcile = useCallback(async () => {
    setLoading(true);
    const r = await reconcilePortfolio(parsedRows || []);
    setReport(r);
    setLoading(false);
    return r;
  }, [parsedRows]);

  const resolveAndRun = useCallback(async (overrides = {}, excludedIndices = []) => {
    // overrides: { idx: symbol }
    setLoading(true);
    // apply overrides to parsed rows
    let rows = (parsedRows || []).map((row, i) => {
      const o = overrides[i];
      return { ...row, ticker: o || row.ticker };
    }).filter(Boolean);

    // remove excluded indices
    if (Array.isArray(excludedIndices) && excludedIndices.length) {
      const excludeSet = new Set(excludedIndices);
      rows = rows.filter((_, i) => !excludeSet.has(i));
    }

    // Resolve symbols: try to validate tickers, otherwise search by name and pick first suggestion.
    const resolvedRows = [];
    const unresolved = [];
    for (const r of rows) {
      const rawSym = (r.ticker || '').toString().trim();
      if (!rawSym) {
        unresolved.push(r);
        continue;
      }
      let resolved = null;
      try {
        // eslint-disable-next-line no-await-in-loop
        const ok = await validateStockSymbol(rawSym);
        if (ok) resolved = rawSym;
      } catch (err) {
        // ignore and try search
      }
      if (!resolved) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const suggestions = await searchStocks(rawSym);
          if (Array.isArray(suggestions) && suggestions.length) resolved = suggestions[0].symbol;
        } catch (err) {
          // ignore
        }
      }
      if (resolved) resolvedRows.push({ ...r, resolvedSymbol: resolved });
      else unresolved.push(r);
    }

    if (unresolved.length) {
      console.warn('Unresolved tickers (excluded):', unresolved.map(u => u.ticker || u.name || u.raw));
    }

    // Validate again quickly and enrich with latest prices for resolved symbols
    const symbols = resolvedRows.map(r => r.resolvedSymbol).filter(Boolean);
    const prices = await getMultipleStockPrices(symbols);
    const priceMap = {};
    prices.forEach(p => { priceMap[p.symbol] = p.price || p.regularMarketPrice || null; });

    // compute weights if shares provided
    let totalValue = 0;
    const enriched = resolvedRows.map(r => {
      const sym = r.resolvedSymbol || r.ticker;
      const price = priceMap[sym] || null;
      const qty = r.shares || null;
      const value = (price && qty) ? price * qty : null;
      if (value) totalValue += value;
      return { ...r, price, value };
    });

    let final = enriched.map(e => {
      if (e.value) return { ...e, weight: (e.value / Math.max(1e-9, totalValue)) * 100 };
      if (e.weight) return { ...e, weight: e.weight };
      return { ...e, weight: null };
    });

    // Renormalize weights to sum to 100% after exclusions (if weights present)
    const weightSum = final.reduce((s, it) => s + (Number(it.weight) || 0), 0);
    if (weightSum > 0) {
      final = final.map(it => ({ ...it, weight: (Number(it.weight) || 0) / weightSum * 100 }));
    }

    // normalize shape for consumers: symbol, quantity, currentPrice, weight
    final = final.map(it => ({ symbol: it.resolvedSymbol || it.ticker, quantity: it.shares || null, currentPrice: it.price || null, weight: it.weight, avgCost: it.avgCost || null, raw: it.raw }));

    setResolvedHoldings(final);
    setLoading(false);
    onComplete && onComplete(final);
    return final;
  }, [parsedRows, onComplete]);

  return { file, selectFile, parse, parsedRows, parseErrors, reconcile, report, resolveAndRun, resolvedHoldings, loading };
};

export default useFileUploadPipeline;
