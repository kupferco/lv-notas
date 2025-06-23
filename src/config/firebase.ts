import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence, onAuthStateChanged, Auth } from "firebase/auth";

const isFirebaseHosting = () => {
    return window.location.hostname.includes("web.app") ||
        window.location.hostname.includes("firebaseapp.com");
};

let auth: Auth | null = null;
let app: FirebaseApp | null = null;

const initializeFirebase = async () => {
    if (isFirebaseHosting()) {
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
        };

        app = initializeApp(firebaseConfig);
        auth = getAuth(app);

        try {
            await setPersistence(auth, browserLocalPersistence);
            console.log("Authentication persistence set to local");
        } catch (error) {
            console.error("Error setting authentication persistence:", error);
        }

        return new Promise((resolve) => {
            if (auth) {
                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        console.log("User is already signed in:", user.email);
                        resolve(user);
                    } else {
                        const provider = new GoogleAuthProvider();
                        provider.setCustomParameters({
                            "prompt": "select_account"
                        });

                        try {
                            if (auth) {
                                const result = await signInWithPopup(auth, provider);
                                console.log("Authentication successful:", result.user.email);
                                resolve(result.user);
                            }
                        } catch (error) {
                            console.error("Error signing in with Google:", error);
                            resolve(null);
                        }
                    }
                });
            }
        });
    }
};

const signOut = async () => {
    if (auth) {
        try {
            await auth.signOut();
            console.log("User signed out successfully");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }
};

export { app, auth, initializeFirebase, signOut };
