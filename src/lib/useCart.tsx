/**
 * Carrinho local do app ({ productId, qty }) — mesmo formato do site,
 * persistido em AsyncStorage. O checkout chega em lote próprio; por ora o
 * carrinho é a bandeja de itens com subtotal.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { CartItem, Product } from "./types";

const CART_KEY = "cliffhanger:cart";
const MAX_QTY = 99;

interface CartContextValue {
  items: CartItem[];
  /** false enquanto lê o storage — evita “piscar” vazio */
  hydrated: boolean;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  qtyOf: (productId: string) => number;
  count: number;
  /** soma dos itens presentes no catálogo */
  subtotal: (products: Product[]) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(CART_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              setItems(
                parsed
                  .filter(
                    (v): v is CartItem =>
                      typeof v === "object" &&
                      v !== null &&
                      typeof (v as CartItem).productId === "string" &&
                      typeof (v as CartItem).qty === "number",
                  )
                  .map((v) => ({ productId: v.productId, qty: Math.min(Math.max(1, Math.round(v.qty)), MAX_QTY) })),
              );
            }
          } catch {
            /* storage corrompido — começa vazio */
          }
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    void AsyncStorage.setItem(CART_KEY, JSON.stringify(next)).catch(() => {
      /* melhor esforço */
    });
  }, []);

  const commit = useCallback(
    (updater: (current: CartItem[]) => CartItem[]) => {
      setItems((current) => {
        const next = updater(current);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const add = useCallback(
    (productId: string, qty = 1) => {
      commit((current) => {
        const found = current.find((i) => i.productId === productId);
        if (found) {
          return current.map((i) =>
            i.productId === productId ? { ...i, qty: Math.min(i.qty + qty, MAX_QTY) } : i,
          );
        }
        return [...current, { productId, qty: Math.min(qty, MAX_QTY) }];
      });
    },
    [commit],
  );

  const setQty = useCallback(
    (productId: string, qty: number) => {
      commit((current) => {
        if (qty <= 0) return current.filter((i) => i.productId !== productId);
        return current.map((i) =>
          i.productId === productId ? { ...i, qty: Math.min(qty, MAX_QTY) } : i,
        );
      });
    },
    [commit],
  );

  const remove = useCallback(
    (productId: string) => {
      commit((current) => current.filter((i) => i.productId !== productId));
    },
    [commit],
  );

  const clear = useCallback(() => commit(() => []), [commit]);

  const qtyOf = useCallback(
    (productId: string) => items.find((i) => i.productId === productId)?.qty ?? 0,
    [items],
  );

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);

  const subtotal = useCallback(
    (products: Product[]) =>
      items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return product ? sum + product.price * item.qty : sum;
      }, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({ items, hydrated, add, setQty, remove, clear, qtyOf, count, subtotal }),
    [items, hydrated, add, setQty, remove, clear, qtyOf, count, subtotal],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de CartProvider");
  return ctx;
}
