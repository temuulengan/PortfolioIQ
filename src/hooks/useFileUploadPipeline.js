// File: src/hooks/useFileUploadPipeline.js
// Hook to connect file upload -> parse -> reconcile -> enrichment -> analysis

import { useState, useCallback, useRef } from 'react';
import { parsePortfolioFile } from '../services/parsePortfolioFile';
import { reconcilePortfolio } from '../services/reconcilePortfolio';
import { getMultipleStockPrices, validateStockSymbol, searchStocks } from '../../services/api/stockAPI';
import { mapWithConcurrency } from '../../shared/helpers';

export const useFileUploadPipeline = (onComplete) => {
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [report, setReport] = useState(null);
  const [resolvedHoldings, setResolvedHoldings] = useState([]);
  const [loading, setLoading] = useState(false);

  // resolveAndRun reads the reconcile report; keep it in a ref so the callback
  // does not need to be re-created (and re-bound in the screen) on every change.
  const reportRef = useRef(null);

  const selectFile = useCallback((f) => setFile(f), []);

  const parse = useCallback(async () => {
    if (!file) return { rows: [], errors: [] };
    setLoading(true);
    try {
      const { rows, errors } = await parsePortfolioFile(file);
      setParsedRows(rows || []);
      setParseErrors(errors || []);
      return { rows, errors };
    } finally {
      setLoading(false);
    }
  }, [file]);

  const reconcile = useCallback(async (rows) => {
    setLoading(true);
    try {
      const r = await reconcilePortfolio(rows || parsedRows || []);
      reportRef.current = r;
      setReport(r);
      return r;
    } finally {
      setLoading(false);
    }
  }, [parsedRows]);

  const resolveAndRun = useCallback(async (overrides = {}, excludedIndices = []) => {
    setLoading(true);
    try {
      const rows = parsedRows || [];
      const excludeSet = new Set(excludedIndices || []);
      const alreadyResolved = reportRef.current?.byRowIndex || {};

      // Reconciliation already resolved most rows; only rows the user overrode,
      // or that reconciliation left open, need another network round trip.
      const pending = [];
      const resolvedRows = [];

      rows.forEach((row, index) => {
        if (excludeSet.has(index)) return;

        const override = (overrides[index] || '').toString().trim();
        if (override) {
          pending.push({ row, index, symbol: override });
          return;
        }

        const known = alreadyResolved[index];
        if (known) {
          resolvedRows.push({ ...row, resolvedSymbol: known });
          return;
        }

        const raw = (row.ticker || '').toString().trim();
        if (raw) pending.push({ row, index, symbol: raw });
      });

      const unresolved = [];
      const settled = await mapWithConcurrency(pending, async ({ row, symbol }) => {
        try {
          if (await validateStockSymbol(symbol)) return { ...row, resolvedSymbol: symbol };
        } catch (err) {
          // fall through to search
        }
        try {
          const suggestions = await searchStocks(symbol);
          if (Array.isArray(suggestions) && suggestions.length) {
            return { ...row, resolvedSymbol: suggestions[0].symbol };
          }
        } catch (err) {
          // fall through to unresolved
        }
        unresolved.push(row);
        return null;
      });

      resolvedRows.push(...settled.filter(Boolean));

      if (unresolved.length) {
        console.warn(
          'Unresolved tickers (excluded):',
          unresolved.map((u) => u.ticker || u.name || u.raw)
        );
      }

      // Enrich with latest prices
      const symbols = [...new Set(resolvedRows.map((r) => r.resolvedSymbol).filter(Boolean))];
      const prices = await getMultipleStockPrices(symbols);
      const priceMap = Object.fromEntries(prices.map((p) => [p.symbol, p.price ?? null]));

      let totalValue = 0;
      const enriched = resolvedRows.map((r) => {
        const sym = r.resolvedSymbol || r.ticker;
        const price = priceMap[sym] ?? null;
        const qty = r.shares || null;
        const value = price && qty ? price * qty : null;
        if (value) totalValue += value;
        return { ...r, price, value };
      });

      let final = enriched.map((e) => {
        if (e.value) return { ...e, weight: (e.value / Math.max(1e-9, totalValue)) * 100 };
        if (e.weight) return { ...e, weight: e.weight };
        return { ...e, weight: null };
      });

      // Renormalize weights to sum to 100% after exclusions (if weights present)
      const weightSum = final.reduce((s, it) => s + (Number(it.weight) || 0), 0);
      if (weightSum > 0) {
        final = final.map((it) => ({ ...it, weight: ((Number(it.weight) || 0) / weightSum) * 100 }));
      }

      // normalize shape for consumers: symbol, quantity, currentPrice, weight
      final = final.map((it) => ({
        symbol: it.resolvedSymbol || it.ticker,
        name: it.name || null,
        quantity: it.shares || null,
        currentPrice: it.price || null,
        weight: it.weight,
        avgCost: it.avgCost || null,
        raw: it.raw,
      }));

      setResolvedHoldings(final);
      if (onComplete) onComplete(final);
      return final;
    } finally {
      setLoading(false);
    }
  }, [parsedRows, onComplete]);

  return {
    file,
    selectFile,
    parse,
    parsedRows,
    parseErrors,
    reconcile,
    report,
    resolveAndRun,
    resolvedHoldings,
    loading,
  };
};

export default useFileUploadPipeline;
