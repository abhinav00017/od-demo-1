import { Award, CalendarCheck, Check, MessageCircle, Quote, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { qrPath } from "@/lib/qr";
import { whatsappOptIn } from "@/lib/whatsapp/optin";
import { AdminApp } from "./AdminApp";
import { ArrowCircle, GoogleG, LotusLineMark, Stars } from "./Art";
import { BookingForm, BookingFormFromUrl } from "./BookingForm";
import { VisitBlock } from "./ClinicMap";
import { clinic, homeServiceSlugs } from "./data";
import { LotusButton, LotusContainer, type Nav } from "./LotusSite";
import { ServiceIcon } from "./ServiceIcon";
import { ui } from "./ui";

/** The hero backdrop: the 4% teal tint, full-bleed, with one faint teal glow on top. One per page at most. */
const HERO_BACKDROP = {
  backgroundColor: "var(--color-lotus-tint)",
  backgroundImage:
    "radial-gradient(60% 70% at 78% 20%, color-mix(in srgb, var(--color-lotus-accent) 10%, transparent), transparent 70%)",
};

/** "Sravani K." becomes "SK". */
function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

function PageHead({ title, intro, children }: { title: string; intro: string; children?: ReactNode }) {
  return (
    <section className="border-b border-lotus-hairline bg-lotus-tint">
      <LotusContainer className="py-14 sm:py-16 lg:py-20">
        <h1 className={`max-w-3xl text-[2.25rem] leading-tight sm:text-5xl ${ui.h1}`}>{title}</h1>
        <p className="mt-4 max-w-2xl text-lg">{intro}</p>
        {children}
      </LotusContainer>
    </section>
  );
}

/** A home section title, led by the thin lotus line-mark, with a one-line sub-heading. */
function SectionTitle({ id, title, line, link }: { id?: string; title: string; line: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="max-w-2xl">
        <h2 id={id} className={`flex items-start gap-3 ${ui.h2}`}>
          <LotusLineMark className="mt-[0.3em] size-6 shrink-0" />
          {title}
        </h2>
        <p className="mt-3 text-lg">{line}</p>
      </div>
      {link ? (
        <LotusButton href={link.href} variant="arrow">
          {link.label}
        </LotusButton>
      ) : null}
    </div>
  );
}

/** The "12+ years" chip beside the doctor's role. */
function YearsChip() {
  return (
    <span className="inline-flex items-center rounded-full bg-lotus-avatar px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-lotus-accent-hover">
      {clinic.doctor.years}+ years
    </span>
  );
}

/**
 * The doctor's photo slot: "AR" in a soft teal circle, until the clinic sends a real photo.
 * `portrait` is the large 4:5 rounded card; `avatar` is a small round version. Decorative: the name is always beside it.
 */
function Initials({ variant, className = "" }: { variant: "portrait" | "avatar"; className?: string }) {
  if (variant === "avatar") {
    return (
      <span
        aria-hidden
        data-portrait="avatar"
        className={`flex size-20 shrink-0 items-center justify-center rounded-full bg-lotus-avatar text-2xl font-extrabold tracking-tight text-lotus-accent-hover ring-1 ring-lotus-hairline ${className}`}
      >
        {clinic.doctor.initials}
      </span>
    );
  }
  return (
    <div
      aria-hidden
      data-portrait="portrait"
      className={`relative aspect-[4/5] items-center justify-center overflow-hidden rounded-3xl bg-white shadow-lotus ring-1 ring-lotus-hairline ${className}`}
    >
      <span className="absolute -top-16 -right-16 size-48 rounded-full bg-lotus-tint" />
      <span className="flex aspect-square w-[68%] items-center justify-center rounded-full bg-lotus-avatar text-7xl font-extrabold tracking-[-0.04em] text-lotus-accent-hover lg:text-8xl">
        {clinic.doctor.initials}
      </span>
    </div>
  );
}

/**
 * The hero's doctor: from 640px the large 4:5 initials card with a role card over its foot.
 * Phones get the small round avatar beside the role instead, so the hero stays short.
 */
function HeroDoctor({ nav }: { nav: Nav }) {
  return (
    <div className="mx-auto w-full max-w-sm lg:mr-0 lg:max-w-[24rem]">
      <Initials variant="portrait" className="hidden sm:flex" />
      <div className={`relative flex items-center gap-4 p-5 sm:mx-5 sm:-mt-16 sm:block sm:p-6 ${ui.card}`}>
        <Initials variant="avatar" className="sm:hidden" />
        <div className="min-w-0">
          <p className="font-semibold text-lotus-text">{clinic.doctor.role}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <YearsChip />
            <Link href={nav.href("about")} className="text-sm font-semibold text-lotus-accent hover:text-lotus-accent-hover">
              More About Dr. Rao <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** About's doctor card: the round avatar beside the name, role and years. */
function DoctorCard() {
  const { doctor } = clinic;
  return (
    <div className={`flex items-center gap-5 p-6 ${ui.card}`}>
      <Initials variant="avatar" />
      <div className="min-w-0">
        <h2 id="doctor-heading" className="text-xl font-bold tracking-tight text-lotus-text">
          {doctor.name}
        </h2>
        <p className="mt-1 text-sm">{doctor.degree}</p>
        <p className="mt-0.5 text-sm text-lotus-text">{doctor.role}</p>
        <div className="mt-2.5">
          <YearsChip />
        </div>
      </div>
    </div>
  );
}

/** Small proof points under the hero buttons. */
function TrustStrip() {
  const rating = clinic.stats.find((s) => "reviews" in s)!;
  return (
    <ul data-trust="" className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
      <li className="flex items-center gap-2">
        <GoogleG className="size-4" />
        <span className="font-semibold text-lotus-text">{rating.value}</span>
        <Stars className="size-3.5" />
        <span>Google Rating</span>
      </li>
      <li className="flex items-center gap-2">
        <Award aria-hidden strokeWidth={1.75} className="size-4 text-lotus-accent" />
        {clinic.doctor.years}+ Years of Experience
      </li>
      <li className="flex items-center gap-2">
        <ShieldCheck aria-hidden strokeWidth={1.75} className="size-4 text-lotus-accent" />
        FOGSI Member
      </li>
    </ul>
  );
}

export function LotusHome({ nav }: { nav: Nav }) {
  const services = homeServiceSlugs.map((slug) => clinic.services.find((s) => s.slug === slug)!);
  const { doctor } = clinic;
  return (
    <>
      <section className="relative" style={HERO_BACKDROP}>
        <LotusContainer className="grid items-center gap-12 py-14 sm:py-20 lg:min-h-[80vh] lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:py-20">
          <div>
            <h1 className={`text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-7xl ${ui.h1}`}>{doctor.name}</h1>
            <p className="mt-4 font-semibold text-lotus-accent-hover sm:text-lg">{doctor.degree}</p>
            <p className="mt-6 max-w-[22ch] text-2xl leading-snug font-semibold tracking-tight text-pretty text-lotus-text sm:text-3xl">{clinic.tagline}</p>
            <p className="mt-4 max-w-[52ch] text-lg text-pretty">{doctor.positioning}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <LotusButton href={nav.href("book")}>
                <CalendarCheck aria-hidden strokeWidth={1.75} className="size-5" />
                Book an Appointment
              </LotusButton>
              <LotusButton href={`${nav.href("book")}?type=online`} variant="arrow">
                <MessageCircle aria-hidden strokeWidth={1.75} className="size-5" />
                Consult Online
              </LotusButton>
            </div>
            <TrustStrip />
          </div>
          <HeroDoctor nav={nav} />
        </LotusContainer>
      </section>

      <section aria-labelledby="numbers-heading">
        <LotusContainer className={ui.section}>
          <h2 id="numbers-heading" className="sr-only">
            Lotus in numbers
          </h2>
          <dl className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 lg:gap-8">
            {clinic.stats.map((s) => (
              <div key={s.label} data-stat="" className="flex flex-col-reverse rounded-3xl bg-lotus-avatar px-5 py-6 sm:px-7 sm:py-8">
                <dt className="mt-4 text-sm font-medium sm:text-base">
                  {s.label}
                  {"reviews" in s ? <span className="block text-sm font-normal">{s.reviews}</span> : null}
                </dt>
                <dd className="after:mt-4 after:block after:h-px after:w-12 after:bg-lotus-accent">
                  {"reviews" in s ? (
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <span className="flex items-center gap-1.5 text-3xl font-bold tracking-tight text-lotus-text sm:text-4xl">
                        <GoogleG className="size-6 sm:size-7" />
                        {s.value}
                      </span>
                      <Stars className="size-3.5 sm:size-4" />
                    </span>
                  ) : (
                    <span className="text-3xl font-bold tracking-tight text-lotus-text sm:text-4xl">{s.value}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </LotusContainer>
      </section>

      <section aria-labelledby="stories-heading" data-band="" className="bg-lotus-tint">
        <LotusContainer className={ui.section}>
          <SectionTitle id="stories-heading" title="What Our Patients Say" line="Experiences shared by women who visit the clinic." />
          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:mt-12 lg:gap-8">
            {clinic.testimonials.map((t) => (
              <li key={t.name} className={`flex flex-col p-7 sm:p-9 ${ui.card} ${ui.lift}`}>
                <div className="flex items-center justify-between gap-4">
                  <Quote aria-hidden strokeWidth={1.5} className="size-7 text-lotus-accent" />
                  <span className="inline-flex items-center gap-2 text-sm">
                    <Stars className="size-3.5" />
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-lotus-hairline">
                      <GoogleG className="size-3.5" />
                      Google review
                    </span>
                  </span>
                </div>
                <blockquote className="mt-5 leading-relaxed text-lotus-text sm:text-lg">{t.quote}</blockquote>
                <div className="mt-auto flex items-center gap-3 pt-7 text-sm">
                  <span
                    aria-hidden
                    data-avatar=""
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lotus-avatar text-[13px] font-semibold text-lotus-accent-hover"
                  >
                    {initials(t.name)}
                  </span>
                  <p className="leading-snug">
                    <span className="block font-semibold text-lotus-text">{t.name}</span>
                    {t.area}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </LotusContainer>
      </section>

      <section aria-labelledby="why-heading">
        <LotusContainer className={ui.section}>
          <SectionTitle id="why-heading" title={`Why Choose ${clinic.name}`} line="Careful, personal care, based on clinical evidence." />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4 lg:gap-8">
            {clinic.why.map((w) => (
              <li key={w.title} className={`flex flex-col p-6 sm:p-7 ${ui.card} ${ui.lift}`}>
                <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lotus-avatar">
                  <Check strokeWidth={2} className="size-5 text-lotus-accent" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-lotus-text">{w.title}</h3>
                <p className="mt-2">{w.text}</p>
              </li>
            ))}
          </ul>
        </LotusContainer>
      </section>

      <section aria-labelledby="services-heading" data-band="" className="bg-lotus-tint">
        <LotusContainer className={ui.section}>
          <SectionTitle
            id="services-heading"
            title="Our Specialities"
            line="Comprehensive women's healthcare under one roof."
            link={{ href: nav.href("services"), label: "All Services" }}
          />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:mt-12 lg:gap-8">
            {services.map((s) => (
              <li key={s.slug} className={`flex flex-col p-7 sm:p-9 ${ui.card} ${ui.lift}`}>
                <ServiceIcon name={s.icon} />
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-lotus-text sm:text-2xl">{s.name}</h3>
                <p className="mt-3 leading-relaxed">{s.short}</p>
                <div className="mt-auto pt-7">
                  <Link href={`${nav.href("services")}#${s.slug}`} className={ui.secondaryArrow}>
                    <span>
                      Know More <span className="sr-only">about {s.name}</span>
                    </span>
                    <ArrowCircle />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </LotusContainer>
      </section>

      <section aria-labelledby="visit-heading">
        <LotusContainer className={ui.section}>
          <SectionTitle id="visit-heading" title="Visit Us" line="Near Siripuram Junction, opposite the city park, with parking in the building." />
          <div className="mt-10 lg:mt-12">
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
      <PageHead title="Services and Treatments" intro="Comprehensive care for women, from adolescence through pregnancy and menopause." />
      <LotusContainer className={ui.section}>
        <ul className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {clinic.services.map((s) => (
            <li key={s.slug} id={s.slug} className={`flex scroll-mt-6 flex-col p-7 sm:p-9 ${ui.card} ${ui.lift}`}>
              <div className="flex items-center gap-4">
                <ServiceIcon name={s.icon} />
                <h2 className="text-xl font-semibold tracking-tight text-lotus-text sm:text-2xl">{s.name}</h2>
              </div>
              <p className="mt-5 leading-relaxed">{s.short}</p>
              <ul className="mt-5 space-y-2.5">
                {s.details.map((d) => (
                  <li key={d} className="flex items-start gap-2.5 text-lotus-text">
                    <Check aria-hidden strokeWidth={2} className="mt-1 size-4 shrink-0 text-lotus-accent" />
                    {d}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <LotusButton href={nav.href("book")} variant="arrow">
                  Book an Appointment <span className="sr-only">for {s.name}</span>
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
      <PageHead title={`About ${doctor.name}`} intro={doctor.intro} />
      <LotusContainer className={`grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 ${ui.section}`}>
        <div className="mx-auto w-full max-w-sm space-y-6 lg:max-w-none">
          <DoctorCard />
          <div className={`p-6 ${ui.card}`}>
            <p className="font-semibold text-lotus-text">Clinic Hours</p>
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
          <div className="space-y-4 leading-relaxed text-lotus-text sm:text-lg">
            {doctor.bio.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <h2 className="mt-12 text-2xl font-bold tracking-tight text-lotus-text">Qualifications and Memberships</h2>
          <dl data-qualifications="" className="mt-6 divide-y divide-lotus-hairline rounded-3xl ring-1 ring-lotus-hairline">
            {doctor.qualifications.map((q) => (
              <div key={q.label} className="grid gap-1 px-6 py-4 sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="font-semibold text-lotus-accent-hover">{q.label}</dt>
                <dd className="text-lotus-text">{q.text}</dd>
              </div>
            ))}
          </dl>
          <h2 className="mt-12 text-2xl font-bold tracking-tight text-lotus-text">Training and Experience</h2>
          <ol className="mt-6 space-y-5 border-l border-lotus-hairline pl-6">
            {doctor.milestones.map((m) => (
              <li key={m.year} className="relative">
                <span aria-hidden className="absolute top-1.5 -left-[29px] size-2.5 rounded-full bg-lotus-accent ring-4 ring-white" />
                <p className="text-sm font-semibold text-lotus-accent">{m.year}</p>
                <p className="text-lotus-text">{m.text}</p>
              </li>
            ))}
          </ol>
          <LotusButton href={nav.href("book")} className="mt-10">
            <CalendarCheck aria-hidden strokeWidth={1.75} className="size-5" />
            Book an Appointment
          </LotusButton>
        </div>
      </LotusContainer>
    </>
  );
}

export function LotusContact({ nav }: { nav: Nav }) {
  return (
    <>
      <PageHead title="Contact and Location" intro="The clinic replies on WhatsApp within two hours during clinic hours." />
      <LotusContainer className={ui.section}>
        <VisitBlock withEmail>
          <LotusButton href={nav.href("book")} className="w-full sm:w-auto">
            <CalendarCheck aria-hidden strokeWidth={1.75} className="size-5" />
            Book an Appointment
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
      <PageHead title="Book an Appointment" intro="Choose a clinic visit or an online consultation. The clinic confirms the time on WhatsApp." />
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
      <PageHead title="Clinic Dashboard" intro="Bookings from the website, today and upcoming, updated within seconds." />
      <LotusContainer className={ui.section}>
        <AdminApp bookHref={nav.href("book")} optIn={deskOptIn} />
      </LotusContainer>
    </>
  );
}
