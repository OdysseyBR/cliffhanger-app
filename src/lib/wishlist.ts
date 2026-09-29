/**
 * Wishlist na conta (Firestore users/{uid}.wishlist) — mesmo contrato do site
 * (Providers.tsx da loja): leitura + gravação em merge, melhor esforço.
 */
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import { getFirebaseApp } from "./firebase";

function db() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

/** Lê a wishlist remota; retorna [] quando ausente/indisponível. */
export async function readWishlist(uid: string): Promise<string[]> {
  const firestore = db();
  if (!firestore) return [];
  try {
    const snap = await getDoc(doc(firestore, "users", uid));
    const data = snap.exists() ? (snap.data() as { wishlist?: unknown }) : {};
    return Array.isArray(data.wishlist)
      ? data.wishlist.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

/** Grava a wishlist (merge) junto do perfil — falha em silêncio (melhor esforço). */
export async function writeWishlist(
  uid: string,
  wishlist: string[],
  profile: { email?: string | null; displayName?: string | null },
): Promise<void> {
  const firestore = db();
  if (!firestore) return;
  try {
    await setDoc(
      doc(firestore, "users", uid),
      {
        email: profile.email ?? "",
        displayName: profile.displayName ?? "",
        photoURL: "",
        wishlist,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    /* offline/permissão — o estado local continua verdadeiro */
  }
}
