"use client";

import { AnimatePresence, m } from "motion/react";
import { Minus, Plus, Send, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DELIVERY_OPTIONS,
  MENU_ITEMS,
  WHATSAPP_DISPLAY,
  orderMessage,
  whatsAppHref,
  type CartEntry,
  type DeliveryOption,
} from "./data";
import { MagneticButton } from "./MagneticButton";

/** The order tray: what is in it and whether the drawer is open. Shared by the header, hero, menu, footer and drawer. */
type Order = {
  cart: Record<string, number>;
  entries: CartEntry[];
  totalItems: number;
  subtotal: number;
  update: (id: string, delta: number) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const OrderContext = createContext<Order | null>(null);

export function useOrder() {
  const order = useContext(OrderContext);
  if (!order) throw new Error("useOrder needs an OrderProvider above it");
  return order;
}

/** The tray starts with a pour-over and a croissant, as the original site did. */
const STARTING_CART = { "araku-pour-over": 1, "osmania-salted-croissant": 1 };

export function OrderProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Record<string, number>>(STARTING_CART);
  const [open, setOpen] = useState(false);

  const update = (id: string, delta: number) => {
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const entries = Object.entries(cart).flatMap(([id, qty]) => {
    const item = MENU_ITEMS.find((i) => i.id === id);
    return item ? [{ item, qty }] : [];
  });
  const totalItems = entries.reduce((sum, e) => sum + e.qty, 0);
  const subtotal = entries.reduce((sum, e) => sum + e.item.price * e.qty, 0);

  return (
    <OrderContext.Provider value={{ cart, entries, totalItems, subtotal, update, open, setOpen }}>
      {children}
      <OrderDrawer />
    </OrderContext.Provider>
  );
}

/** The header's magnetic "Order on WhatsApp" button, with the tray count. */
export function HeaderOrderButton() {
  const { totalItems, setOpen } = useOrder();
  return (
    <MagneticButton
      onClick={() => setOpen(true)}
      ariaLabel={`Order on WhatsApp, ${totalItems} in tray`}
      className="cursor-pointer gap-2 rounded-lg bg-sol-sage px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sol-sage-deep sm:px-5"
    >
      {/* Phones show "Order (2)" so the header fits at 375px; the original button overflowed there. */}
      <span>
        Order<span className="hidden sm:inline"> on WhatsApp</span>
      </span>
      <span className="font-sol-mono text-xs tabular-nums opacity-90">({totalItems})</span>
    </MagneticButton>
  );
}

export function HeroOrderButton() {
  const { setOpen } = useOrder();
  return (
    <MagneticButton
      onClick={() => setOpen(true)}
      className="cursor-pointer rounded-lg border border-sol-stone-300 bg-white px-6 py-3.5 text-sm font-medium text-sol-ink hover:border-sol-sage hover:text-sol-sage"
    >
      <span>Order on WhatsApp</span>
    </MagneticButton>
  );
}

export function FooterOrderButton() {
  const { setOpen } = useOrder();
  return (
    <button type="button" onClick={() => setOpen(true)} className="cursor-pointer font-medium text-sol-sage hover:underline">
      Order on WhatsApp
    </button>
  );
}

/** The slide-over tray. Builds the WhatsApp order message and opens a chat with the demo number. */
function OrderDrawer() {
  const { entries, subtotal, update, open, setOpen } = useOrder();
  const [customerName, setCustomerName] = useState("");
  const [delivery, setDelivery] = useState<DeliveryOption>("Courtyard Pickup");
  const [orderSent, setOrderSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!orderSent) return;
    const t = setTimeout(() => setOrderSent(false), 3000);
    return () => clearTimeout(t);
  }, [orderSent]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs"
          />
          <m.aside
            key="tray"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            aria-label="WhatsApp Order Tray"
            className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md flex-col justify-between border-l border-sol-stone-200 bg-sol-paper shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-sol-stone-200 bg-white p-6">
              <div className="flex items-center gap-2.5">
                <ShoppingBag aria-hidden className="h-5 w-5 text-sol-sage" />
                <div>
                  <h2 className="text-base font-semibold text-sol-ink">WhatsApp Express Order</h2>
                  <p className="text-xs text-sol-stone-500">Jubilee Hills Kitchen · Ready in 15–20 mins</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close Order Drawer"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg p-2 text-sol-stone-500 transition-colors hover:bg-sol-stone-100 hover:text-sol-ink"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-sol-stone-200/70 p-1">
                {DELIVERY_OPTIONS.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={delivery === mode}
                    onClick={() => setDelivery(mode)}
                    className={`shrink-0 cursor-pointer rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                      delivery === mode ? "bg-white text-sol-ink shadow-xs" : "text-sol-stone-600 hover:text-sol-ink"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {entries.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-sol-stone-500">Your order tray is currently empty.</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-3 cursor-pointer text-xs font-medium text-sol-sage underline underline-offset-4"
                  >
                    Browse Fresh Brews &amp; Bakes
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map(({ item, qty }) => (
                    <div key={item.id} className="flex items-center justify-between gap-3.5 rounded-xl border border-sol-stone-200/80 bg-white p-3.5">
                      <div className="flex items-center gap-3">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={48}
                          height={48}
                          sizes="48px"
                          className="h-12 w-12 shrink-0 rounded-lg bg-sol-stone-100 object-cover"
                        />
                        <div>
                          <p className="text-sm leading-snug font-semibold text-sol-ink">{item.name}</p>
                          <p className="mt-0.5 font-sol-mono text-xs text-sol-stone-500 tabular-nums">₹{item.price} each</p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${item.name}`}
                          onClick={() => update(item.id, -1)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-sol-stone-200 text-sol-ink-soft hover:bg-sol-stone-100"
                        >
                          <Minus aria-hidden className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center font-sol-mono text-xs font-semibold tabular-nums">{qty}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${item.name}`}
                          onClick={() => update(item.id, 1)}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-sol-stone-200 text-sol-ink-soft hover:bg-sol-stone-100"
                        >
                          <Plus aria-hidden className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label htmlFor="order-name" className="mb-1.5 block text-xs font-medium text-sol-stone-700">
                  Your Name or Table Number (Optional)
                </label>
                <input
                  id="order-name"
                  type="text"
                  placeholder="e.g., Rohan · Courtyard Table 4"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-sol-stone-300 bg-white px-3.5 py-2.5 text-sm focus:border-sol-sage focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-sol-stone-200 bg-white p-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-sol-stone-600">Total Amount (incl. GST)</span>
                <span className="font-sol-mono text-lg font-semibold text-sol-ink tabular-nums">₹{subtotal}</span>
              </div>

              <div className="flex flex-col gap-2.5">
                <a
                  href={whatsAppHref(orderMessage(entries, delivery, customerName))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOrderSent(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sol-sage px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-sol-sage-deep"
                >
                  <Send aria-hidden className="h-4 w-4" />
                  <span>Send Order to Solstice WhatsApp</span>
                </a>
                {orderSent && (
                  <p role="status" className="text-center text-xs font-medium text-sol-sage">
                    Order summary prepared for WhatsApp ({WHATSAPP_DISPLAY})
                  </p>
                )}
              </div>
            </div>
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
}
