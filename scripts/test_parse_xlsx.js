import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { detectColumnMap, toNumber } from '../src/services/parsePortfolioFile.js';

// create a workbook similar to Fidelity XLSX
const wb = XLSX.utils.book_new();
const data = [
  ['Symbol', 'Quantity', 'Current Value', 'Avg Cost'],
  ['NFLX', '4', '1200', '300'],
  ['FB', '8', '1600', '200'],
];
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const outPath = path.join('docs', 'samples', 'fidelity.xlsx');
XLSX.writeFile(wb, outPath);
console.log('Wrote', outPath);

// now read it and parse similarly to parsePortfolioFile
const workbook = XLSX.readFile(outPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const json = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
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
console.log('Parsed XLSX', JSON.stringify({ headers, map, rows }, null, 2));
