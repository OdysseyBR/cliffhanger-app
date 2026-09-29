/**
 * Auth — variante WEB (react-native-web/Metro resolve este arquivo por padrão).
 * Browser persistence é o padrão do getAuth() no build browser do firebase.
 */
import { getAuth, type Auth } from "firebase/auth";
import { getFirebaseApp } from "./firebase";

const app = getFirebaseApp();

export const auth: Auth | null = app ? getAuth(app) : null;
