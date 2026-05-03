import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { detectColumnMap, toNumber } from '../src/services/parsePortfolioFile.js';

const run = (filePath) => {
  const txt = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(txt, { skipEmptyLines: true });
  const data = parsed.data;
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
  console.log('Parsed', path.basename(filePath), JSON.stringify({ headers, map, rows }, null, 2));
};

(async () => {
  try {
    run('./docs/samples/fidelity.csv');
    run('./docs/samples/google_sheets.csv');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
