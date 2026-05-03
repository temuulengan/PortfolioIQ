// File: src/services/parsePortfolioFile.js
// Utility: parse CSV / XLSX portfolio files client-side and normalize rows

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const headerCandidates = {
  ticker: ['ticker', 'symbol', 'code'],
  shares: ['shares', 'qty', 'quantity', 'holdings'],
  weight: ['weight', 'w', 'allocation', 'percent', '%'],
  avgCost: ['avgcost', 'avg_cost', 'avg price', 'avgprice', 'cost'],
  name: ['name', 'description'],
  currentValue: ['current value', 'currentvalue', 'current_value', 'current value (usd)', 'current value (usd)'],
};

const normalizeHeader = (h) => (h || '').toString().trim().toLowerCase();

const detectColumnMap = (headers) => {
  const map = {};
  const lower = headers.map(normalizeHeader);
  const findKey = (candidates) => {
    for (const cand of candidates) {
      for (let i = 0; i < lower.length; i++) {
        if (lower[i].includes(cand)) return i;
      }
    }
    return -1;
  };

  Object.keys(headerCandidates).forEach(key => {
    const idx = findKey(headerCandidates[key]);
    if (idx >= 0) map[key] = idx;
  });
  return map;
};

// export for testability
export { detectColumnMap, toNumber };

const toNumber = (v) => {
  if (v == null) return null;
  const s = v.toString().replace(/[^0-9.\-]/g, '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export async function parsePortfolioFile(file) {
  // file: { uri, name }
  if (!file) return { rows: [], errors: ['No file provided'] };

  const name = (file.name || file.uri || '').toLowerCase();
  try {
    if (name.endsWith('.csv')) {
      // fetch file body then parse
      const text = await (await fetch(file.uri)).text();
      const parsed = Papa.parse(text, { skipEmptyLines: true });
      const data = parsed.data;
      if (!data || !data.length) return { rows: [], errors: ['Empty CSV'] };
      const headers = data[0].map(h => h || '');
      const map = detectColumnMap(headers);
      const rows = [];
      for (let i = 1; i < data.length; i++) {
        const r = data[i];
        if (!r || r.every(c => (c || '').toString().trim() === '')) continue;
        const ticker = (r[map.ticker] || '').toString().trim();
        const shares = map.shares !== undefined ? toNumber(r[map.shares]) : null;
        const weight = map.weight !== undefined ? toNumber(r[map.weight]) : null;
        const avgCost = map.avgCost !== undefined ? toNumber(r[map.avgCost]) : null;
        const currentValue = map.currentValue !== undefined ? toNumber(r[map.currentValue]) : null;
        rows.push({ ticker, shares, weight, avgCost, currentValue, raw: r });
      }
      return { rows, errors: [] };
    }

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const ab = await (await fetch(file.uri)).arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(ab), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
      if (!json || !json.length) return { rows: [], errors: ['Empty sheet'] };
      const headers = json[0].map(h => h || '');
      const map = detectColumnMap(headers);
      const rows = [];
      for (let i = 1; i < json.length; i++) {
        const r = json[i];
        if (!r || r.every(c => (c || '').toString().trim() === '')) continue;
        const ticker = (r[map.ticker] || '').toString().trim();
        const shares = map.shares !== undefined ? toNumber(r[map.shares]) : null;
        const weight = map.weight !== undefined ? toNumber(r[map.weight]) : null;
        const avgCost = map.avgCost !== undefined ? toNumber(r[map.avgCost]) : null;
        const currentValue = map.currentValue !== undefined ? toNumber(r[map.currentValue]) : null;
        rows.push({ ticker, shares, weight, avgCost, currentValue, raw: r });
      }
      return { rows, errors: [] };
    }

    return { rows: [], errors: ['Unsupported file type'] };
  } catch (err) {
    console.error('parsePortfolioFile error', err);
    return { rows: [], errors: [err.message || 'Parse error'] };
  }
}

export default { parsePortfolioFile };
