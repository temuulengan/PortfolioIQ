# Firebase Setup Guide 🔥

Complete guide for configuring Firebase for PortfolioIQ

---

## Overview

PortfolioIQ uses Firebase for:
- **Authentication** - User login/registration
- **Firestore** - Cloud database for portfolios and holdings
- **Security** - Server-side data protection

---

## Step-by-Step Setup

### 1. Create Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Sign in with your Google account
3. Click **"Add project"**
4. Enter project name: `PortfolioIQ` or any name you prefer
5. **Google Analytics**: 
   - Toggle OFF (not needed for this project)
   - Or keep ON for analytics tracking
6. Click **"Create project"**
7. Wait for project creation (30-60 seconds)
8. Click **"Continue"**

---

### 2. Enable Authentication

1. In Firebase Console, click **"Authentication"** from left menu
2. Click **"Get started"** button
3. Under **"Sign-in method"** tab:
   - Click **"Email/Password"**
   - Toggle **"Enable"** switch to ON
   - Leave "Email link" disabled
   - Click **"Save"**

**Why Email/Password?**
- Simple to implement
- No OAuth configuration needed
- Good for educational projects
- Can add more providers later (Google, Facebook, etc.)

---

### 3. Create Firestore Database

1. Click **"Firestore Database"** from left menu
2. Click **"Create database"**
3. **Security rules**: Choose **"Start in production mode"**
   - We'll add custom rules in Step 5
4. **Location**: Select closest region (e.g., `us-central1`)
   - This affects latency
   - Cannot be changed later
5. Click **"Enable"**
6. Wait for database provisioning

---

### 4. Get Firebase Configuration

1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>` to add a web app
5. **Register app**:
   - App nickname: `PortfolioIQ Web`
   - Firebase Hosting: Leave unchecked
   - Click **"Register app"**
6. **Copy the config object** that looks like:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "portfolioiq-xxxxx.firebaseapp.com",
  projectId: "portfolioiq-xxxxx",
  storageBucket: "portfolioiq-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxxx"
};
```

7. Click **"Continue to console"**

---

### 5. Add Config to Project

#### Option A: Manual Configuration (Recommended)

1. In your project, navigate to `src/config/`
2. Copy the template file:

```bash
cd src/config
cp firebase-config.template.js firebase-config.js
```

3. Open `firebase-config.js` in your editor
4. Replace the placeholder values with your actual Firebase config:

```javascript
// src/config/firebase-config.js
export const firebaseConfig = {
  apiKey: "AIzaSyXXX...",              // From Firebase Console
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxx"
};
```

5. Save the file

#### Option B: Environment Variables (Advanced)

For production apps, use environment variables:

1. Create `.env` file in project root:

```env
FIREBASE_API_KEY=AIzaSyXXX...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:xxxxx
```

2. Install dotenv: `npm install react-native-dotenv`
3. Configure Babel to load env variables
4. Use in config file:

```javascript
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  // ... other imports
} from '@env';

export const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  // ... rest of config
};
```

---

### 6. Configure Firestore Security Rules

Protect your data with security rules:

1. In Firebase Console, go to **"Firestore Database"**
2. Click **"Rules"** tab
3. Replace default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can only read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Portfolios collection - users can only access their own portfolios
    match /portfolios/{portfolioId} {
      allow read, write: if request.auth != null && 
                            resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
    }
    
    // Holdings collection - users can only access holdings in their portfolios
    match /holdings/{holdingId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      // Note: In production, add validation to check portfolio ownership
    }
  }
}
```

4. Click **"Publish"**

**Security Rules Explained:**
- `request.auth != null` - User must be authenticated
- `request.auth.uid == userId` - User can only access their own data
- `resource.data.userId` - Check existing document ownership
- `request.resource.data.userId` - Check new document ownership

---

### 7. Test Configuration

#### Test 1: Check Firebase Initialization

1. Start your app: `npx expo start`
2. Check terminal for errors
3. Should see no Firebase-related errors

#### Test 2: Test Authentication

1. Open app on device/simulator
2. Try to register a new account
3. Enter email and password
4. Click "Sign Up"
5. **Success**: You're logged in automatically
6. **Check Firebase Console** → Authentication → Users
   - Your user should appear in the list

#### Test 3: Test Firestore

1. Create a portfolio in the app
2. Add a holding
3. **Check Firebase Console** → Firestore Database
   - Should see collections: `users`, `portfolios`, `holdings`
   - Your data should be visible

---

## Data Structure

### Users Collection

```
users/{userId}
  - email: string
  - displayName: string
  - createdAt: timestamp
