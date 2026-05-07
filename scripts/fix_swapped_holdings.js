/*
  scripts/fix_swapped_holdings.js

  Usage:
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
    node scripts/fix_swapped_holdings.js <portfolioId> [--apply] [--limit=100]

  By default this script performs a dry-run and prints candidate documents where
  `quantity` and `currentPrice` appear to be swapped or where one appears to hold
  a market-value instead of a per-share price. Pass `--apply` to perform updates.
*/

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to service account JSON path');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/fix_swapped_holdings.js <portfolioId> [--apply] [--limit=N]');
  process.exit(1);
}

const portfolioId = args[0];
const apply = args.includes('--apply');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 500;

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

const isNumber = (v) => typeof v === 'number' && Number.isFinite(v);

async function run() {
  console.log(`Scanning holdings for portfolio ${portfolioId} (limit ${limit}) — apply=${apply}`);
  const q = db.collection('holdings').where('portfolioId', '==', portfolioId).limit(limit);
  const snap = await q.get();
  if (snap.empty) {
    console.log('No holdings found');
    return;
  }

  const candidates = [];
  snap.docs.forEach(doc => {
    const d = doc.data();
    const id = doc.id;
    const quantity = Number(d.quantity) || 0;
    const currentPrice = Number(d.currentPrice) || 0;
    const purchasePrice = Number(d.purchasePrice ?? d.avgCost) || 0;
    // Heuristics:
    // - If quantity is large (likely a dollar amount) and currentPrice is a reasonable unit price,
    //   infer shares = quantity / currentPrice.
    // - If currentPrice is large and quantity is small, infer unitPrice = currentPrice / quantity.
    let score = 0;
    let reason = null;
    if (quantity > 1000 && currentPrice > 0 && (quantity / currentPrice) > 1.5) {
      score = quantity / Math.max(1, currentPrice);
      reason = 'quantityLooksLikeMarketValue';
    } else if (currentPrice > 1000 && quantity > 0 && (currentPrice / quantity) > 1.5) {
      score = currentPrice / Math.max(1, quantity);
      reason = 'currentPriceLooksLikeMarketValue';
    }

    if (score > 1) {
      candidates.push({ id, docRef: doc.ref, data: d, quantity, currentPrice, purchasePrice, reason, score });
    }
  });

  if (candidates.length === 0) {
    console.log('No candidate swapped holdings found.');
    return;
  }

  console.log(`Found ${candidates.length} candidate documents:`);
  for (const c of candidates) {
    console.log('---');
    console.log('id:', c.id);
    console.log('reason:', c.reason, 'score:', c.score.toFixed(2));
    console.log('quantity:', c.quantity, 'currentPrice:', c.currentPrice, 'purchasePrice:', c.purchasePrice);
    if (c.reason === 'quantityLooksLikeMarketValue') {
      const inferredShares = c.currentPrice > 0 ? (c.quantity / c.currentPrice) : null;
      console.log('inferredShares = quantity / currentPrice =', inferredShares ? inferredShares.toFixed(4) : 'N/A');
      const newQuantity = inferredShares ? Number((inferredShares).toFixed(4)) : c.quantity;
      const newCurrentPrice = c.currentPrice;
      console.log('would set quantity ->', newQuantity, 'currentPrice ->', newCurrentPrice);
      if (apply) {
        await c.docRef.update({ quantity: newQuantity, currentPrice: newCurrentPrice });
        console.log('applied update');
      }
    } else if (c.reason === 'currentPriceLooksLikeMarketValue') {
      const inferredPrice = c.quantity > 0 ? (c.currentPrice / c.quantity) : null;
      console.log('inferredPrice = currentPrice / quantity =', inferredPrice ? inferredPrice.toFixed(4) : 'N/A');
      const newQuantity = c.quantity;
      const newCurrentPrice = inferredPrice ? Number((inferredPrice).toFixed(4)) : c.currentPrice;
      console.log('would set quantity ->', newQuantity, 'currentPrice ->', newCurrentPrice);
      if (apply) {
        await c.docRef.update({ quantity: newQuantity, currentPrice: newCurrentPrice });
        console.log('applied update');
      }
    }
  }

  console.log('Done.');
}

run().catch(err => { console.error(err); process.exit(1); });
