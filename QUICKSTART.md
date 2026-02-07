# PortfolioIQ - Quick Start Guide 🚀

Get your PortfolioIQ app up and running in minutes!

---

## Step 1: Prerequisites ✅

Before you begin, ensure you have:

- [x] **Node.js** (v16+) - [Download here](https://nodejs.org/)
- [x] **npm** (comes with Node.js) or **yarn**
- [x] **Git** (optional) - [Download here](https://git-scm.com/)
- [x] **Code Editor** - VS Code recommended
- [x] **Mobile Device or Emulator**:
  - iOS: Xcode Simulator (Mac only)
  - Android: Android Studio Emulator
  - Or: Physical device with Expo Go app

### Verify Installation

```bash
node --version  # Should show v16 or higher
npm --version   # Should show 8 or higher
```

---

## Step 2: Project Setup 📦

### 2.1 Navigate to Project Directory

```bash
cd /Users/timlaynwoo/PortfolioIQ
```

### 2.2 Install Dependencies

```bash
npm install
```

This will install all required packages:
- React Native and Expo
- React Navigation
- React Native Paper
- Firebase SDK
- Chart libraries
- And more...

**Expected time: 2-5 minutes**

---

## Step 3: Firebase Configuration 🔥

### 3.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `PortfolioIQ` (or your choice)
4. Disable Google Analytics (optional for this project)
5. Click **"Create project"**

### 3.2 Enable Authentication

1. In Firebase Console, click **"Authentication"**
2. Click **"Get started"**
3. Click **"Email/Password"** under Sign-in method
4. Toggle **"Enable"** and click **"Save"**

### 3.3 Create Firestore Database

1. Click **"Firestore Database"** in left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll add rules later)
4. Select a location (closest to you)
5. Click **"Enable"**

### 3.4 Get Firebase Config

1. Click the **gear icon** ⚙️ → **"Project settings"**
2. Scroll down to **"Your apps"**
3. Click the **Web icon** `</>`
4. Register app with nickname: `PortfolioIQ Web`
5. Copy the `firebaseConfig` object

### 3.5 Add Config to Project

1. Open `src/config/firebase-config.template.js`
2. Copy it to create `src/config/firebase-config.js`:

```bash
cd src/config
cp firebase-config.template.js firebase-config.js
```

3. Open `firebase-config.js` and replace with your credentials:

```javascript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**⚠️ Important**: Never commit `firebase-config.js` to git! It's already in `.gitignore`.

---

## Step 4: Start the App 🎬

### 4.1 Start Development Server

```bash
npx expo start
```

You should see:

```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web

› Press r │ reload app
› Press m │ toggle menu
› Press ? │ show all commands
```

### 4.2 Run on Device

**Option A: Physical Device**
1. Install **Expo Go** app:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Scan the QR code with:
   - iOS: Camera app
   - Android: Expo Go app
3. Wait for app to load

**Option B: iOS Simulator (Mac only)**
1. Press `i` in the terminal
2. Wait for simulator to launch
3. App will load automatically

**Option C: Android Emulator**
1. Start Android Studio
2. Open AVD Manager
3. Start an emulator
4. Press `a` in the terminal

---

## Step 5: First Use 🎯

### 5.1 Create Account

1. App opens to **Authentication Screen**
2. Click **"Sign Up"** at the bottom
3. Enter:
   - Full Name
   - Email address
   - Password (min 6 characters)
   - Confirm Password
4. Click **"Sign Up"**

### 5.2 Create First Portfolio

1. Navigate to **Settings** tab (bottom right)
2. Tap **"Create New Portfolio"**
3. Enter:
   - Portfolio Name: "My Stocks"
   - Description: "Long-term investments" (optional)
4. Tap **"Create"**

### 5.3 Add First Holding

1. Navigate to **Dashboard** tab
2. Tap the **"+ Add Holding"** FAB button
3. Search for a stock: e.g., "AAPL"
4. Select from results
5. Enter:
   - Quantity: e.g., "10"
   - Purchase Price: e.g., "150.00"
   - Purchase Date: Select date
6. Tap **"Add Holding"**

### 5.4 Explore Features

- **Dashboard**: View portfolio summary
- **Holdings**: See all your stocks
- **Analytics**: View charts and performance
- **Risk**: Check risk metrics
- **Settings**: Manage account and portfolios

---

## Step 6: Troubleshooting 🔧

### Common Issues

**Issue: "Expo command not found"**
```bash
npm install -g expo-cli
```

**Issue: "Firebase not initialized"**
- Check `firebase-config.js` exists
- Verify all credentials are correct
- Ensure no trailing commas or syntax errors

**Issue: "Network request failed"**
- Check internet connection
- Ensure Firebase project is active
- Verify Firestore and Auth are enabled

**Issue: Metro bundler error**
```bash
npx expo start -c  # Clear cache
```

**Issue: Dependencies error**
```bash
rm -rf node_modules package-lock.json
npm install
```

For more issues, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Step 7: Development Workflow 💻

### Hot Reload
- Save any file to see changes instantly
- Press `r` to manually reload
- Shake device to open developer menu

### Debugging
- Press `m` in terminal to open menu
- Enable Remote JS Debugging
- Open Chrome DevTools

### Testing on Multiple Devices
- All devices on same network can scan QR code
- Test iOS and Android simultaneously

---

## Next Steps 📚

1. **Read Documentation**
   - [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Detailed features
   - [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Advanced Firebase config

2. **Customize**
   - Modify colors in `src/utils/theme.js`
   - Add more asset types in `src/utils/constants.js`
   - Extend calculations in `src/services/calculations.js`

3. **Deploy**
   - Build for production: `npx expo build:android` or `npx expo build:ios`
   - Publish updates: `npx expo publish`

---

## Quick Reference Commands

```bash
# Start development server
npx expo start

# Start with cache clear
npx expo start -c

# Run on iOS (requires Mac)
npx expo start --ios

# Run on Android
npx expo start --android

# Install new package
npm install package-name

# Check for updates
npx expo-cli upgrade
```

---

## Support & Resources

- **Expo Docs**: https://docs.expo.dev/
- **React Native Paper**: https://callstack.github.io/react-native-paper/
- **Firebase Docs**: https://firebase.google.com/docs
- **React Navigation**: https://reactnavigation.org/

---

**🎉 Congratulations! You're all set!**

Start tracking your investments with PortfolioIQ!
