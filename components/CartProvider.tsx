"use client";

import { createContext, useContext, useEffect, useReducer } from "react";
import { addItem, addDesignItems, changeQuantity, consumePurchasedItems, itemKey, readCart, type CartItem, type CartProduct } from "@/lib/cart";
import { refreshCart, type CurrentProduct, type PendingCheckout } from "@/lib/cart-refresh";

type Action =
  | { type: "purchase-complete"; lines: { id: string; size: string | null; quantity: number; customization?: { designId: string } }[] }
  | { type: "clear-messages" }
  | { type: "add-design"; product: CartProduct; quantities: Record<string, number> }
  | { type: "refresh"; products: CurrentProduct[]; checkedIds: string[]; pending?: PendingCheckout[] }
  | { type: "load"; items: CartItem[] }
  | { type: "add"; product: CartProduct; size: string | null }
  | { type: "quantity"; key: string; quantity: number }
  | { type: "remove"; key: string };

function reducer(state: { items: CartItem[]; ready: boolean; messages: string[] }, action: Action) {
  switch (action.type) {
    case "purchase-complete": return { ...state, items: consumePurchasedItems(state.items, action.lines), messages: [] };
    case "clear-messages": return { ...state, messages: [] };
    case "add-design": return { ...state, items: addDesignItems(state.items, action.product, action.quantities) };
    case "load": return { ...state, items: action.items, ready: true, messages: [] };
    case "refresh": {
      const result = refreshCart(state.items, action.products, action.checkedIds, action.pending);
      return { ...state, items: result.items, messages: [...new Set([...state.messages, ...result.messages])] };
    }
    case "add": return { ...state, items: addItem(state.items, action.product, action.size) };
    case "quantity": return { ...state, items: changeQuantity(state.items, action.key, action.quantity) };
    case "remove": return { ...state, items: state.items.filter((item) => itemKey(item) !== action.key) };
  }
}

const CartContext = createContext<{
  items: CartItem[];
  ready: boolean;
  messages: string[];
  dispatch: React.Dispatch<Action>;
} | null>(null);
const storageKey = "hawk-sportz-cart-v1";

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], ready: false, messages: [] });
  useEffect(() => {
    try {
      dispatch({ type: "load", items: readCart(localStorage.getItem(storageKey)) });
    } catch {
      dispatch({ type: "load", items: [] });
    }
    function sync(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) {
        dispatch({ type: "load", items: readCart(event.newValue) });
      }
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (state.ready) {
      try { localStorage.setItem(storageKey, JSON.stringify(state.items)); } catch { /* Keep the in-memory cart usable. */ }
    }
  }, [state]);
  return <CartContext.Provider value={{ ...state, dispatch }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("CartProvider is required");
  return cart;
}
