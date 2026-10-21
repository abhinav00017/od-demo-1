import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AdminApp } from "./AdminApp";
import { DoctorCard } from "./Art";
import { BookingForm, BookingFormFromUrl } from "./BookingForm";
import { ClinicMap, DirectionsLink, VisitBlock } from "./ClinicMap";
import { clinic } from "./data";
import { Eyebrow, LotusButton, LotusContainer, LotusLink, LotusSection, type Nav } from "./LotusSite";
import { textLinkClass } from "./ui";

/** Type scale. Serif for display, sans for everything else. */
const h1 = "font-lotus-serif text-[2.6rem] leading-[1.04] tracking-[-0.025em] text-lotus-text sm:text-6xl lg:text-[4.25rem]";
const h2 = "font-lotus-serif text-[2.1rem] leading-[1.08] tracking-[-0.02em] text-lotus-text sm:text-5xl";
const h3 = "font-lotus-serif text-[1.65rem] leading-tight tracking-[-0.01em] text-lotus-text";

function PageHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <section>
      <LotusContainer className="pt-16 pb-16 sm:pt-24 sm:pb-20 lg:pt-28 lg:pb-24">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className={`mt-5 max-w-[18ch] ${h1}`}>{title}</h1>
        <p className="mt-6 max-w-[52ch] text-lg sm:text-xl">{intro}</p>
      </LotusContainer>
    </section>
  );
}

/** Section heading: label and title on the left, the intro on the right on wide screens. */
function SectionTitle({ eyebrow, title, id, children }: { eyebrow: string; title: string; id?: string; children?: ReactNode }) {
  return (
    <div className={children ? "grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-16" : undefined}>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 id={id} className={`mt-4 ${h2}`}>
          {title}
        </h2>
      </div>
      {children ? <p className="max-w-[46ch] text-lg lg:justify-self-end">{children}</p> : null}
    </div>
  );
}

function ServiceList({ nav }: { nav: Nav }) {
  return (
    <ul className="mt-16 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
      {clinic.services.map((s) => (
        <li key={s.slug} className="flex flex-col border-t border-lotus-rule pt-7 pb-10">
          <h3 className={h3}>{s.name}</h3>
          <p className="mt-3 max-w-[38ch]">{s.short}</p>
          <LotusLink href={`${nav.href("services")}#${s.slug}`} className="mt-auto self-start pt-6 text-[15px]">
            Learn more
          </LotusLink>
        </li>
      ))}
    </ul>
  );
}

function CtaBand({ nav }: { nav: Nav }) {
  return (
    <LotusSection band bandEnd>
      <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
        <div>
          <h2 className={h2}>Book your visit today</h2>
          <p className="mt-5 max-w-[46ch] text-lg">At the clinic or online. We confirm on WhatsApp within 2 hours.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
          <LotusButton href={nav.href("book")}>Book a visit</LotusButton>
          <Link href={nav.href("contact")} className={textLinkClass}>
            {clinic.phone}
          </Link>
        </div>
      </div>
    </LotusSection>
  );
}

