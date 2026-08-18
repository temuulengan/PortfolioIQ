/*
  scripts/apply_csv_to_portfolio.js

  Usage:
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
    node scripts/apply_csv_to_portfolio.js <portfolioId> <path/to/test2.csv> [--apply]

  Dry-run by default: prints intended updates. Pass --apply to perform writes.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to service account JSON path');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/apply_csv_to_portfolio.js <portfolioId> <path/to/test2.csv> [--apply]');
  process.exit(1);
}

const portfolioId = args[0];
const csvPath = args[1];
const apply = args.includes('--apply');

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

function toNumber(v) {
  if (v == null) return 0;
  const s = v.toString().replace(/[^0-9.\-]/g, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseCSVSync(fp) {
  const txt = fs.readFileSync(fp, 'utf8');
  const lines = txt.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(l => {
    const cols = l.split(',').map(c => c.trim());
    const obj = {};
    header.forEach((h, i) => { obj[h] = cols[i] || ''; });
    return obj;
  });
  return rows;
}

async function run() {
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }

  const rows = parseCSVSync(csvPath);
  console.log(`Parsed ${rows.length} rows from ${csvPath}`);

  // Map by symbol
  const mapped = rows.map(r => ({
    symbol: (r['Symbol'] || r['Ticker'] || r['symbol'] || '').toString().trim(),
    company: r['Company'] || r['Name'] || r['company'] || '',
    shares: toNumber(r['Shares'] || r['Qty'] || r['Quantity'] || r['shares']),
    avgCost: toNumber(r['Average Cost'] || r['Avg Cost' ] || r['avgcost'] || r['avgCost']),
    currentPrice: toNumber(r['Current Price'] || r['Price'] || r['currentPrice']),
    marketValue: toNumber(r['Market Value'] || r['MarketValue'] || r['marketValue']),
  })).filter(r => r.symbol);

  // Load existing holdings for portfolio
  const snap = await db.collection('holdings').where('portfolioId', '==', portfolioId).get();
  const existing = {};
  snap.docs.forEach(d => { const dat = d.data(); existing[(dat.symbol || dat.ticker || '').toString()] = { id: d.id, data: dat }; });

  for (const r of mapped) {
    const ex = existing[r.symbol];
    const newDoc = {
      portfolioId,
      symbol: r.symbol,
      name: r.company || null,
      quantity: r.shares,
      purchasePrice: r.avgCost || null,
      avgCost: r.avgCost || null,
      currentPrice: r.currentPrice || null,
      rawImportedMarketValue: r.marketValue || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (ex) {
      console.log(`Would update existing doc ${ex.id} for ${r.symbol}: set quantity=${r.shares}, purchasePrice=${r.avgCost}, currentPrice=${r.currentPrice}`);
      if (apply) {
        await db.collection('holdings').doc(ex.id).update(newDoc);
        console.log('Updated', ex.id);
      }
    } else {
      console.log(`Would create new holding for ${r.symbol}: quantity=${r.shares}, purchasePrice=${r.avgCost}, currentPrice=${r.currentPrice}`);
      if (apply) {
        const docRef = await db.collection('holdings').add({ ...newDoc, userId: null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log('Created', docRef.id);
      }
    }
  }

  console.log('Done.');
}

run().catch(e => { console.error(e); process.exit(1); });
