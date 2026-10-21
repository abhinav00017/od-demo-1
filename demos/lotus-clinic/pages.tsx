import { ArrowRight, CalendarCheck, Check, MessageCircle, Quote } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { qrPath } from "@/lib/qr";
import { whatsappOptIn } from "@/lib/whatsapp/optin";
import { AdminApp } from "./AdminApp";
import { DoctorPortrait } from "./Art";
import { BookingForm, BookingFormFromUrl } from "./BookingForm";
import { VisitBlock } from "./ClinicMap";
import { clinic, homeServiceSlugs } from "./data";
import { LotusButton, LotusContainer, type Nav } from "./LotusSite";
import { ui } from "./ui";

/** The faint teal glow behind the hero. One per page at most. */
const GLOW = {
  backgroundImage:
    "radial-gradient(60% 70% at 78% 20%, color-mix(in srgb, var(--color-lotus-accent) 10%, transparent), transparent 70%)",
};

/** "Pregnancy care" becomes "pregnancy care"; "PCOS care" stays as it is. */
function lowerFirst(name: string) {
  return /^[A-Z]{2}/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1);
}

function PageHead({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return (
    <section className="border-b border-lotus-hairline">
      <LotusContainer className="py-10 sm:py-12">
        <h1 className="max-w-3xl text-[2rem] leading-tight font-bold tracking-tight text-lotus-text sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-lg">{intro}</p>
        {children}
      </LotusContainer>
    </section>
  );
}

function SectionTitle({ id, title, line, link }: { id?: string; title: string; line?: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="max-w-2xl">
        <h2 id={id} className={ui.h2}>
          {title}
        </h2>
        {line ? <p className="mt-2">{line}</p> : null}
      </div>
      {link ? (
        <Link href={link.href} className="inline-flex items-center gap-1.5 font-semibold text-lotus-accent hover:text-lotus-accent-hover">
          {link.label}
          <ArrowRight aria-hidden strokeWidth={1.75} className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

/** The portrait with name and credentials. The hero's right side, and the About page's left. */
function DoctorCard({ nav, more = false }: { nav: Nav; more?: boolean }) {
  const { doctor } = clinic;
  return (
    <div className={`flex items-center gap-4 p-4 sm:block sm:p-5 ${ui.card}`}>
      {/* Phones get a small round portrait beside the name, so the hero stays short. */}
      <span aria-hidden className="flex size-20 shrink-0 items-center justify-center rounded-full bg-lotus-accent/10 text-2xl font-semibold tracking-tight text-lotus-accent ring-1 ring-lotus-accent/15 sm:hidden">
        {doctor.initials}
      </span>
      <DoctorPortrait initials={doctor.initials} className="hidden sm:flex" />
      <div className="min-w-0 sm:px-1 sm:pt-4 sm:pb-1">
        <h2 id="doctor-heading" className="text-xl font-semibold tracking-tight text-lotus-text">
          {doctor.name}
        </h2>
        <p className="mt-1 text-sm">{doctor.degree}</p>
        <p className="mt-0.5 text-sm">{doctor.role}</p>
        {more ? (
          <Link href={nav.href("about")} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-lotus-accent hover:text-lotus-accent-hover">
            More about Dr. Rao
            <ArrowRight aria-hidden strokeWidth={1.75} className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function LotusHome({ nav }: { nav: Nav }) {
  const services = homeServiceSlugs.map((slug) => clinic.services.find((s) => s.slug === slug)!);
  return (
    <>
      <section className="relative" style={GLOW}>
        <LotusContainer className="grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16 lg:py-16">
          <div>
            <h1 className="text-[2.25rem] leading-[1.08] font-bold tracking-tight text-lotus-text sm:text-5xl lg:text-[3.5rem]">
              Expert care for women, at every stage of life.
            </h1>
            <p className="mt-4 max-w-xl text-lg">Pregnancy, periods, fertility and menopause, with Dr. Ananya Rao in {clinic.city}.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LotusButton href={nav.href("book")}>
                <CalendarCheck aria-hidden strokeWidth={1.75} className="size-5" />
                Book a visit
              </LotusButton>
              <LotusButton href={`${nav.href("book")}?type=online`} variant="secondary">
                <MessageCircle aria-hidden strokeWidth={1.75} className="size-5" />
                Online consultation
              </LotusButton>
            </div>
          </div>
          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <DoctorCard nav={nav} more />
          </div>
        </LotusContainer>
      </section>

      <section aria-labelledby="numbers-heading">
        <LotusContainer>
          <h2 id="numbers-heading" className="sr-only">
            Lotus in numbers
          </h2>
          <dl className={`grid grid-cols-3 divide-x divide-lotus-hairline ${ui.card}`}>
            {clinic.stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse justify-end px-2 py-4 text-center sm:px-6 sm:py-5">
                <dt className="mt-1 text-xs sm:text-sm">{s.label}</dt>
                <dd className="text-2xl font-bold tracking-tight text-lotus-text sm:text-4xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </LotusContainer>
      </section>

      <section aria-labelledby="stories-heading">
        <LotusContainer className={ui.section}>
          <SectionTitle id="stories-heading" title="What patients say" />
          <ul className="mt-6 grid gap-4 sm:gap-6 md:grid-cols-2">
            {clinic.testimonials.map((t) => (
              <li key={t.name} className={`flex flex-col p-6 sm:p-7 ${ui.card}`}>
                <Quote aria-hidden strokeWidth={1.5} className="size-6 text-lotus-accent" />
                <blockquote className="mt-3 leading-relaxed text-lotus-text sm:text-lg">{t.quote}</blockquote>
                <p className="mt-auto pt-5 text-sm">
                  <span className="font-semibold text-lotus-text">{t.name}</span> · {t.area}
                </p>
              </li>
            ))}
          </ul>
        </LotusContainer>
      </section>

      <section aria-labelledby="why-heading">
        <LotusContainer className={ui.sectionNext}>
          <SectionTitle id="why-heading" title="Why women choose Lotus" />
          <ul className="mt-6 grid gap-4 sm:gap-6 md:grid-cols-3">
            {clinic.why.map((w) => (
              <li key={w.title} className={`flex gap-4 p-5 sm:p-6 ${ui.card}`}>
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-lotus-hairline">
                  <Check strokeWidth={2} className="size-4 text-lotus-accent" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-lotus-text">{w.title}</h3>
                  <p className="mt-1">{w.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </LotusContainer>
      </section>

      <section aria-labelledby="services-heading">
        <LotusContainer className={ui.sectionNext}>
          <SectionTitle id="services-heading" title="Services" link={{ href: nav.href("services"), label: "All services" }} />
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {services.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`${nav.href("services")}#${s.slug}`}
                  className={`group block h-full p-5 transition hover:ring-lotus-accent sm:p-6 ${ui.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-tight text-lotus-text">{s.name}</h3>
                    <ArrowRight aria-hidden strokeWidth={1.75} className="mt-1 size-4 shrink-0 text-lotus-accent transition group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1.5">{s.short}</p>
                </Link>
              </li>
            ))}
          </ul>
        </LotusContainer>
      </section>

      <section aria-labelledby="visit-heading">
        <LotusContainer className={ui.sectionNext}>
          <SectionTitle id="visit-heading" title="Visit the clinic" line="Near Siripuram junction, opposite the city park, with parking in the building." />
          <div className="mt-6">
            <VisitBlock />
          </div>
        </LotusContainer>
      </section>
    </>
  );
}

export function LotusServices({ nav }: { nav: Nav }) {
  return (
    <>
      <PageHead title="Services" intro="Every visit starts with time to talk and ends with a clear, written plan." />
      <LotusContainer className={ui.section}>
        <ul className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {clinic.services.map((s) => (
            <li key={s.slug} id={s.slug} className={`flex scroll-mt-6 flex-col p-6 sm:p-7 ${ui.card}`}>
              <h2 className="text-xl font-semibold tracking-tight text-lotus-text sm:text-2xl">{s.name}</h2>
              <p className="mt-2">{s.short}</p>
              <ul className="mt-4 space-y-2">
                {s.details.map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-lotus-text">
                    <Check aria-hidden strokeWidth={2} className="mt-1 size-4 shrink-0 text-lotus-accent" />
                    {d}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <LotusButton href={nav.href("book")} variant="secondary" className="px-5 py-2.5 text-sm">
                  Book for {lowerFirst(s.name)}
                </LotusButton>
              </div>
            </li>
          ))}
        </ul>
      </LotusContainer>
    </>
  );
}

export function LotusAbout({ nav }: { nav: Nav }) {
  const { doctor } = clinic;
  return (
    <>
      <PageHead title={`Meet ${doctor.name}`} intro={doctor.intro} />
      <LotusContainer className={`grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 ${ui.section}`}>
        <div className="mx-auto w-full max-w-sm space-y-4 lg:max-w-none">
          <DoctorCard nav={nav} />
          <div className={`p-6 ${ui.card}`}>
            <p className="font-semibold text-lotus-text">Clinic hours</p>
            <ul className="mt-3 space-y-2 text-sm">
              {clinic.hours.map((h) => (
                <li key={h.days} className="flex justify-between gap-4">
                  <span>{h.days}</span>
                  <span className="text-right font-medium text-lotus-text">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="space-y-3 text-lotus-text sm:text-lg">
            {doctor.bio.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <h2 className="mt-10 text-xl font-semibold tracking-tight text-lotus-text sm:text-2xl">Training and experience</h2>
          <ol className="mt-5 space-y-4 border-l border-lotus-hairline pl-6">
            {doctor.milestones.map((m) => (
              <li key={m.year} className="relative">
                <span aria-hidden className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-lotus-accent ring-4 ring-white" />
                <p className="text-sm font-semibold text-lotus-accent">{m.year}</p>
                <p className="text-lotus-text">{m.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8">Speaks {doctor.languages}.</p>
          <LotusButton href={nav.href("book")} className="mt-5">
            <CalendarCheck aria-hidden strokeWidth={1.75} className="size-5" />
            Book with Dr. Rao
          </LotusButton>
        </div>
      </LotusContainer>
    </>
  );
}

export function LotusContact({ nav }: { nav: Nav }) {
  return (
    <>
      <PageHead title="Visit or message us" intro="We reply on WhatsApp within 2 hours during clinic hours." />
      <LotusContainer className={ui.section}>
        <VisitBlock withEmail>
          <LotusButton href={nav.href("book")} className="w-full sm:w-auto">
            <CalendarCheck aria-hidden strokeWidth={1.75} className="size-5" />
            Book a visit
          </LotusButton>
        </VisitBlock>
      </LotusContainer>
    </>
  );
}

export function LotusBook() {
  // Read on the server and passed down, so the client bundle never reads env. Null when there is no join step.
  const optIn = whatsappOptIn();
  return (
    <>
      <PageHead title="Book your visit" intro="Choose a clinic visit or an online consultation, and we confirm the time on WhatsApp." />
      <LotusContainer className={ui.section}>
        <Suspense fallback={<BookingForm optIn={optIn} />}>
          <BookingFormFromUrl optIn={optIn} />
        </Suspense>
      </LotusContainer>
    </>
  );
}

/** The clinic's private page: bookings from the website. Not in the site nav. */
export function LotusAdmin({ nav }: { nav: Nav }) {
  const optIn = whatsappOptIn();
  // The QR is drawn here, on the server, so the encoder stays out of the browser bundle.
  const deskOptIn = optIn ? { ...optIn, qr: qrPath(optIn.href) } : null;
  return (
    <>
      <PageHead title="Clinic dashboard" intro="Bookings from the website, today and upcoming, updated within seconds." />
      <LotusContainer className={ui.section}>
        <AdminApp bookHref={nav.href("book")} optIn={deskOptIn} />
      </LotusContainer>
    </>
  );
}
