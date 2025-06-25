// src/config/firebase.ts
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence, 
  onAuthStateChanged,
  signOut,
  User
} from "firebase/auth";
import { config } from "./config";

let auth: any = null;
let app: any = null;

const isFirebaseHosting = () => {
    return window.location.hostname.includes("web.app") ||
        window.location.hostname.includes("firebaseapp.com");
};

const isDevelopment = window.location.hostname === 'localhost';

const initializeFirebase = async () => {
    // Always initialize Firebase for real authentication
    if (config.firebaseConfig.apiKey && config.firebaseConfig.authDomain && config.firebaseConfig.projectId) {
        app = initializeApp(config.firebaseConfig);
        auth = getAuth(app);

        // Set persistence to local
        try {
            await setPersistence(auth, browserLocalPersistence);
            console.log("Authentication persistence set to local");
        } catch (error) {
            console.error("Error setting authentication persistence:", error);
        }

        // Check if user is already signed in
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    console.log("User is already signed in:", user.email);
                    resolve(user);
                } else {
                    resolve(null);
                }
            });
        });
    } else {
        console.error("Firebase configuration is incomplete");
        return null;
    }
};

const signInWithGoogle = async (): Promise<User | null> => {
    if (!auth) {
        await initializeFirebase();
    }

    const provider = new GoogleAuthProvider();
    
    // Add Google Calendar scopes to request calendar access
    provider.addScope('https://www.googleapis.com/auth/calendar');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    
    // Set custom parameters
    provider.setCustomParameters({
        'prompt': 'select_account'
    });

    try {
        const result = await signInWithPopup(auth, provider);
        console.log("Authentication successful:", result.user.email);
        
        // Get the Google access token from the credential
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential) {
            const accessToken = credential.accessToken;
            console.log("Google access token obtained:", accessToken ? "✅" : "❌");
            
            // Store the access token for API calls
            if (accessToken) {
                localStorage.setItem('google_access_token', accessToken);
                console.log("Stored Google access token");
            }
        }
        
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
};

const checkAuthState = (): Promise<User | null> => {
    if (!auth) {
        return Promise.resolve(null);
    }
    
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            resolve(user);
        });
    });
};

const signOutUser = async (): Promise<void> => {
    if (auth) {
        try {
            await signOut(auth);
            // Clear the stored access token
            localStorage.removeItem('google_access_token');
            console.log("User signed out successfully");
        } catch (error) {
            console.error("Error signing out:", error);
            throw error;
        }
    }
};

const getCurrentUser = (): User | null => {
    return auth?.currentUser || null;
};

const getGoogleAccessToken = (): string | null => {
    return localStorage.getItem('google_access_token');
};

const onAuthStateChange = (callback: (user: User | null) => void) => {
    if (auth) {
        return onAuthStateChanged(auth, callback);
    }
    return () => {};
};

export { 
    app, 
    auth, 
    initializeFirebase, 
    signInWithGoogle, 
    signOutUser, 
    getCurrentUser,
    getGoogleAccessToken,
    onAuthStateChange,
    checkAuthState,
    isDevelopment
};