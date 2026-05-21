## Backend Setup

### Environment Variables

Firebase config and API keys are loaded from a `.env` file via `react-native-dotenv`. This file is already in `.gitignore` — never commit it.

```
GROQ_API_KEY=your_key_here
```

Restart Expo after any `.env` change:

```bash
npx expo start --clear
```

---

### Groq API

Free key available at [console.groq.com](https://console.groq.com) — no credit card needed. Free tier covers 14,400 requests/day. The app uses LLaMA 3.1 70B for portfolio analysis and 8B for metric explanations.

---

### Firestore Index

The `portfolio_history` collection requires a composite index. Create it in Firebase Console under Firestore → Indexes:

- Collection: `portfolio_history`
- Field 1: `portfolioId` (Ascending)
- Field 2: `date` (Descending)

Takes a few minutes to build after creation.

---

### Firestore Structure

```
users/{userId}
portfolios/{portfolioId}
holdings/{holdingId}
portfolio_history/{snapshotId}
```

---

### Dependencies

```
groq-sdk, date-fns, react-native-dotenv
```

---

### New Files

| File | Description |
|---|---|
| `.env` | Environment variables — do not commit |
| `src/services/aiService.js` | Groq AI integration |
| `src/services/historyService.js` | Portfolio history tracking |
| `src/components/AIInsights.js` | AI insights UI component |

---

### Modified Files

| File | Change |
|---|---|
| `babel.config.js` | Added react-native-dotenv plugin |
| `src/config/firebase-config.js` | Uses `@env` imports |
| `src/utils/helpers.js` | Date handling via date-fns |
| `src/screens/AnalyticsScreen.js` | Real historical data |
| `src/screens/DashboardScreen.js` | Added AI Insights component |

---

### Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /portfolios/{portfolioId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /holdings/{holdingId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /portfolio_history/{snapshotId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

---

### Troubleshooting

**AI Insights not loading** — verify `GROQ_API_KEY` is set in `.env` and Expo was restarted with `--clear`. Check the key is active at console.groq.com.

**Firestore permission errors** — the `portfolio_history` index is likely still building. Wait 5–10 minutes and retry.

**Historical data not appearing** — at least one holding must exist. `generateHistoricalData()` fetches from Yahoo Finance on first load, which may take a few seconds on a slow connection. Check console logs for specific errors.

**Date formatting errors** — confirm date-fns is installed (`npm list date-fns`) and that Firebase Timestamps are being handled correctly in `helpers.js`.