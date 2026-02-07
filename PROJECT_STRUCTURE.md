# PortfolioIQ - Project Structure

## Overview
This project follows a monorepo structure with clear separation of concerns, making it easier to maintain and scale.

## Directory Structure

```
PortfolioIQ/
├── src/                          # Frontend source code
│   ├── components/              # Reusable UI components
│   │   ├── AIInsights.js
│   │   ├── HoldingCard.js
│   │   ├── PortfolioCard.js
│   │   └── StockSearchBar.js
│   ├── screens/                 # Screen components
│   │   ├── AddHoldingScreen.js
│   │   ├── AnalyticsScreen.js
│   │   ├── AuthScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── HoldingsScreen.js
│   │   ├── RiskScreen.js
│   │   └── SettingsScreen.js
│   ├── context/                 # React Context providers
│   │   ├── AuthContext.js
│   │   └── PortfolioContext.js
│   └── navigation/              # Navigation configuration
│       └── AppNavigator.js
│
├── shared/                       # Shared utilities and business logic
│   ├── calculations.js          # Portfolio calculation functions
│   ├── colors.js                # Color constants and utilities
│   ├── constants.js             # Application constants
│   ├── helpers.js               # Helper/utility functions
│   └── theme.js                 # Theme configuration
│
├── services/                     # External services and APIs
│   ├── api/                     # API clients
│   │   └── stockAPI.js         # Stock market data API
│   ├── firebase/                # Firebase services
│   │   ├── firebase.js         # Firebase SDK wrapper
│   │   ├── firebase-config.js  # Firebase configuration
│   │   └── firebase-config.template.js
│   ├── ai/                      # AI services
│   │   └── aiService.js        # AI insights service (Groq)
│   └── history/                 # Historical data services
│       └── historyService.js   # Portfolio history tracking
│
├── assets/                       # Static assets
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
│
├── docs/                        # Documentation
│   ├── README.md
│   ├── QUICKSTART.md
│   ├── FIREBASE_SETUP.md
│   ├── BACKEND_SETUP.md
│   ├── PROJECT_SUMMARY.md
│   ├── DOCUMENTATION_INDEX.md
│   ├── TROUBLESHOOTING.md
│   └── setup.sh
│
├── App.js                       # Application entry point
├── app.json                     # Expo configuration
├── package.json                 # Dependencies
├── babel.config.js              # Babel configuration
├── .env                         # Environment variables (git-ignored)
└── .env.example                 # Environment variables template
```

## Import Path Conventions

### From Components/Screens
```javascript
// Shared utilities
import { COLORS } from '../../shared/colors';
import { helpers } from '../../shared/helpers';

// Services
import { stockAPI } from '../../services/api/stockAPI';
import { firebase } from '../../services/firebase/firebase';
import { aiService } from '../../services/ai/aiService';

// Context (from screens)
import { AuthContext } from '../context/AuthContext';
```

### From Context
```javascript
// Services
import { firebase } from '../../services/firebase/firebase';
import { stockAPI } from '../../services/api/stockAPI';
```

### Within Services
```javascript
// Firebase config
import { firebaseConfig } from './firebase-config';
```

## Folder Responsibilities

### `/src`
Contains all React Native UI code including components, screens, navigation, and context providers.

### `/shared`
Business logic, calculations, and utilities that could potentially be shared across frontend and backend (if backend is added).

### `/services`
External service integrations organized by service type:
- **api/**: Third-party API clients (stock data, etc.)
- **firebase/**: Firebase authentication and Firestore operations
- **ai/**: AI service integrations (Groq for insights)
- **history/**: Portfolio history and analytics services

### `/assets`
Static files like images, fonts, icons used in the app.

### `/docs`
All documentation including setup guides, API documentation, and troubleshooting guides.

## Benefits of This Structure

1. **Clear Separation**: Business logic (shared) is separate from UI (src) and external services (services)
2. **Scalability**: Easy to add backend server or additional services
3. **Maintainability**: Easy to locate files based on their purpose
4. **Testability**: Isolated modules are easier to test
5. **Team Collaboration**: Clear ownership of different parts of the codebase

## Migration Notes

This structure was reorganized on February 8, 2026:
- `src/utils/` → `shared/`
- `src/services/` → `services/` (organized by service type)
- `src/config/` → `services/firebase/`
- `*.md` files → `docs/`

All import paths have been updated accordingly.