```

### Portfolios Collection

```
portfolios/{portfolioId}
  - userId: string (reference to user)
  - name: string
  - description: string
  - currency: string (default: 'USD')
  - type: string (e.g., 'stocks', 'retirement')
  - createdAt: timestamp
  - updatedAt: timestamp
```

### Holdings Collection

```
holdings/{holdingId}
  - portfolioId: string (reference to portfolio)
  - symbol: string (stock ticker)
  - name: string (company name)
  - quantity: number
  - purchasePrice: number
  - currentPrice: number
  - purchaseDate: string (ISO format)
  - assetType: string (e.g., 'stock', 'etf')
  - notes: string
  - lastUpdated: timestamp
  - createdAt: timestamp
```

---

## Firestore Indexes

For better query performance, create indexes:

1. Go to **Firestore Database** → **Indexes** tab
2. Create composite indexes:

**Portfolios by User + Created Date:**
```
Collection: portfolios
Fields: userId (Ascending), createdAt (Descending)
```

**Holdings by Portfolio + Created Date:**
```
Collection: holdings
Fields: portfolioId (Ascending), createdAt (Descending)
```

---

## Firebase Pricing

### Free Tier (Spark Plan)

- **Authentication**: 50,000 verifications/month
- **Firestore**:
  - 50,000 reads/day
  - 20,000 writes/day
  - 20,000 deletes/day
  - 1 GB storage
- **Bandwidth**: 10 GB/month

### For PortfolioIQ

With typical usage:
- ~100 users
- ~10 portfolios per user
- ~50 holdings per portfolio
- Daily price updates

**You'll stay within free tier** for development and small-scale use.

---

## Common Issues & Solutions

### Issue: "Firebase App not initialized"

**Cause**: Config file missing or incorrect
**Solution**:
1. Verify `firebase-config.js` exists in `src/config/`
2. Check all values are correct (no placeholders)
3. Restart Metro bundler: `npx expo start -c`

### Issue: "Permission denied" errors

**Cause**: Firestore rules too restrictive
**Solution**:
1. Check security rules in Firebase Console
2. Verify user is authenticated
3. Check `userId` field in documents

### Issue: "Network request failed"

**Cause**: Internet connectivity or Firebase project inactive
**Solution**:
1. Check internet connection
2. Verify Firebase project is active (not deleted)
3. Check Firebase Status page

### Issue: "Email already in use"

**Cause**: User already registered
**Solution**:
- Use "Login" instead of "Sign Up"
- Or use "Forgot Password" to reset

---

## Best Practices

### Security

1. **Never commit** `firebase-config.js` to public repositories
2. **Use environment variables** for production
3. **Enable email verification** (optional but recommended)
4. **Set up security rules** before going live
5. **Monitor Firebase Console** for suspicious activity

### Performance

1. **Limit query results** with `.limit()` in code
2. **Create indexes** for frequently queried fields
3. **Batch operations** when possible
4. **Cache frequently accessed data** locally
5. **Use offline persistence** for better UX

### Cost Optimization

1. **Minimize reads** - Cache data locally
2. **Batch writes** - Update multiple docs at once
3. **Delete unused data** - Clean up old holdings
4. **Monitor usage** - Check Firebase Console regularly

---

## Upgrading Firebase

If you need more features or capacity:

1. Go to Firebase Console → **Usage and billing**
2. Click **"Modify plan"**
3. Choose **Blaze Plan** (pay-as-you-go)
4. Set up billing account
5. Configure **budget alerts** to avoid surprises

---

## Additional Features (Optional)

### Email Verification

Add to `src/services/firebase.js`:

```javascript
import { sendEmailVerification } from 'firebase/auth';

export const sendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
};
```

### Password Reset

Already implemented in AuthScreen:
- Enter email
- Click "Forgot Password"
- Check email for reset link

### Profile Updates

Add to `src/services/firebase.js`:

```javascript
export const updateUserProfile = async (updates) => {
  const user = auth.currentUser;
  if (user) {
    await updateProfile(user, updates);
    await updateDoc(doc(db, 'users', user.uid), updates);
  }
};
```

---

## Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firestore Guides**: https://firebase.google.com/docs/firestore
- **Security Rules**: https://firebase.google.com/docs/rules
- **Firebase Pricing**: https://firebase.google.com/pricing

---

## Support

For Firebase-specific issues:
- **Firebase Support**: https://firebase.google.com/support
- **Stack Overflow**: Tag questions with `firebase` and `firestore`
- **Firebase Community**: https://firebase.google.com/community

---

**🔥 Firebase is now configured and ready to use!**
