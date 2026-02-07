# Troubleshooting Guide 🔧

Solutions to common issues in PortfolioIQ

---

## 📋 Quick Diagnosis

### App won't start?
→ See [Installation Issues](#installation-issues)

### Firebase errors?
→ See [Firebase Issues](#firebase-issues)

### API not working?
→ See [API & Network Issues](#api--network-issues)

### UI problems?
→ See [UI & Display Issues](#ui--display-issues)

### Can't find project?
→ Project is at `/Users/timlaynwoo/PortfolioIQ`

---

## Installation Issues

### Issue: "Expo command not found"

**Error Message**:
```
expo: command not found
```

**Solution**:
```bash
# Option 1: Use npx (recommended)
npx expo start

# Option 2: Install globally
npm install -g expo-cli
expo start
```

**Why**: Expo CLI might not be installed globally.

---

### Issue: "Cannot find module 'expo'"

**Error Message**:
```
Error: Cannot find module 'expo'
Cannot determine the project's Expo SDK version
```

**Solution**:
```bash
# Install all dependencies
cd /Users/timlaynwoo/PortfolioIQ
npm install

# If that fails, clean install
rm -rf node_modules package-lock.json
npm install
```

**Why**: Dependencies not installed or corrupted.

---

### Issue: "Metro bundler stuck"

**Symptoms**:
- Loading screen hangs
- "Building JavaScript bundle..." never completes
- Terminal shows no progress

**Solution**:
```bash
# Clear Metro cache
npx expo start -c

# Or restart with full clear
rm -rf node_modules
npm install
npx expo start -c
```

---

### Issue: "Port 8081 already in use"

**Error Message**:
```
Error: Port 8081 is already in use
```

**Solution**:
```bash
# Option 1: Kill the process
lsof -ti:8081 | xargs kill -9

# Option 2: Use different port
npx expo start --port 8082
```

---

## Firebase Issues

### Issue: "Firebase app not initialized"

**Error Message**:
```
Firebase: No Firebase App '[DEFAULT]' has been created
```

**Solution**:
1. Check `src/config/firebase-config.js` exists
2. Verify it's not the template file
3. Ensure all fields are filled:

```javascript
export const firebaseConfig = {
  apiKey: "AIzaSy...",  // Should start with AIzaSy
  authDomain: "your-project.firebaseapp.com",  // Should end with .firebaseapp.com
  projectId: "your-project-id",  // No brackets
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",  // Numbers only
  appId: "1:123456789:web:xxxxx"  // Starts with 1:
};
```

4. Restart app: `npx expo start -c`

---

### Issue: "Permission denied" in Firestore

**Error Message**:
```
FirebaseError: Missing or insufficient permissions
```

**Possible Causes**:
1. Firestore rules too restrictive
2. User not authenticated
3. Trying to access another user's data

**Solutions**:

**Solution 1: Check Authentication**
```javascript
// In your code, verify user is logged in
const { user } = useContext(AuthContext);
console.log('Current user:', user);  // Should not be null
```

**Solution 2: Update Firestore Rules**
Go to Firebase Console → Firestore → Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
⚠️ This is permissive - use only for development!

**Solution 3: Check Document Ownership**
```javascript
// Ensure userId matches
console.log('User ID:', user.uid);
console.log('Portfolio userId:', portfolio.userId);
// These should match
```

---

### Issue: "Auth/email-already-in-use"

**Error Message**:
```
Firebase: Error (auth/email-already-in-use)
```

**Solution**:
- Use a different email
- Or click "Login" instead of "Sign Up"
- Or reset password if you forgot it

---

### Issue: "Network request failed" with Firebase

**Error Message**:
```
Firebase: Error (auth/network-request-failed)
```

**Solutions**:
1. Check internet connection
2. Verify Firebase project is active (not deleted)
3. Check Firebase status: https://status.firebase.google.com/
4. Try turning WiFi off and on
5. Restart app

---

## API & Network Issues

### Issue: Stock search returns no results

**Symptoms**:
- Search bar shows "No stocks found"
- Search works for some symbols but not others

**Solutions**:

**Solution 1: Check Symbol Format**
- Use ticker symbols: "AAPL" not "Apple"
- Try different variations: "TSLA", "MSFT"
- Some stocks might not be in Yahoo Finance

**Solution 2: Check Network**
```bash
# Test API manually
curl "https://query1.finance.yahoo.com/v1/finance/search?q=AAPL"
```

**Solution 3: API Rate Limiting**
- Yahoo Finance might rate-limit requests
- Wait a few minutes and try again
- Consider caching results

---

### Issue: Stock prices not updating

**Symptoms**:
- Prices stay the same after refresh
- "Last updated" doesn't change

**Solutions**:

**Solution 1: Manual Refresh**
- Pull down on Holdings screen to refresh
- Or use "Refresh Prices" button

**Solution 2: Check API Connectivity**
```javascript
// Test in src/services/stockAPI.js
console.log('Fetching price for AAPL...');
const result = await getStockPrice('AAPL');
console.log('Result:', result);
```

**Solution 3: API Issues**
- Yahoo Finance API might be down
- Check https://downdetector.com/
- Try again later

---

### Issue: "Failed to fetch" errors

**Error Message**:
```
TypeError: Network request failed
Failed to fetch
```

**Solutions**:
1. **Check Internet**: Verify device is online
2. **Check Firewall**: Ensure app can access internet
3. **Check CORS**: Web only - might need proxy
4. **Check API Status**: Yahoo Finance operational?

---

## Build & Runtime Errors

### Issue: "Element type is invalid"

**Error Message**:
```
Error: Element type is invalid: expected a string (for built-in components)
or a class/function (for composite components) but got: undefined
```

**Cause**: Import statement error

**Solutions**:
1. Check import statements in error file
2. Verify component exports:

```javascript
// Wrong
import { MyComponent } from './MyComponent';  // If it's default export

// Correct
import MyComponent from './MyComponent';  // For default exports
import { MyComponent } from './MyComponent';  // For named exports
```

---

### Issue: "Cannot read property 'X' of undefined"

**Common Errors**:
```
Cannot read property 'map' of undefined
Cannot read property 'length' of undefined
```

**Cause**: Data not loaded yet or null

**Solutions**:

**Solution 1: Add Null Checks**
```javascript
// Before
{holdings.map(holding => ...)}

// After
{holdings && holdings.map(holding => ...)}
// Or
{holdings?.map(holding => ...)}
```

**Solution 2: Add Loading State**
```javascript
if (loading) {
  return <ActivityIndicator />;
}

if (!holdings || holdings.length === 0) {
  return <Text>No holdings</Text>;
}

return <FlatList data={holdings} .../>;
```

---

### Issue: "Invariant Violation" errors

**Error Message**:
```
Invariant Violation: "App" has not been registered
```

**Solutions**:
1. Clear cache: `npx expo start -c`
2. Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```
3. Check App.js exports properly

---

## iOS Specific Issues

### Issue: iOS Simulator won't open

**Solutions**:
1. **Check Xcode**: Ensure Xcode is installed
2. **Open Xcode once**: Accepts license agreement
3. **Manual Launch**:
   ```bash
   open -a Simulator
   ```
4. **Restart Xcode**: Close and reopen

---

### Issue: "No devices found" on iOS

**Solutions**:
1. Open Xcode → Window → Devices and Simulators
2. Add a simulator (iPhone 14/15 recommended)
3. Restart Expo: `npx expo start`
4. Press `i` again

---

## Android Specific Issues

### Issue: Android Emulator won't connect

**Solutions**:
1. **Check Emulator Running**:
   - Open Android Studio
   - AVD Manager → Start emulator
2. **Check ADB**:
   ```bash
   adb devices  # Should show emulator
   ```
3. **Restart ADB**:
   ```bash
   adb kill-server
   adb start-server
   ```

---

### Issue: "Could not connect to development server"

**Solutions**:
1. **Check Same Network**: Computer and device on same WiFi
2. **Check Firewall**: Allow Metro bundler through firewall
3. **Use Tunnel**: `npx expo start --tunnel`
4. **Check Port**: Port 8081 accessible

---

## UI & Display Issues

### Issue: Styles not applying

**Symptoms**:
- Components look unstyled
- Colors wrong
- Layout broken

**Solutions**:
1. **Check StyleSheet Import**:
   ```javascript
   import { StyleSheet } from 'react-native';
   ```
2. **Verify Style Object**:
   ```javascript
   const styles = StyleSheet.create({
     container: {
       flex: 1,
       // not "flex: 1px" (no units in React Native)
     }
   });
   ```
3. **Clear Cache**: `npx expo start -c`

---

### Issue: Charts not displaying

**Symptoms**:
- Blank space where charts should be
- "Cannot render chart" error

**Solutions**:
1. **Check Data Format**:
   ```javascript
   // Ensure data is array with correct shape
   console.log('Chart data:', chartData);
   ```
2. **Check Dimensions**:
   ```javascript
   width={Dimensions.get('window').width - 32}
   height={220}
   ```
3. **Check react-native-chart-kit Installed**:
   ```bash
   npm list react-native-chart-kit
   ```

---

## Performance Issues

### Issue: App is slow/laggy

**Solutions**:

**Solution 1: Enable Production Mode**
```javascript
// In App.js
if (!__DEV__) {
  console.log = () => {};  // Disable console logs
}
```

**Solution 2: Optimize FlatList**
```javascript
<FlatList
  data={holdings}
  renderItem={renderItem}
  keyExtractor={item => item.id}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

**Solution 3: Reduce Re-renders**
```javascript
// Use React.memo for components
export default React.memo(HoldingCard);

// Use useCallback for functions
const handlePress = useCallback(() => {
  // ...
}, [dependencies]);
```

---

### Issue: Large bundle size

**Solutions**:
1. **Check Bundle**: `npx expo export`
2. **Remove Unused Imports**: Review and remove
3. **Optimize Images**: Use WebP, compress
4. **Code Splitting**: Lazy load screens

---

## Data Issues

### Issue: Data not persisting

**Symptoms**:
- Data disappears after app restart
- Portfolios/holdings lost

**Solutions**:
1. **Check Firebase**: Verify data in Firebase Console
2. **Check Authentication**: User stays logged in?
3. **Check Firestore Rules**: Data accessible?
4. **Check Network**: Data saving to cloud?

---

### Issue: Duplicate holdings appearing

**Cause**: Multiple calls to add holding

**Solution**:
```javascript
// Add loading state to prevent double-tap
const [adding, setAdding] = useState(false);

const handleAddHolding = async () => {
  if (adding) return;  // Prevent duplicate
  setAdding(true);
  try {
    await addNewHolding(data);
  } finally {
    setAdding(false);
  }
};
```

---

## Development Workflow Issues

### Issue: Hot reload not working

**Solutions**:
1. **Save File**: Ensure file is saved (Cmd/Ctrl+S)
2. **Check Fast Refresh**: Shake device → Enable Fast Refresh
3. **Manual Reload**: Press `r` in terminal
4. **Restart**: `npx expo start -c`

---

### Issue: Changes not appearing

**Solutions**:
1. **Clear Cache**: `npx expo start -c`
2. **Restart Metro**: Kill terminal, restart
3. **Check File Path**: Correct import path?
4. **Check Syntax**: No JavaScript errors?

---

## Getting More Help

### Debug Mode

Enable helpful debugging:

```javascript
// In App.js, add at top
console.log('=== APP STARTING ===');
console.log('User:', user);
console.log('Portfolios:', portfolios);
```

### Useful Commands

```bash
# Check Expo doctor
npx expo-doctor

# Check environment
npx expo-env-info

# Validate package.json
npm ls

# Check for updates
npm outdated
```

### Log Files

Check logs:
- **Metro**: Terminal where `npx expo start` runs
- **Device**: Shake device → Show Performance Monitor
- **Firestore**: Firebase Console → Firestore → Usage tab
- **Network**: Chrome DevTools → Network tab

---

## Common Error Messages Explained

| Error | Meaning | Solution |
|-------|---------|----------|
| `EADDRINUSE` | Port in use | Kill process on port |
| `ENOENT` | File not found | Check file path |
| `ECONNREFUSED` | Connection refused | Check server running |
| `MODULE_NOT_FOUND` | Missing package | Run `npm install` |
| `auth/invalid-email` | Bad email format | Check email format |
| `permission-denied` | Firestore access denied | Check rules/auth |

---

## Still Stuck?

1. **Check Firebase Console**: Look for errors
2. **Check Console Logs**: Look for error messages
3. **Search Error**: Google the exact error message
4. **Check GitHub Issues**: Similar problems?
5. **Stack Overflow**: Ask with [expo], [react-native], [firebase] tags

---

## Prevention Tips

- ✅ Always run `npm install` after pulling updates
- ✅ Clear cache when strange errors occur
- ✅ Check Firebase Console regularly
- ✅ Test on both iOS and Android
- ✅ Keep dependencies updated
- ✅ Commit working code frequently
- ✅ Use version control (Git)

---

**💪 Most issues can be fixed by clearing cache and reinstalling!**

```bash
rm -rf node_modules package-lock.json
npm install
npx expo start -c
```
