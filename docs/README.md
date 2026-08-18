# PortfolioIQ 

Investment Portfolio tracking and analysis app (in active development).

This Expo React Native project provides multi-portfolio management, realtime price enrichment, and built-in risk & simulation tools. The codebase is under active development — features, performance improvements, and integration work are ongoing.

---

## Project Overview

PortfolioIQ is a full-featured investment portfolio management app that allows users to:

- **Track Multiple Portfolios** - Manage different investment accounts
- **Real-Time Stock Prices** - Integrated with Yahoo Finance API
- **Performance Analytics** - Visualize portfolio performance with charts
- **Risk Analysis** - Assess portfolio risk metrics and diversification
- **Cloud Sync** - Secure data backup with Firebase Firestore
- **User Authentication** - Email/password authentication via Firebase Auth

---

## Features

### Core Features
- **Multi-Portfolio Management** - Create and switch between different portfolios
- **Holdings Tracking** - Add, edit, and delete stock holdings with purchase details
- **Real-Time Price Updates** - Automatic price refreshes from Yahoo Finance
- **Performance Metrics** - Total value, cost basis, gains/losses tracking
- **Search & Filter** - Find stocks with autocomplete search
- **Sorting Options** - Sort holdings by symbol, price, quantity, etc.

### Analytics & Simulation Features
- Portfolio Growth Charts — visualize performance over time
- Allocation Analysis — pie charts for holdings and asset-type distribution
- Top/Bottom Performers — identify best and worst performing positions
- Gain/Loss Tracking — track returns at holding and portfolio level
- Monte Carlo Simulation — configurable GBM simulations with percentile summaries
- Bridgewater-style Analysis — covariance and risk-parity utilities for correlated simulations

---

## Tech Stack

- Framework: React Native with Expo
- Language: JavaScript (ES6+)
- Navigation: React Navigation (Stack + Bottom Tabs)
- UI Library: React Native Paper
- Backend: Firebase (Auth + Firestore)
- State Management: React Context API (split contexts for list vs holdings)
- Charts / SVG: react-native-svg and react-native-chart-kit
- API Integration: Axios + Yahoo Finance endpoints
- Simulation Engine: Pure-JS Monte Carlo (services/simulations/monteCarlo.js) — offloaded via a worker shim in development

---

## Project Structure

```
PortfolioIQ/
├── src/
│   ├── screens/           # App screens
│   │   ├── DashboardScreen.js
│   │   ├── HoldingsScreen.js
│   │   ├── AddHoldingScreen.js
│   │   ├── AnalyticsScreen.js
│   │   ├── RiskScreen.js
│   │   ├── NotificationsScreen.js
│   │   └── SettingsScreen.js
│   ├── components/        # Reusable UI components
│   │   ├── PortfolioCard.js
│   │   ├── HoldingCard.js
│   │   ├── StockSearchBar.js
│   │   ├── AIInsights.js
│   │   └── MonteCarlo.js
│   ├── navigation/        # Navigation configuration
│   │   └── AppNavigator.js
│   ├── context/           # React Context providers
│   │   ├── AuthContext.js
│   │   ├── PortfolioContext.js
│   │   └── NotificationContext.js
│   ├── services/          # Business logic & API calls
│   │   ├── firebase.js
│   │   ├── stockAPI.js
│   │   ├── calculations.js
│   │   └── simulations/
│   │       └── monteCarlo.js
│   ├── shared/            # Shared utilities and analysis
│   │   ├── bridgewaterAnalysis.js
│   │   ├── colors.js
│   │   └── helpers.js
│   └── config/            # Configuration files
│       └── firebase-config.template.js
├── assets/                # Images, icons, fonts
├── services/              # app-level services (ai, api, firebase helpers)
├── App.js                 # Root component
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── babel.config.js        # Babel configuration
```

---

## Getting Started

### Prerequisites

- **Node.js** (v16 or later)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g expo-cli`)
- **iOS Simulator** (Mac) or **Android Emulator**
- **Firebase Account** (free tier works)

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd PortfolioIQ
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase** (see FIREBASE_SETUP.md)
   - Create Firebase project
   - Enable Authentication & Firestore
   - Copy `firebase-config.template.js` to `firebase-config.js`
   - Add your Firebase credentials

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on device/emulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app

---

## Developer Notes

- The Monte Carlo service (`services/simulations/monteCarlo.js`) supports correlated GBM via covariance matrices from `shared/bridgewaterAnalysis.js`.
- The app currently offloads heavy analytics work to a worker shim (`src/workers/analyticsWorker.js`) and defers heavy UI work via `InteractionManager`/idle scheduling.
- Contexts are split: `PortfolioListContext` (portfolios & selection) and `HoldingsContext` (holdings listener, CRUD, price refresh). This reduces unnecessary re-renders and listener churn.
- Background price refresh uses batched Firestore writes (`writeBatch`) to reduce round-trips and snapshot storms.
- UI performance: memoized holding/portfolio cards, FlatList tuning, and deferred heavy computations are implemented; more memoization and lazy-loading remain planned.

If you plan to extend analytics or simulation features, prefer running large compute off the main thread (worker/native) and reduce plotted path counts to keep the UI responsive.

---

## Future Enhancements

- Complete worker offload for heavy analytics (replace shim with real worker)
- Percentile-band rendering for charts (P10–P90 shading + sampled paths)
- Add deterministic tests for simulation engine and analytics routines
- Lazy-load chart libraries and memoize heavy components
- Improve incremental sync and backfill tooling for `portfolio_history` data

---

## Contributing

Contributions, issues, and feature requests are welcome. See CONTRIBUTING.md if present.

---

## License

MIT License - See LICENSE file for details

---

