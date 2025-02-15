import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const isFirebaseHosting = () => {
    return window.location.hostname.includes("web.app") ||
        window.location.hostname.includes("firebaseapp.com");
};

let auth = null;
let app = null;

const initializeFirebase = async () => {
    if (isFirebaseHosting()) {
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
        };

        app = initializeApp(firebaseConfig);
        auth = getAuth(app);

        // Sign in with Google if not already signed in
        if (!auth.currentUser) {
            const provider = new GoogleAuthProvider();

            // Reset scopes to only essential ones
            provider.setCustomParameters({
                'prompt': 'select_account'
            });

            try {
                const result = await signInWithPopup(auth, provider);
                console.log("Authentication successful:", result.user.email);
            } catch (error) {
                console.error("Error signing in with Google:", error);
                throw error;
            }
        }
    }
};

export { app, auth, initializeFirebase };