import { CalendarCheck, Clock, Mail, MapPin, MessageCircle, Phone, Quote } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { DoctorCard, HeroArt, MapArt } from "./Art";
import { BookingForm, BookingFormFromUrl } from "./BookingForm";
import { clinic } from "./data";
import { Eyebrow, LotusButton, LotusContainer, type Nav } from "./LotusSite";

function PageHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <section className="bg-lotus-sand">
      <LotusContainer className="py-14 sm:py-20">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 max-w-3xl font-lotus text-4xl leading-tight font-semibold text-lotus-ink sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg">{intro}</p>
      </LotusContainer>
    </section>
  );
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-lotus text-3xl leading-tight font-semibold text-lotus-ink sm:text-4xl">{title}</h2>
      {children ? <p className="mt-4 text-lg">{children}</p> : null}
    </div>
  );
}

function ServiceCards({ nav }: { nav: Nav }) {
  return (
    <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {clinic.services.map((s) => (
        <li key={s.slug} className="flex flex-col rounded-3xl bg-white p-7 ring-1 ring-lotus-line">
          <span aria-hidden className="size-3 rounded-full bg-lotus-rose" />
          <h3 className="mt-5 font-lotus text-2xl font-semibold text-lotus-ink">{s.name}</h3>
          <p className="mt-2">{s.short}</p>
          <Link href={`${nav.href("services")}#${s.slug}`} className="mt-auto pt-6 font-semibold text-lotus-teal hover:underline">
            Learn more →
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CtaBand({ nav }: { nav: Nav }) {
  return (
    <section className="bg-lotus-teal text-white">
      <LotusContainer className="flex flex-col items-start gap-6 py-14 sm:py-16 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-lotus text-3xl font-semibold sm:text-4xl">Book your visit today</h2>
          <p className="mt-2 text-lg text-white/90">At the clinic or online. We confirm on WhatsApp within 2 hours.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <LotusButton href={nav.href("book")} variant="light">
            <CalendarCheck aria-hidden className="size-5" />
            Book a visit
          </LotusButton>
          <LotusButton href={nav.href("contact")} className="ring-2 ring-white">
            <Phone aria-hidden className="size-5" />
            {clinic.phone}
          </LotusButton>
        </div>
      </LotusContainer>
    </section>
  );
}

export function LotusHome({ nav }: { nav: Nav }) {
  const { doctor } = clinic;
  return (
    <>
      <section className="bg-lotus-sand">
        <LotusContainer className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <Eyebrow>Women&apos;s clinic in {clinic.city}</Eyebrow>
            <h1 className="mt-4 font-lotus text-[2.6rem] leading-[1.08] font-semibold text-lotus-ink sm:text-6xl">
              Expert care for women, at every stage of life.
            </h1>
            <p className="mt-5 max-w-xl text-lg sm:text-xl">
              {doctor.name}, {doctor.degree}, sees women at the clinic in Siripuram and online.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LotusButton href={nav.href("book")}>
                <CalendarCheck aria-hidden className="size-5" />
                Book a visit
              </LotusButton>
              <LotusButton href={`${nav.href("book")}?type=online`} variant="outline">
                <MessageCircle aria-hidden className="size-5" />
                Online consultation
              </LotusButton>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
              {clinic.stats.map((s) => (
                <div key={s.label}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-lotus text-3xl font-semibold text-lotus-teal">{s.value}</dd>
                  <dd className="mt-1 text-sm leading-snug">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mx-auto w-full max-w-md lg:max-w-none">
            <HeroArt />
          </div>
        </LotusContainer>
      </section>

      <section>
        <LotusContainer className="py-16 sm:py-24">
          <SectionTitle eyebrow="Services" title="Care for every stage">
            From the first period to menopause, and every pregnancy in between.
          </SectionTitle>
          <ServiceCards nav={nav} />
        </LotusContainer>
      </section>

      <section className="bg-white">
        <LotusContainer className="grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <DoctorCard initials={doctor.initials} className="mx-auto w-full max-w-sm" />
          <div>
            <SectionTitle eyebrow="Meet your doctor" title={doctor.name} />
            <p className="mt-2 font-semibold text-lotus-ink">{doctor.degree}</p>
            <p className="mt-5 text-lg">{doctor.intro}</p>
            <p className="mt-3">Speaks {doctor.languages}.</p>
            <LotusButton href={nav.href("about")} variant="outline" className="mt-8">
              About Dr. Rao
            </LotusButton>
          </div>
        </LotusContainer>
      </section>

      <section>
        <LotusContainer className="py-16 sm:py-24">
          <SectionTitle eyebrow="Why Lotus" title="A clinic that makes things easy" />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {clinic.why.map((w, i) => (
              <li key={w.title} className="rounded-3xl bg-lotus-mint p-7">
                <span className="font-lotus text-2xl font-semibold text-lotus-teal">0{i + 1}</span>
                <h3 className="mt-4 text-lg font-bold text-lotus-ink">{w.title}</h3>
                <p className="mt-2">{w.text}</p>
              </li>
            ))}
          </ul>
        </LotusContainer>
      </section>

      <section className="bg-lotus-sand">
        <LotusContainer className="py-16 sm:py-24">
          <SectionTitle eyebrow="Patient stories" title="What women say about us" />
          <ul className="mt-10 grid gap-5 lg:grid-cols-3">
            {clinic.testimonials.map((t) => (
              <li key={t.name} className="flex flex-col rounded-3xl bg-white p-7">
                <Quote aria-hidden className="size-7 text-lotus-rose" />
                <blockquote className="mt-4 text-lg text-lotus-ink">{t.quote}</blockquote>
                <p className="mt-auto pt-6 text-sm">
                  <span className="font-semibold text-lotus-ink">{t.name}</span> · {t.area}
                </p>
              </li>
            ))}
          </ul>
        </LotusContainer>
      </section>

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
      <LotusContainer className="py-16 sm:py-20">
        <ul className="space-y-5">
          {clinic.services.map((s) => (
            <li key={s.slug} id={s.slug} className="scroll-mt-6 rounded-3xl bg-white p-7 ring-1 ring-lotus-line sm:p-9">
              <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:gap-10">
                <div>
                  <h2 className="font-lotus text-3xl font-semibold text-lotus-ink">{s.name}</h2>
                  <p className="mt-3 text-lg">{s.short}</p>
                  <LotusButton href={nav.href("book")} variant="outline" className="mt-6 px-5 py-2.5 text-sm">
                    Book for {s.name.toLowerCase()}
                  </LotusButton>
                </div>
                <ul className="space-y-3 self-center">
                  {s.details.map((d) => (
                    <li key={d} className="flex items-start gap-3">
                      <span aria-hidden className="mt-2 size-2 shrink-0 rounded-full bg-lotus-teal" />
                      <span className="text-lotus-ink">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
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
      <LotusContainer className="grid gap-12 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <DoctorCard initials={doctor.initials} className="mx-auto w-full max-w-sm" />
          <div className="mx-auto mt-6 max-w-sm rounded-3xl bg-white p-6 ring-1 ring-lotus-line">
            <p className="font-semibold text-lotus-ink">Clinic hours</p>
            <ul className="mt-3 space-y-2 text-sm">
              {clinic.hours.map((h) => (
                <li key={h.days} className="flex justify-between gap-4">
                  <span>{h.days}</span>
                  <span className="text-right font-semibold text-lotus-ink">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className="space-y-5 text-lg">
            {doctor.bio.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <h2 className="mt-12 font-lotus text-3xl font-semibold text-lotus-ink">Training and experience</h2>
          <ol className="mt-6 space-y-5 border-l-2 border-lotus-line pl-6">
            {doctor.milestones.map((m) => (
              <li key={m.year} className="relative">
                <span aria-hidden className="absolute top-1.5 -left-[31px] size-3.5 rounded-full bg-lotus-teal ring-4 ring-lotus-cream" />
                <p className="text-sm font-semibold text-lotus-teal">{m.year}</p>
                <p className="text-lg text-lotus-ink">{m.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10">Speaks {doctor.languages}.</p>
          <LotusButton href={nav.href("book")} className="mt-6">
            <CalendarCheck aria-hidden className="size-5" />
            Book with Dr. Rao
          </LotusButton>
        </div>
      </LotusContainer>
    </>
  );
}

export function LotusContact({ nav }: { nav: Nav }) {
  const rows = [
    { Icon: MapPin, title: "Address", lines: clinic.address },
    { Icon: Phone, title: "Phone and WhatsApp", lines: [clinic.phone] },
    { Icon: Mail, title: "Email", lines: [clinic.email] },
    { Icon: Clock, title: "Hours", lines: clinic.hours.map((h) => `${h.days}: ${h.time}`) },
  ];
  return (
    <>
      <PageHead eyebrow="Contact" title="Visit or message us" intro="We reply on WhatsApp within 2 hours during clinic hours." />
      <LotusContainer className="grid gap-10 py-16 sm:py-20 lg:grid-cols-2">
        <ul className="space-y-4">
          {rows.map(({ Icon, title, lines }) => (
            <li key={title} className="flex gap-4 rounded-3xl bg-white p-6 ring-1 ring-lotus-line">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-lotus-mint text-lotus-teal">
                <Icon className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold text-lotus-ink">{title}</h2>
                {lines.map((l) => (
                  <p key={l} className="mt-0.5">
                    {l}
                  </p>
                ))}
              </div>
            </li>
          ))}
          <li>
            <LotusButton href={nav.href("book")} className="w-full sm:w-auto">
              <CalendarCheck aria-hidden className="size-5" />
              Book a visit
            </LotusButton>
          </li>
        </ul>
        <div>
          <div className="overflow-hidden rounded-3xl ring-1 ring-lotus-line">
            <MapArt />
          </div>
          <p className="mt-3 text-sm">Near the Siripuram junction, opposite the city park. Parking in the building.</p>
        </div>
      </LotusContainer>
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
      <LotusContainer className="py-12 sm:py-16">
        <Suspense fallback={<BookingForm />}>
          <BookingFormFromUrl />
        </Suspense>
      </LotusContainer>
    </>
  );
}
