"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type MenuState = { open: boolean; setOpen: (open: boolean | ((o: boolean) => boolean)) => void };

const MenuContext = createContext<MenuState | null>(null);

/** Shares the mobile menu's open state, so the sticky bar can step aside while the menu is open. */
export function MenuStateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MenuContext.Provider value={{ open, setOpen }}>{children}</MenuContext.Provider>;
}

/** The shared state, or a local one when no provider wraps the caller. */
export function useMenuState(): MenuState {
  const shared = useContext(MenuContext);
  const [open, setOpen] = useState(false);
  return shared ?? { open, setOpen };
}
