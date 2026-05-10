// Diagnose Firestore connection and collections
// Usage: node scripts/diagnose-firestore.js /path/to/serviceAccountKey.json

const admin = require('firebase-admin');
const path = require('path');

async function main() {
  const keyPath = process.argv[2];
  if (!keyPath) {
    console.error('Usage: node scripts/diagnose-firestore.js /path/to/serviceAccountKey.json');
    process.exit(2);
  }

  const key = require(path.resolve(keyPath));
  console.log('Using service account project_id:', key.project_id);

  admin.initializeApp({ credential: admin.credential.cert(key) });
  const db = admin.firestore();

  try {
    const cols = await db.listCollections();
    console.log('Top-level collections:');
    for (const c of cols) {
      try {
        const countSnap = await c.limit(1).get();
        const colName = c.id;
        let approx = 'unknown';
        if (countSnap.size === 0) approx = '0 (sample)';
        else approx = '>=1 (sample)';
        console.log(` - ${colName}: ${approx}`);
      } catch (e) {
        console.log(` - ${c.id}: (error reading)`, e.message || e);
      }
    }

    // Check specific collections
    const histCol = db.collection('portfolio_history');
    const histSnap = await histCol.limit(5).get();
    console.log('\nSample portfolio_history documents:', histSnap.size);
    histSnap.forEach(doc => console.log(' -', doc.id, doc.data()));

    const portCol = db.collection('portfolios');
    const portSnap = await portCol.limit(5).get();
    console.log('\nSample portfolios documents:', portSnap.size);
    portSnap.forEach(doc => console.log(' -', doc.id, doc.data()));

    const projectId = key.project_id;
    console.log('\nService account project_id:', projectId);
    console.log('If collections are empty, ensure the service account belongs to the same Firebase project as your app.');
  } catch (err) {
    console.error('Diagnosis failed:', err.message || err);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
