/*
  scripts/compute_portfolio_totals.js

  Usage:
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
    node scripts/compute_portfolio_totals.js <portfolioId>

  Prints per-holding values, portfolio totals, cost basis, gain, gain% and top performers.
*/

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to service account JSON path');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/compute_portfolio_totals.js <portfolioId>');
  process.exit(1);
}

const portfolioId = args[0];

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function pct(n) { return (n*100).toFixed(2) + '%'; }

async function run() {
  console.log('Computing totals for portfolio', portfolioId);
  const q = db.collection('holdings').where('portfolioId', '==', portfolioId);
  const snap = await q.get();
  if (snap.empty) {
    console.log('No holdings found');
    return;
  }
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Compute per holding
  let totalValue = 0;
  let totalCost = 0;
  const details = docs.map(h => {
    const qty = toNumber(h.quantity);
    const current = toNumber(h.currentPrice || h.price || h.currentUnitPrice);
    const purchase = toNumber(h.purchasePrice ?? h.avgCost ?? 0);
    const value = qty * current;
    const cost = qty * purchase;
    totalValue += value;
    totalCost += cost;
    const gain = value - cost;
    const gainPct = purchase === 0 ? 0 : ((current - purchase) / purchase) * 100;
    return { id: h.id, symbol: h.symbol || h.ticker || '', qty, current, purchase, value, cost, gain, gainPct };
  });

  console.log('\nPer-holding:');
  details.forEach(d => {
    console.log(`${d.symbol || d.id}: qty=${d.qty}, price=${d.current.toFixed(4)}, value=${d.value.toFixed(2)}, cost=${d.cost.toFixed(2)}, gain=${d.gain.toFixed(2)}, pct=${d.gainPct.toFixed(2)}%`);
  });

  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost === 0 ? 0 : (totalGain / totalCost) * 100;

  console.log('\nPortfolio totals:');
  console.log('Total Value:', totalValue.toFixed(2));
  console.log('Total Cost Basis:', totalCost.toFixed(2));
  console.log('Total Gain:', totalGain.toFixed(2));
  console.log('Total Gain %:', totalGainPct.toFixed(2) + '%');

  const top = details.slice().sort((a,b) => b.gainPct - a.gainPct).slice(0,5);
  console.log('\nTop performers (by %):');
  top.forEach(t => console.log(`${t.symbol}: ${t.gainPct.toFixed(2)}% (value ${t.value.toFixed(2)})`));
}

run().catch(e => { console.error(e); process.exit(1); });
