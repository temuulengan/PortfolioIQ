/*
  scripts/fix_holdings_owner.js

  Usage:
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccount.json"
    node scripts/fix_holdings_owner.js <portfolioId> [--apply]

  Behavior:
    - Determines desired owner `userId` from the portfolio document (field `userId`).
    - Scans holdings with matching `portfolioId` and lists those where `userId` is missing or mismatched.
    - Dry-run by default; pass `--apply` to perform updates.
*/

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to service account JSON path');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/fix_holdings_owner.js <portfolioId> [--apply]');
  process.exit(1);
}

const portfolioId = args[0];
const apply = args.includes('--apply');

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

async function run() {
  console.log(`Scanning holdings for portfolio ${portfolioId} — apply=${apply}`);

  const portfolioRef = db.collection('portfolios').doc(portfolioId);
  const portfolioSnap = await portfolioRef.get();
  if (!portfolioSnap.exists) {
    console.error('Portfolio not found:', portfolioId);
    process.exit(1);
  }
  const portfolio = portfolioSnap.data();
  const desiredUserId = portfolio.userId;
  if (!desiredUserId) {
    console.error('Portfolio has no userId. Provide explicit owner in portfolio document first.');
    process.exit(1);
  }

  const q = db.collection('holdings').where('portfolioId', '==', portfolioId);
  const snap = await q.get();
  if (snap.empty) {
    console.log('No holdings found');
    return;
  }

  const candidates = [];
  snap.docs.forEach(doc => {
    const data = doc.data();
    const uid = data.userId || null;
    if (uid !== desiredUserId) {
      candidates.push({ id: doc.id, userId: uid, data });
    }
  });

  if (candidates.length === 0) {
    console.log('No ownership mismatches found.');
    return;
  }

  console.log(`Found ${candidates.length} candidate holdings to update:`);
  candidates.forEach(c => console.log(c.id, 'current userId=', c.userId));

  if (!apply) {
    console.log('\nDry-run complete. Re-run with --apply to update holdings userId to', desiredUserId);
    return;
  }

  console.log('\nApplying updates...');
  for (const c of candidates) {
    try {
      await db.collection('holdings').doc(c.id).update({ userId: desiredUserId });
      console.log('Updated', c.id);
    } catch (e) {
      console.error('Failed to update', c.id, e.message || e);
    }
  }

  console.log('Done applying updates.');
}

run().catch(e => { console.error(e); process.exit(1); });
