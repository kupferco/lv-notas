import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence, onAuthStateChanged, signOut, Auth, User } from "firebase/auth";

const isDevelopment = window.location.hostname === "localhost";

let auth: Auth | null = null;
let app: FirebaseApp | null = null;

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
};

const initializeFirebase = async (): Promise<Auth> => {
    if (!app) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);

        try {
            await setPersistence(auth, browserLocalPersistence);
            console.log("Authentication persistence set to local");
        } catch (error) {
            console.error("Error setting authentication persistence:", error);
        }
    }
    return auth!;
};

const signInWithGoogle = async (): Promise<User | null> => {
    try {
        const authInstance = await initializeFirebase();
        const provider = new GoogleAuthProvider();
        
        // Add required scopes
        provider.addScope("email");
        provider.addScope("profile");
        
        // Set custom parameters for better UX
        provider.setCustomParameters({
            prompt: "select_account"
        });

        const result = await signInWithPopup(authInstance, provider);
        console.log("Authentication successful:", result.user.email);
        
        // Store email in localStorage for consistency with existing flow
        localStorage.setItem("therapist_email", result.user.email || "");
        
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
};

const signOutUser = async (): Promise<void> => {
    try {
        const authInstance = await initializeFirebase();
        await signOut(authInstance);
        
        // Clear local storage
        localStorage.removeItem("therapist_email");
        
        console.log("User signed out successfully");
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
};

const getCurrentUser = (): User | null => {
    return auth?.currentUser || null;
};

const onAuthStateChange = (callback: (user: User | null) => void) => {
    if (auth) {
        return onAuthStateChanged(auth, callback);
    }
    return () => {};
};

// Check if user is already authenticated
const checkAuthState = async (): Promise<User | null> => {
    const authInstance = await initializeFirebase();
    
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
};

export { 
    app, 
    auth, 
    initializeFirebase, 
    signInWithGoogle, 
    signOutUser, 
    getCurrentUser,
    onAuthStateChange,
    checkAuthState,
    isDevelopment
};