export function LotusHome({ nav }: { nav: Nav }) {
  const { doctor } = clinic;
  return (
    <>
      <section>
        <LotusContainer className="pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-32">
          <Eyebrow mark>Women&apos;s clinic in {clinic.city}</Eyebrow>
          <h1 className="mt-6 max-w-[15ch] font-lotus-serif text-[2.9rem] leading-[1.02] tracking-[-0.03em] text-lotus-text sm:text-7xl lg:max-w-none lg:text-[5.75rem]">
            Expert care for women, at <em className="text-lotus-terracotta italic">every stage of life.</em>
          </h1>
          <div className="mt-14 grid gap-12 border-t border-lotus-rule pt-10 lg:mt-20 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-20">
            <div>
              <p className="max-w-[44ch] text-lg text-lotus-text sm:text-xl">
                {doctor.name}, {doctor.degree}, sees women at the clinic in Siripuram and online.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
                <LotusButton href={nav.href("book")}>Book a visit</LotusButton>
                <LotusLink href={`${nav.href("book")}?type=online`}>Online consultation</LotusLink>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-6 sm:gap-12">
              {clinic.stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-lotus-serif text-[2rem] leading-none tracking-[-0.02em] text-lotus-forest sm:text-5xl">{s.value}</dd>
                  <dd className="mt-2 max-w-[16ch] text-sm leading-snug">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </LotusContainer>
      </section>

      <LotusSection>
        <SectionTitle eyebrow="Services" title="Care for every stage">
          From the first period to menopause, and every pregnancy in between.
        </SectionTitle>
        <ServiceList nav={nav} />
      </LotusSection>

      <LotusSection className="grid items-center gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <DoctorCard initials={doctor.initials} className="mx-auto w-full max-w-sm lg:max-w-none" />
        <div>
          <Eyebrow>Meet your doctor</Eyebrow>
          <h2 className={`mt-4 ${h2}`}>{doctor.name}</h2>
          <p className="mt-3 text-[15px] text-lotus-text">{doctor.degree}</p>
          <p className="mt-8 max-w-[52ch] text-lg text-lotus-text sm:text-xl">{doctor.intro}</p>
          <p className="mt-4">Speaks {doctor.languages}.</p>
          <LotusLink href={nav.href("about")} className="mt-8">
            About Dr. Rao
          </LotusLink>
        </div>
      </LotusSection>

      <LotusSection>
        <SectionTitle eyebrow="Why Lotus" title="A clinic that makes things easy" />
        <ol className="mt-16 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
          {clinic.why.map((w, i) => (
            <li key={w.title} className="border-t border-lotus-rule pt-6 pb-10">
              <span className="text-sm text-lotus-terracotta tabular-nums">0{i + 1}</span>
              <h3 className="mt-6 text-lg font-medium text-lotus-text">{w.title}</h3>
              <p className="mt-2">{w.text}</p>
            </li>
          ))}
        </ol>
      </LotusSection>

      <LotusSection band>
        <SectionTitle eyebrow="Patient stories" title="What women say about us" />
        <ul className="mt-16 grid gap-12 lg:grid-cols-3 lg:gap-10">
          {clinic.testimonials.map((t) => (
            <li key={t.name} className="flex flex-col">
              <blockquote className="font-lotus-serif text-[1.5rem] leading-[1.3] tracking-[-0.01em] text-lotus-text">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <p className="mt-6 text-sm">
                <span className="font-medium text-lotus-text">{t.name}</span> · {t.area}
              </p>
            </li>
          ))}
        </ul>
      </LotusSection>

      <LotusSection aria-labelledby="visit-heading" rule={false}>
        <SectionTitle eyebrow="Visit us" title="Find the clinic" id="visit-heading">
          Near the Siripuram junction, opposite the city park. Parking in the building.
        </SectionTitle>
        <div className="mt-16">
          <VisitBlock />
        </div>
      </LotusSection>

      <CtaBand nav={nav} />
    </>
  );
}

export function LotusServices({ nav }: { nav: Nav }) {
  return (
    <>
      <PageHead
        eyebrow="Services"
        title="What we treat"
        intro="Every visit starts with time to talk. Then you get a clear plan, written down, with the next step."
      />
      <LotusContainer className="pb-8">
        <ul>
          {clinic.services.map((s) => (
            <li key={s.slug} id={s.slug} className="grid scroll-mt-6 gap-8 border-t border-lotus-rule py-14 sm:py-16 md:grid-cols-[5fr_6fr] md:gap-16">
              <div>
                <h2 className="font-lotus-serif text-[2rem] leading-tight tracking-[-0.02em] text-lotus-text sm:text-4xl">{s.name}</h2>
                <p className="mt-4 max-w-[40ch] text-lg">{s.short}</p>
                <LotusLink href={nav.href("book")} className="mt-6 text-[15px]">
                  Book for {s.name.toLowerCase()}
                </LotusLink>
              </div>
              <ul className="divide-y divide-lotus-rule self-start md:pt-2">
                {s.details.map((d) => (
                  <li key={d} className="py-3.5 text-lotus-text first:pt-0">
                    {d}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </LotusContainer>
      <CtaBand nav={nav} />
    </>
  );
}

export function LotusAbout({ nav }: { nav: Nav }) {
  const { doctor } = clinic;
  return (
    <>
      <PageHead eyebrow="About" title={`Meet ${doctor.name}`} intro={`${doctor.role}. ${doctor.degree}.`} />
      <LotusSection className="grid gap-16 lg:grid-cols-[5fr_7fr] lg:gap-20">
        <div>
          <DoctorCard initials={doctor.initials} className="mx-auto w-full max-w-sm lg:max-w-none" />
          <div className="mx-auto mt-10 max-w-sm lg:max-w-none">
            <p className="text-[15px] font-medium text-lotus-text">Clinic hours</p>
            <ul className="mt-3 divide-y divide-lotus-rule border-y border-lotus-rule text-[15px]">
              {clinic.hours.map((h) => (
                <li key={h.days} className="flex justify-between gap-4 py-3">
                  <span>{h.days}</span>
                  <span className="text-right text-lotus-text">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="max-w-[60ch] space-y-6 text-lg text-lotus-text sm:text-xl sm:leading-relaxed">
            {doctor.bio.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <h2 className="mt-16 font-lotus-serif text-3xl tracking-[-0.02em] text-lotus-text sm:text-4xl">Training and experience</h2>
          <ol className="mt-6 divide-y divide-lotus-rule border-y border-lotus-rule">
            {doctor.milestones.map((m) => (
              <li key={m.year} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
                <p className="text-[15px] tabular-nums">{m.year}</p>
                <p className="text-lotus-text">{m.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10">Speaks {doctor.languages}.</p>
          <LotusButton href={nav.href("book")} className="mt-6">
            Book with Dr. Rao
          </LotusButton>
        </div>
      </LotusSection>
    </>
  );
}

export function LotusContact({ nav }: { nav: Nav }) {
  const rows = [
    { title: "Address", lines: clinic.address },
    { title: "Phone and WhatsApp", lines: [clinic.phone] },
    { title: "Email", lines: [clinic.email] },
    { title: "Hours", lines: clinic.hours.map((h) => `${h.days}: ${h.time}`) },
  ];
  return (
    <>
      <PageHead eyebrow="Contact" title="Visit or message us" intro="We reply on WhatsApp within 2 hours during clinic hours." />
      <LotusSection className="grid gap-14 lg:grid-cols-2 lg:gap-16">
        <div>
          <ul className="divide-y divide-lotus-rule border-b border-lotus-rule">
            {rows.map(({ title, lines }) => (
              <li key={title} className="grid gap-1 py-5 first:pt-0 sm:grid-cols-[11rem_1fr] sm:gap-6">
                <h2 className="text-[15px] font-medium text-lotus-text">{title}</h2>
                <div>
                  {lines.map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <LotusButton href={nav.href("book")} className="mt-10 w-full sm:w-auto">
            Book a visit
          </LotusButton>
        </div>
        <div className="flex flex-col">
          <ClinicMap className="min-h-80 flex-1" />
          <p className="mt-4 text-[15px]">Near the Siripuram junction, opposite the city park. Parking in the building.</p>
          <DirectionsLink className="mt-5 self-start" />
        </div>
      </LotusSection>
    </>
  );
}

export function LotusBook() {
  return (
    <>
      <PageHead
        eyebrow="Book a visit"
        title="Book your visit"
        intro="Choose a clinic visit or an online consultation. We confirm the exact time on WhatsApp."
      />
      <LotusContainer>
        <div className="border-t border-lotus-rule pt-12 pb-24 sm:pt-16 sm:pb-32">
          <Suspense fallback={<BookingForm />}>
            <BookingFormFromUrl />
          </Suspense>
        </div>
      </LotusContainer>
    </>
  );
}

/** The clinic's private page: bookings from the website. Not in the site nav. */
export function LotusAdmin({ nav }: { nav: Nav }) {
  return (
    <>
      <section>
        <LotusContainer className="pt-14 pb-12 sm:pt-20 sm:pb-14">
          <Eyebrow>Clinic staff</Eyebrow>
          <h1 className="mt-4 font-lotus-serif text-[2.4rem] leading-[1.05] tracking-[-0.025em] text-lotus-text sm:text-5xl">Clinic dashboard</h1>
          <p className="mt-4 max-w-[56ch] text-lg">Bookings from the website, today and upcoming. New requests appear within seconds.</p>
        </LotusContainer>
      </section>
      <LotusContainer>
        <div className="border-t border-lotus-rule pt-10 pb-24 sm:pt-12">
          <AdminApp bookHref={nav.href("book")} />
        </div>
      </LotusContainer>
    </>
  );
}
