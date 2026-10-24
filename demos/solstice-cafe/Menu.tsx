"use client";

import { AnimatePresence, m } from "motion/react";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { MenuCardPhoto } from "./CafeArtVisuals";
import { CATEGORIES, MENU_ITEMS, type Category } from "./data";
import { EASE, LayoutMotion } from "./Motion";
import { useOrder } from "./Order";

/** Category filters with a sliding underline, and the 4-column menu grid with add-to-order controls. */
export function MenuGrid() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("All Offerings");
  const { cart, update } = useOrder();
  const items = selectedCategory === "All Offerings" ? MENU_ITEMS : MENU_ITEMS.filter((item) => item.category === selectedCategory);

  return (
    <LayoutMotion>
      <div
        role="tablist"
        aria-label="Menu Categories"
        className="mt-10 flex items-center gap-6 overflow-x-auto border-b border-sol-stone-200/90 pb-px lg:gap-8"
      >
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedCategory(category)}
              className={`relative shrink-0 cursor-pointer pb-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none ${
                isActive ? "text-sol-ink" : "text-sol-stone-500 hover:text-sol-ink"
              }`}
            >
              {category}
              {isActive && (
                <m.div
                  layoutId="activeCategoryUnderline"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute right-0 bottom-0 left-0 h-0.5 bg-sol-sage"
                />
              )}
            </button>
          );
        })}
      </div>

      <m.div layout className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {items.map((item, idx) => {
            const quantityInCart = cart[item.id] || 0;
            return (
              <m.article
                key={item.id}
                data-motion
                layout
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.35, delay: idx * 0.05, ease: EASE }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-sol-stone-200/90 bg-white transition-shadow duration-200 hover:shadow-xl"
              >
                <div>
                  <div className="aspect-[4/3] w-full overflow-hidden border-b border-sol-stone-100 bg-sol-stone-100">
                    <MenuCardPhoto imageUrl={item.imageUrl} alt={item.name} variant={item.illustrationVariant} />
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-1.5 text-xs text-sol-stone-500">
                      <span>{item.originOrPrep}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.dietaryNote}</span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-3">
                      <h3 className="text-base leading-snug font-semibold text-sol-ink">{item.name}</h3>
                      <span className="shrink-0 font-sol-mono text-sm font-medium whitespace-nowrap text-sol-ink tabular-nums">₹{item.price}</span>
                    </div>

                    <p className="mt-2.5 text-xs leading-relaxed text-sol-stone-600">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-sol-stone-100 px-5 pt-2 pb-5">
                  <span className="text-xs text-sol-stone-400">{item.category}</span>

                  {quantityInCart === 0 ? (
                    <button
                      type="button"
                      onClick={() => update(item.id, 1)}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-sol-stone-100 px-3.5 py-1.5 text-xs font-medium whitespace-nowrap text-sol-ink transition-colors hover:bg-sol-sage hover:text-white"
                    >
                      <Plus aria-hidden className="h-3.5 w-3.5" />
                      <span>Add to Order</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-md bg-sol-sage/10 px-2 py-1">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => update(item.id, -1)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-sol-sage transition-colors hover:bg-white"
                      >
                        <Minus aria-hidden className="h-3 w-3" />
                      </button>
                      <span className="min-w-[1.25rem] text-center font-sol-mono text-xs font-semibold text-sol-sage tabular-nums">
                        {quantityInCart}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() => update(item.id, 1)}
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-sol-sage transition-colors hover:bg-white"
                      >
                        <Plus aria-hidden className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </m.article>
            );
          })}
        </AnimatePresence>
      </m.div>
    </LayoutMotion>
  );
}
