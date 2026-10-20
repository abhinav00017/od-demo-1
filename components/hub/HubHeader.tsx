import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "./Container";
import { Logo } from "./Logo";

/** Slim top row on hub pages: logo left, one back link right. */
export function HubHeader({ back }: { back?: { href: string; label: ReactNode } }) {
  return (
    <header className="py-5 sm:py-7">
      <Container className="flex items-center justify-between gap-4">
        <Logo />
        {back ? (
          <Link
            href={back.href}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            <span aria-hidden>←</span>
            {back.label}
          </Link>
        ) : null}
      </Container>
    </header>
  );
}
