import Link from "next/link";
import { Container } from "@/components/hub/Container";
import { HubFooter } from "@/components/hub/HubFooter";
import { HubHeader } from "@/components/hub/HubHeader";

export default function NotFound() {
  return (
    <>
      <HubHeader />
      <main className="flex flex-1 items-center">
        <Container className="py-20 sm:py-28">
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">404</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
            This page does not exist<span className="text-brand">.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">The link may be old, or the demo may have moved. Pick a business to start again.</p>
          <Link
            href="/"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 font-semibold text-white transition hover:bg-brand-strong"
          >
            See all demos <span aria-hidden>→</span>
          </Link>
        </Container>
      </main>
      <HubFooter />
    </>
  );
}
