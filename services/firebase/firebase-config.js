// Firebase Configuration using environment variables
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
} from '@env';

export const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// react-native-dotenv inlines these at build time from the local .env, which is
// gitignored and therefore absent from EAS cloud builds unless the same values
// are set as EAS environment variables. Without this check the app builds fine
// and then fails at runtime with opaque Firebase errors, so fail loudly instead.
const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  const message =
    `Firebase config is incomplete — missing: ${missing.join(', ')}.\n` +
    'Local builds read these from .env (see .env.example). ' +
    'EAS builds need them set as EAS environment variables: ' +
    'https://docs.expo.dev/eas/environment-variables/';

  if (__DEV__) {
    throw new Error(message);
  } else {
    console.error(message);
  }
}
