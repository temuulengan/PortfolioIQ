# PortfolioIQ 📊

**Investment Portfolio Tracking Application**

A React Native mobile application for tracking and analyzing investment portfolios. Built with Expo and Firebase, with added local simulation and risk-analysis tools.

---

## 📋 Project Overview

PortfolioIQ is a full-featured investment portfolio management app that allows users to:

- **Track Multiple Portfolios** - Manage different investment accounts
- **Real-Time Stock Prices** - Integrated with Yahoo Finance API
- **Performance Analytics** - Visualize portfolio performance with charts
- **Risk Analysis** - Assess portfolio risk metrics and diversification
- **Cloud Sync** - Secure data backup with Firebase Firestore
- **User Authentication** - Email/password authentication via Firebase Auth

---

## ✨ Features

### 📱 Core Features
- **Multi-Portfolio Management** - Create and switch between different portfolios
- **Holdings Tracking** - Add, edit, and delete stock holdings with purchase details
- **Real-Time Price Updates** - Automatic price refreshes from Yahoo Finance
- **Performance Metrics** - Total value, cost basis, gains/losses tracking
- **Search & Filter** - Find stocks with autocomplete search
- **Sorting Options** - Sort holdings by symbol, price, quantity, etc.

### 📊 Analytics & Simulation Features
- **Portfolio Growth Charts** - Visualize portfolio performance over time
- **Allocation Analysis** - Pie charts showing holdings and asset type distribution
- **Top/Bottom Performers** - Identify best and worst performing stocks
- **Gain/Loss Tracking** - Monitor returns at individual and portfolio levels
- **Monte Carlo Simulation** - Simulate portfolio outcomes (GBM) with P10/P50/P90 summaries and drawdown estimates
- **Bridgewater-style Analysis** - Covariance and risk-parity insights used to produce correlated Monte Carlo simulations

---

## 🛠️ Tech Stack

- **Framework**: React Native with Expo
- **Language**: JavaScript (ES6+)
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **UI Library**: React Native Paper
- **Backend**: Firebase (Auth + Firestore)
- **State Management**: React Context API
- **Charts / SVG**: react-native-svg (used for custom Monte Carlo plots)
- **Charts**: React Native Chart Kit
- **API Integration**: Axios + Yahoo Finance API
- **Local Simulation Engine**: Pure-JS Monte Carlo service (services/simulations/monteCarlo.js)

---

## 📁 Project Structure

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

## 🚀 Getting Started

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

## 📖 Developer Notes

- The Monte Carlo engine is implemented as a pure-JS service at `services/simulations/monteCarlo.js`. It supports correlated geometric Brownian motion (GBM) via a Cholesky decomposition of a covariance matrix produced by `shared/bridgewaterAnalysis.js`.
- `src/components/MonteCarlo.js` consumes the service and renders percentile paths (P10/P50/P90), a small sample of ghost paths for visual context, and summary metrics such as probability of loss and average max drawdown. The component includes input sanitization to avoid NaN/invalid SVG coordinates.
- `shared/bridgewaterAnalysis.js` now exposes covariance and returns matrices that can be used to drive correlated simulations and risk-parity weight calculations.
- `src/components/AIInsights.js` includes fixes for the gauge visualization (prevents arc overflow when >50% and improves percent label spacing).
- Rendering many simulated paths can be heavy on the JS/UI thread. The current approach samples a subset of paths for plotting; consider moving compute to a background worker or native module for larger runs.

---

## 🚧 Future Enhancements

- **Offload Simulation Compute** - Move heavy Monte Carlo runs to a background worker or native module to avoid UI blocking
- **Percentile-band Rendering** - Replace full 1,000-path overlays with shaded P10–P90 bands + a small sampled set of paths for performance
- **Unit Tests for Simulation** - Add deterministic, seedable tests for the Monte Carlo engine and compare against analytic expectations for small N
- **UI Controls** - Expose controls for number of paths, horizon, correlated toggle, and weight source (current vs Bridgewater)
- **Historical Backtesting** - Validate simulation parameters and interpretability against historical bootstraps

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. See CONTRIBUTING.md if present.

---

## 📄 License

MIT License - See LICENSE file for details

---

**Happy Investing! 📈**
