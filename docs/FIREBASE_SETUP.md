## Firebase Setup

PortfolioIQ uses Firebase for authentication, Firestore as the cloud database, and server-side security rules.

---

### 1. Create a Firebase Project

Go to [console.firebase.google.com](https://console.firebase.google.com), sign in, and create a new project. Google Analytics is not required — leave it off.

---

### 2. Enable Authentication

In the Firebase Console, go to Authentication → Sign-in method and enable **Email/Password**. Leave the email link option disabled.

---

### 3. Create Firestore Database

Go to Firestore Database → Create database. Select **production mode** (security rules are configured in step 6). Choose the region closest to you — this cannot be changed later.

---

### 4. Get Your Firebase Config

Go to Project Settings → Your apps → add a Web app. After registering, copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

---

### 5. Add Config to Project

Copy the template and fill in your values:

```bash
cp src/config/firebase-config.template.js src/config/firebase-config.js
```

For production, use environment variables instead — add keys to `.env` and import via `@env` (see `BACKEND_SETUP.md`).

---

### 6. Security Rules

In Firestore Database → Rules, replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /portfolios/{portfolioId} {
      allow read, write: if request.auth != null &&
                            resource.data.userId == request.auth.uid;
      allow create: if request.auth != null &&
                       request.resource.data.userId == request.auth.uid;
    }
    match /holdings/{holdingId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click **Publish**.

---

### 7. Firestore Indexes

Create two composite indexes under Firestore → Indexes:

```
Collection: portfolios
Fields: userId (Ascending), createdAt (Descending)

Collection: holdings
Fields: portfolioId (Ascending), createdAt (Descending)
```

---

### Data Structure

```
users/{userId}
  email, displayName, createdAt

portfolios/{portfolioId}
  userId, name, description, currency, type, createdAt, updatedAt

holdings/{holdingId}
  portfolioId, symbol, name, quantity, purchasePrice,
  currentPrice, purchaseDate, assetType, notes, createdAt, lastUpdated
```

---

### Free Tier Limits

| Resource | Limit |
|---|---|
| Authentication | 50,000 verifications/month |
| Firestore reads | 50,000/day |
| Firestore writes | 20,000/day |
| Storage | 1 GB |
| Bandwidth | 10 GB/month |

Normal development and small-scale use will stay within these limits.

---

### Troubleshooting

**"Firebase App not initialized"** — check that `firebase-config.js` exists in `src/config/` and contains no placeholder values. Restart Metro with `npx expo start -c`.

**"Permission denied"** — the user is either not authenticated or the document's `userId` field doesn't match the logged-in user. Check security rules and verify auth state.

**"Network request failed"** — check internet connection and confirm the Firebase project is still active in the console.

**"Email already in use"** — account already exists, use login instead of sign up.