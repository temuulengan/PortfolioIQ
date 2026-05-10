// Backfill script: populate `userId` on documents in `portfolio_history`.
// Usage (run from project root):
//   node scripts/backfill-portfolio-history.js /path/to/serviceAccountKey.json
// Notes:
// - Run only from a trusted machine. Do NOT commit your service account key.
// - This uses the Admin SDK and requires the service account to have Firestore access.

const admin = require('firebase-admin');
const path = require('path');

async function main() {
  const keyPath = process.argv[2];
  if (!keyPath) {
    console.error('Usage: node scripts/backfill-portfolio-history.js /path/to/serviceAccountKey.json');
    process.exit(2);
  }

  const key = require(path.resolve(keyPath));
  admin.initializeApp({ credential: admin.credential.cert(key) });
  const db = admin.firestore();

  console.log('Scanning portfolio_history documents...');
  const snapshot = await db.collection('portfolio_history').get();
  console.log(`Found ${snapshot.size} history documents`);

  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.userId) continue; // already has userId

    const portfolioId = data.portfolioId;
    if (!portfolioId) {
      console.warn(`Skipping history doc ${doc.id}: missing portfolioId`);
      continue;
    }

    const portRef = db.collection('portfolios').doc(portfolioId);
    const portSnap = await portRef.get();
    if (!portSnap.exists) {
      console.warn(`Portfolio ${portfolioId} not found for history ${doc.id}`);
      continue;
    }

    const portfolio = portSnap.data();
    const userId = portfolio.userId;
    if (!userId) {
      console.warn(`Portfolio ${portfolioId} has no userId; skipping history ${doc.id}`);
      continue;
    }

    try {
      await doc.ref.update({ userId });
      updated++;
      if (updated % 50 === 0) console.log(`Updated ${updated} docs so far`);
    } catch (e) {
      console.error(`Failed to update ${doc.id}:`, e.message || e);
    }
  }

  console.log(`Backfill complete. Updated ${updated} documents.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
