/**
 * Tipagem de `getReactNativePersistence` para firebase@12.
 *
 * O export existe apenas no build react-native (`@firebase/auth/dist/rn/index.rn.d.ts`),
 * mas as types públicas (`auth-public.d.ts`) — que o TypeScript resolve — não o
 * declaram. Este shim espelha a assinatura oficial:
 *   getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence
 * Usado somente em `src/lib/auth.native.ts`.
 */
import type { Persistence } from "firebase/auth";

declare module "firebase/auth" {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
