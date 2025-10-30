// This file is the central point for Firebase initialization.
// It ensures that Firebase is set up correctly and provides clearer error handling.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// This is the configuration object for your Firebase project.
// It's crucial to use environment variables for these values for security and flexibility.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase App and Firestore
let app: FirebaseApp;
let db: Firestore;

// Check if all environment variables are loaded correctly.
const configValues = Object.entries(firebaseConfig);
const missingVars = configValues.filter(([, value]) => !value);

if (missingVars.length > 0) {
    const missingKeys = missingVars.map(([key]) => {
        // A simple mapping to construct the full environment variable name for the error message.
        const keyMap: { [key: string]: string } = {
            apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
            authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
            projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
            storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
            messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
            appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
        };
        return keyMap[key] || key;
    }).join(', ');

    const errorMessage = `Firebase initialization failed. Missing environment variables: ${missingKeys}. Please check your .env.local file and restart the development server.`;
    // Throw an error to stop the application from starting with a broken configuration.
    throw new Error(errorMessage);
} else {
    // This pattern prevents re-initializing the app on every hot-reload in a Next.js development environment.
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
}

// Export the database instance. If initialization failed, this part of the code will not be reached.
export { db };
