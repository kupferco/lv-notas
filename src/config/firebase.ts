import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const isFirebaseHosting = () => {
  return window.location.hostname.includes("web.app") || 
         window.location.hostname.includes("firebaseapp.com");
};

let auth = null;
let app = null;

if (isFirebaseHosting()) {
  const firebaseConfig = {
    apiKey: "__FIREBASE_API_KEY__",
    authDomain: "lv-notas.firebaseapp.com",
    projectId: "lv-notas",
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

export { app, auth };
