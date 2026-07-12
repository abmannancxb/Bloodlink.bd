import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import firebaseConfig from '../firebase-applet-config.json';

const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname.includes('localhost') || 
   window.location.hostname.includes('run.app') ||
   window.location.hostname.includes('gitpod.io') ||
   window.location.hostname.includes('webcontainer') ||
   window.location.hostname.includes('stackblitz') ||
   window.location.hostname.includes('repl.co'));

const appConfig = {
  ...firebaseConfig
};

const app = initializeApp(appConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Guard messaging setup against unsupported browser/iframe sandbox contexts
export const messaging = (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) ? (() => {
  try {
    return getMessaging(app);
  } catch (err) {
    console.warn('FCM is not supported in this environment/browser.', err);
    return null;
  }
})() : null;

// Enable offline persistence for Firestore
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence failed: Browser not supported');
    }
  });

  // Ensure Auth persistence is explicitly set to local
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Auth persistence error:", error);
  });

  // Test Connection
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, '_connection_test', 'status'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('offline')) {
        console.warn("Firestore client is running in offline mode.");
      }
    }
  };
  testConnection();
}
