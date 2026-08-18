## Backend Setup

### Environment Variables

Firebase **client** config is loaded from a `.env` file via `react-native-dotenv`.
This file is gitignored — never commit it. Copy `.env.example` to get started.

```
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

Restart Expo after any `.env` change:

```bash
npx expo start --clear
```

> **EAS builds do not see `.env`.** Because the file is gitignored, EAS never
> uploads it and every value arrives `undefined`. `services/firebase/firebase-config.js`
> now fails loudly instead of booting into opaque Firebase errors. Set the same
> keys as EAS environment variables before building:
>
> ```bash
> eas env:create --name FIREBASE_API_KEY --value "..." --environment production
> ```
>
> See https://docs.expo.dev/eas/environment-variables/

Secrets that are **not** app variables (anything that must not be extractable
from a shipped binary) belong in Cloud Functions — see below.

---

### AI features (Cloud Functions)

The Groq API key is held server-side. Model calls go through authenticated
callable functions in `functions/`, so the key never enters the app bundle.

```bash
cd functions && npm install && cd ..

# Store the key as a Firebase secret (free key at https://console.groq.com)
firebase functions:secrets:set GROQ_API_KEY

firebase deploy --only functions
```

Exposed callables: `generatePortfolioInsights`, `getRebalancingRecommendations`,
`explainRiskMetrics`. All three reject unauthenticated callers. Until they are
deployed, the app shows "AI features are not deployed yet" rather than failing
silently. The model used is `llama-3.3-70b-versatile`.

---

### Firestore rules and indexes

Rules and indexes are version-controlled in `firestore.rules` and
`firestore.indexes.json`. The app's `where('userId', '==', uid)` filters only
shape queries — the rules are what actually enforce per-user isolation, so they
must be deployed before the app is used with real accounts.

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

The indexes cover:

| Collection | Fields |
| --- | --- |
| `portfolios` | `userId` ASC, `createdAt` DESC |
| `transactions` | `portfolioId` ASC, `userId` ASC, `createdAt` DESC |
| `portfolio_history` | `userId` ASC, `portfolioId` ASC, `date` ASC |
| `holdings` | `portfolioId` ASC, `userId` ASC, `archived` ASC |

---

### Maintenance scripts

`scripts/` contains Node utilities that talk to Firestore through
`firebase-admin` (a **dev** dependency — it must never be bundled into the app).
They need a service-account key; run them from a trusted machine only.
