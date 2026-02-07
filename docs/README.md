# PortfolioIQ 📊

**Investment Portfolio Tracking Application**

A comprehensive React Native mobile application for tracking and analyzing investment portfolios. Built with Expo, Firebase, and modern mobile development best practices.

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

### 📊 Analytics Features
- **Portfolio Growth Charts** - Visualize portfolio performance over time
- **Allocation Analysis** - Pie charts showing holdings and asset type distribution
- **Top/Bottom Performers** - Identify best and worst performing stocks
- **Gain/Loss Tracking** - Monitor returns at individual and portfolio levels

### 🛡️ Risk Management
- **Beta Calculation** - Portfolio volatility vs. market
- **Concentration Risk** - Analyze portfolio diversification
- **Volatility Analysis** - Measure price fluctuation risk
- **Diversification Score** - Overall portfolio health assessment
- **Smart Recommendations** - Actionable insights for portfolio improvement

---

## 🛠️ Tech Stack

- **Framework**: React Native 0.74.5 with Expo SDK 51
- **Language**: JavaScript (ES6+)
- **Navigation**: React Navigation 6 (Stack + Bottom Tabs)
- **UI Library**: React Native Paper 5.12 (Material Design)
- **Backend**: Firebase (Auth + Firestore)
- **State Management**: React Context API
- **Charts**: React Native Chart Kit
- **API Integration**: Axios + Yahoo Finance API
- **Platform**: iOS & Android

---

## 📁 Project Structure

```
PortfolioIQ/
├── src/
│   ├── screens/           # App screens (7 screens)
│   │   ├── AuthScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── HoldingsScreen.js
│   │   ├── AddHoldingScreen.js
│   │   ├── AnalyticsScreen.js
│   │   ├── RiskScreen.js
│   │   └── SettingsScreen.js
│   ├── components/        # Reusable UI components
│   │   ├── PortfolioCard.js
│   │   ├── HoldingCard.js
│   │   └── StockSearchBar.js
│   ├── navigation/        # Navigation configuration
│   │   └── AppNavigator.js
│   ├── context/          # React Context providers
│   │   ├── AuthContext.js
│   │   └── PortfolioContext.js
│   ├── services/         # Business logic & API calls
│   │   ├── firebase.js
│   │   ├── stockAPI.js
│   │   └── calculations.js
│   ├── utils/            # Helper functions & constants
│   │   ├── helpers.js
│   │   ├── constants.js
│   │   └── theme.js
│   └── config/           # Configuration files
│       └── firebase-config.template.js
├── assets/              # Images, fonts, etc.
├── App.js              # Root component
├── app.json            # Expo configuration
├── package.json        # Dependencies
└── babel.config.js     # Babel configuration
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

3. **Set up Firebase** (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))
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

For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md)

---

## 📖 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Complete setup guide with step-by-step instructions
- **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** - Firebase configuration guide
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Detailed project documentation
- **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Complete documentation index

---

## 🎓 Educational Value

This project demonstrates:

### Software Engineering Concepts
- **Clean Architecture** - Separation of concerns (UI, business logic, data)
- **Component-Based Design** - Reusable, modular components
- **State Management** - Context API for global state
- **API Integration** - RESTful API consumption
- **Error Handling** - Comprehensive error management
- **Code Organization** - Scalable folder structure

### Mobile Development
- **Cross-Platform Development** - Single codebase for iOS/Android
- **Responsive Design** - Adapts to different screen sizes
- **Navigation Patterns** - Stack and tab navigation
- **Touch Interactions** - Gestures, long press, pull-to-refresh
- **Data Persistence** - Cloud storage with offline capabilities

### Financial Technology
- **Portfolio Mathematics** - Gains, losses, returns calculations
- **Risk Metrics** - Beta, volatility, concentration analysis
- **Data Visualization** - Charts and graphs for financial data
- **Real-Time Data** - Live stock price integration

---

## 🧮 Key Calculations

The app implements various financial calculations:

- **Portfolio Value** - Sum of all holding values
- **Cost Basis** - Total purchase cost
- **Gain/Loss** - Current value - Cost basis
- **Return Percentage** - (Gain/Loss / Cost Basis) × 100
- **Beta** - Portfolio volatility relative to market
- **Volatility** - Standard deviation of returns
- **Allocation %** - Each holding's % of total portfolio
- **Diversification Score** - 0-100 scale based on distribution

---

## 🔐 Security

- **Firebase Authentication** - Secure user authentication
- **Data Isolation** - Users can only access their own data
- **Firestore Rules** - Server-side security rules (to be configured)
- **API Key Protection** - Firebase keys configured securely
- **Input Validation** - Client-side form validation

---

## 🎨 Design Highlights

- **Material Design 3** - Modern, accessible UI components
- **Consistent Color Scheme** - Purple primary, teal accent
- **Intuitive Icons** - Material Community Icons throughout
- **Visual Feedback** - Loading states, animations, color-coded gains/losses
- **Responsive Layout** - Works on phones and tablets

---

## 📊 Data Models

### User
- uid, email, displayName, createdAt

### Portfolio
- id, userId, name, description, currency, type, createdAt, updatedAt

### Holding
- id, portfolioId, symbol, name, quantity, purchasePrice, currentPrice, purchaseDate, assetType, notes, lastUpdated

---

## 🚧 Future Enhancements

Potential features for expansion:

- **Historical Data Charts** - Show actual price history from Yahoo Finance
- **Watchlists** - Track stocks without purchasing
- **News Integration** - Stock-specific news feeds
- **Alerts** - Price alerts and notifications
- **Export/Import** - CSV export of portfolio data
- **Dark Mode** - Theme switching
- **Biometric Auth** - Face ID / Touch ID
- **Dividend Tracking** - Track dividend income
- **Tax Reports** - Capital gains calculations

---

## 🤝 Contributing

This is an educational project. Contributions, issues, and feature requests are welcome!

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file for details

---

## 👨‍💻 Author

Created as a Computer Science Capstone Project

---

## 🙏 Acknowledgments

- **Expo Team** - For the excellent React Native framework
- **Firebase** - For backend infrastructure
- **Yahoo Finance** - For stock market data
- **React Native Community** - For amazing libraries and support

---

## 📞 Support

For issues or questions:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
3. Check Firebase console for backend issues

---

## ⚡ Quick Commands

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android

# Run tests (if configured)
npm test

# Clear cache
npx expo start -c
```

---

**Happy Investing! 📈**
