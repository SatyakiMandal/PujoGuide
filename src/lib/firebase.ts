import { initializeApp, getApps, getApp } from "firebase/app";

/** Public web config — not a secret; access is scoped by the database's security rules. */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True once every required env var is set. The live counter stays off (no Firebase calls) until then. */
export const firebaseConfigured = Boolean(config.apiKey && config.databaseURL && config.projectId && config.appId);

export function firebaseApp() {
  return getApps().length ? getApp() : initializeApp(config);
}
