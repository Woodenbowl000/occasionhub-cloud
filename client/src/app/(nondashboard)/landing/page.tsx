"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/app/(auth)/authProvider";
import { FadeIn, Marquee, RevealLines, Slap } from "@/components/motion/Reveal";
import {
  ArcEdge,
  PhotoSticker,
  ScribbleNote,
  StickyNote,
  Tape,
  VenueRoll,
  type RollColor,
} from "@/components/fun/Craft";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const img = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const PHOTOS = {
  corporate: "1540575467063-178a50c2df87",
  birthday: "1511578314322-379afb476865",
  outdoor: "1505236858219-8359eb29e329",
  banquet: "1464366400600-7168b8af9bc3",
  terrace: "1517457373958-b7bdd4587205",
  dining: "1414235077428-338989a2e8c0",
  stage: "1501281668745-f7f57925c3b4",
  table: "1511795409834-ef04bbd61622",
  aisle: "1469371670807-013ccf25f16a",
  confetti: "1492684223066-81342ee5ff30",
  balloons: "1530103862676-de8c9debad1d",
  rings: "1465495976277-4387d4b0b4c6",
};

const rolls: { title: string; sub: string; color: RollColor; x: string; y: string; size: string }[] = [
  { title: "Banquet Halls", sub: "Weddings · galas", color: "sunny", x: "2%", y: "4%", size: "clamp(9rem,17vw,15rem)" },
  { title: "Conference", sub: "Meetings · launches", color: "sky", x: "30%", y: "-2%", size: "clamp(8rem,15vw,13rem)" },
  { title: "Rooftops", sub: "City views", color: "bubblegum", x: "70%", y: "2%", size: "clamp(8rem,15vw,13rem)" },
  { title: "Outdoor", sub: "Gardens · lawns", color: "lime", x: "8%", y: "56%", size: "clamp(8rem,15vw,13rem)" },
  { title: "Restaurants", sub: "Private dining", color: "tangerine", x: "38%", y: "50%", size: "clamp(9rem,16vw,14rem)" },
  { title: "Galleries", sub: "Art & launches", color: "violet", x: "72%", y: "54%", size: "clamp(8rem,15vw,13rem)" },
];

const reasons = [
  {
    word: ["To", "Gather"],
    note: "boardrooms, birthdays & everything in between.",
    photos: [PHOTOS.corporate, PHOTOS.terrace],
    roll: { title: "Conference", color: "sky" as RollColor },
  },
  {
    word: ["To", "Party"],
    note: "the room that makes the night.",
    photos: [PHOTOS.confetti, PHOTOS.balloons],
    roll: { title: "Rooftop", color: "bubblegum" as RollColor },
  },
  {
    word: ["To", "Say I do"],
    note: "aisles, arches & the first dance.",
    photos: [PHOTOS.aisle, PHOTOS.rings],
    roll: { title: "Banquet", color: "sunny" as RollColor },
  },
];

const steps = [
  { n: "01", title: "Find", body: "Browse rooms on the map. Filter by city, guests and budget.", color: "bg-sky" },
  { n: "02", title: "Haggle", body: "Pick a theme & seating, then make an offer. Vendors can counter.", color: "bg-bubblegum" },
  { n: "03", title: "Party", body: "Pay securely, lock the date, and keep it all in your dashboard.", color: "bg-sunny" },
];

const stats = [
  { value: "500+", label: "Venues" },
  { value: "10K+", label: "Happy hosts" },
  { value: "50+", label: "Cities" },
  { value: "4.8★", label: "Avg. rating" },
];

const LOADER_WORDS = ["Gather", "Celebrate", "Toast", "Book it"];

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */

function Preloader({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [word, setWord] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setWord((w) => (w + 1) % LOADER_WORDS.length), 380);
    return () => window.clearInterval(id);
  }, []);

  useGSAP(
    () => {
      gsap
        .timeline({ onComplete: onDone })
        .fromTo(".pl-roll", { scale: 0, rotate: -220 }, { scale: 1, rotate: 0, duration: 1, ease: "back.out(1.6)" })
        .to(".pl-roll", { rotate: 360, duration: 0.8, ease: "power2.in" }, "+=0.35")
        .to(
          ref.current,
          { clipPath: "ellipse(140% 0% at 50% 0%)", duration: 0.9, ease: "expo.inOut" },
          "-=0.15"
        );
    },
    { scope: ref }
  );

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-8 bg-lime text-forest"
      style={{ clipPath: "ellipse(140% 140% at 50% 0%)" }}
    >
      <div className="pl-roll w-44 sm:w-56">
        <VenueRoll id="preloader" title="Occasion Hub" subtitle="Book by the day" color="lime" />
      </div>
      <p className="text-center font-display text-4xl uppercase sm:text-6xl">
        We&apos;re here to <span className="inline-block min-w-[5ch] text-left">{LOADER_WORDS[word]}</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const [showPreloader, setShowPreloader] = useState(false);
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("oh_preloaded") === "1";
      sessionStorage.setItem("oh_preloaded", "1");
    } catch {}
    if (seen || reduced()) setReady(true);
    else setShowPreloader(true);
  }, []);

  // Scroll-linked collage motion: parallax, spin and sliding mega-words
  useGSAP(
    () => {
      if (!rootRef.current || reduced()) return;
      gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
        const speed = Number(el.dataset.speed);
        gsap.fromTo(
          el,
          { y: () => speed * 120 },
          {
            y: () => speed * -120,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
          }
        );
      });
      gsap.utils.toArray<HTMLElement>("[data-spin]").forEach((el) => {
        gsap.fromTo(
          el,
          { rotate: -Number(el.dataset.spin) },
          {
            rotate: Number(el.dataset.spin),
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          }
        );
      });
      gsap.utils.toArray<HTMLElement>("[data-slide]").forEach((el) => {
        gsap.fromTo(
          el,
          { xPercent: Number(el.dataset.slide) },
          {
            xPercent: -Number(el.dataset.slide),
            ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
          }
        );
      });
    },
    { scope: rootRef }
  );

  const primaryCta = isAuthenticated
    ? user?.role !== "ADMIN" && user?.isVendor
      ? { href: "/vendor", label: "Go to Dashboard" }
      : { href: "/venues", label: "Browse Venues" }
    : { href: "/signup", label: "Get Started" };

  return (
    <div ref={rootRef} className="overflow-x-clip">
      {showPreloader && (
        <Preloader
          onDone={() => {
            setReady(true);
            setShowPreloader(false);
          }}
        />
      )}

      {/* ------------------------------------------------ Hero (lime) */}
      <section className="relative -mt-24 bg-lime pb-[16vw] pt-32 text-forest">
        <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="flex justify-center">
            <span className="relative rounded-xl bg-forest px-4 py-1.5 font-display text-sm uppercase tracking-[0.12em] text-lime">
              Venue booking, made fun · now on AWS
            </span>
          </div>

          <div className="relative mt-8">
            <RevealLines
              as="h1"
              immediate
              play={ready}
              delay={0.1}
              className="relative z-[2] text-center font-display uppercase leading-[0.84] text-forest"
              lineClassName="text-[clamp(4.2rem,15.5vw,15rem)]"
              lines={["Find a room", "for every", "occasion."]}
            />

            {/* stickers slapped over the headline */}
            {ready && (
              <>
                <Slap immediate delay={0.7} className="absolute -left-2 top-[4%] z-[3] hidden w-[17%] sm:block">
                  <PhotoSticker src={img(PHOTOS.balloons, 500)} tilt={-9} className="aspect-[4/5]" tape="corner" />
                </Slap>
                <Slap immediate delay={0.85} className="absolute -top-20 right-0 z-[3] w-[24%] sm:right-[1%] sm:top-[30%] sm:w-[19%]">
                  <div data-spin="25">
                    <VenueRoll id="hero" title="Book by the day" subtitle="Rs · PKR" color="tangerine" />
                  </div>
                </Slap>
                <Slap immediate delay={1} className="absolute bottom-[-6%] left-[14%] z-[3] hidden w-[20%] md:block">
                  <PhotoSticker src={img(PHOTOS.table, 600)} tilt={7} className="aspect-[5/4]" />
                </Slap>
              </>
            )}
          </div>

          <FadeIn immediate delay={1.1} className="relative z-[4] mt-12 flex flex-col items-center gap-6 text-center">
            <p className="note max-w-md text-2xl text-forest">
              discover &amp; book amazing event spaces for conferences, weddings, parties and more.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={primaryCta.href} className="btn border-forest bg-forest text-lime">
                {primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated && (
                <Link href="/signin" className="btn border-forest bg-paper text-forest">
                  Sign In
                </Link>
              )}
            </div>
          </FadeIn>
        </div>
        <ArcEdge color="#0E3B10" position="bottom" depth="12vw" />
      </section>

      {/* ------------------------------------------------ Collage (forest) */}
      <section className="relative bg-forest pb-40 pt-16 text-lime">
        <div className="relative mx-auto grid max-w-[1440px] gap-16 px-5 sm:px-8 md:grid-cols-12 lg:px-12">
          <div className="relative min-h-[34rem] md:col-span-5">
            <Slap className="relative z-[2] ml-4 w-fit">
              <StickyNote title="Event to-do" items={["find the venue", "haggle the price", "book & pay", "throw the party"]} />
            </Slap>
            <ScribbleNote className="mt-14 text-lime">we built it for the days that matter.</ScribbleNote>
            <div data-speed="0.6" className="absolute -bottom-10 -left-10 w-[85%]">
              <PhotoSticker src={img(PHOTOS.dining, 900)} tilt={-12} className="aspect-[4/3]" tape="top" />
            </div>
          </div>

          <div className="relative md:col-span-7">
            <div data-speed="-0.25" className="kraft relative -rotate-2 rounded-sm p-8 shadow-lift sm:p-12">
              <span className="absolute -top-6 left-[18%] h-[115%] w-16 bg-[rgba(220,235,200,0.35)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]" />
              <Tape className="-top-5 right-10" tilt={4} />
              <p className="relative font-display text-[clamp(2.6rem,5.6vw,5.5rem)] uppercase leading-[0.9] text-kraft-dark">
                Weddings, board meetings, surprise birthdays, last-minute galas. We always find you a room.
              </p>
            </div>
            <div data-speed="0.9" className="relative ml-auto mt-10 w-[70%] sm:w-[55%]">
              <PhotoSticker src={img(PHOTOS.birthday, 900)} tilt={8} className="aspect-square" tape="corner" />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Crossing marquees */}
      <section className="relative z-[5] -mt-28 h-60 overflow-hidden">
        <div className="absolute inset-x-[-5%] top-10 -rotate-3 border-y-[3px] border-forest bg-lime py-4 text-forest">
          <Marquee duration={28}>
            {[...Array(4)].map((_, i) => (
              <span key={i} className="flex items-center whitespace-nowrap px-6 font-display text-4xl uppercase sm:text-5xl">
                When the date is set, the room has to be right
                <span className="mx-6 inline-block h-5 w-5 rounded-full bg-tangerine" />
              </span>
            ))}
          </Marquee>
        </div>
        <div className="absolute inset-x-[-5%] top-28 rotate-2 border-y-[3px] border-forest bg-tangerine py-3 text-forest">
          <Marquee duration={34} reverse>
            {["Banquet halls", "Rooftops", "Gardens", "Galleries", "Hotels", "Theaters", "Restaurants"].map((t) => (
              <span key={t} className="flex items-center whitespace-nowrap px-6 font-display text-3xl uppercase">
                {t}
                <span className="ml-12 text-2xl">✺</span>
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      {/* ------------------------------------------------ Venue rolls (paper) */}
      <section className="relative overflow-hidden bg-background pb-32 pt-10">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col items-center text-center">
            <span className="rounded-xl bg-forest px-4 py-1.5 font-display text-sm uppercase tracking-[0.12em] text-lime">
              The rooms
            </span>
            <RevealLines
              as="h2"
              className="mt-6 font-display text-[clamp(3.25rem,9vw,8.5rem)] uppercase leading-[0.86]"
              lines={["Pick your", <span key="r" className="italic">roll.</span>]}
            />
            <p className="note mt-4 text-xl text-muted-foreground">every kind of room, all in one place.</p>
          </div>

          <div className="relative mt-16 h-[44rem] sm:h-[36rem] lg:h-[40rem]">
            <span
              aria-hidden
              data-slide="8"
              className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center font-display text-[clamp(8rem,30vw,28rem)] uppercase leading-none text-foreground/[0.08]"
            >
              Rooms
            </span>
            {rolls.map((r, i) => (
              <Link
                key={r.title}
                href="/venues"
                className="group absolute"
                style={{ left: r.x, top: r.y, width: r.size }}
              >
                <Slap delay={i * 0.06} from={i % 2 ? 20 : -20}>
                  <div data-spin={String(10 + i * 4)}>
                    <div className="transition-transform duration-500 ease-bounce group-hover:-translate-y-2 group-hover:scale-110">
                      <VenueRoll id={`roll-${i}`} title={r.title} subtitle={r.sub} color={r.color} />
                    </div>
                  </div>
                </Slap>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <Link href="/venues" className="btn-primary">
              Explore all venues <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Why we exist (lime) */}
      <section className="relative overflow-hidden bg-lime pb-32 pt-[14vw] text-forest">
        <ArcEdge color="hsl(var(--background))" position="top" depth="10vw" />
        <div className="mx-auto flex max-w-[1440px] flex-col items-center px-5 text-center sm:px-8 lg:px-12">
          <span className="rounded-xl bg-forest px-4 py-1.5 font-display text-sm uppercase tracking-[0.12em] text-lime">
            Why we exist
          </span>
          <RevealLines
            as="h2"
            className="mt-6 font-display text-[clamp(2.75rem,6.5vw,6rem)] uppercase leading-[0.88]"
            lines={["We're here for", "the big days &", "the small ones."]}
          />
        </div>

        <div className="mt-24 space-y-36">
          {reasons.map((r, i) => (
            <div key={r.word.join(" ")} className="relative">
              <div
                data-slide={i % 2 ? "-6" : "6"}
                className="whitespace-nowrap text-center font-display text-[clamp(7rem,24vw,22rem)] uppercase leading-[0.8] text-forest"
              >
                {r.word[0]} {r.word[1]}
              </div>
              <div className="pointer-events-none absolute inset-0 mx-auto max-w-[1440px]">
                <div data-speed="0.5" className={cn("absolute top-[-14%] w-[34%] sm:w-[22%]", i % 2 ? "left-[8%]" : "left-[36%]")}>
                  <Slap>
                    <PhotoSticker src={img(r.photos[0], 700)} tilt={i % 2 ? 8 : -7} className="aspect-[4/5]" tape="top" />
                  </Slap>
                </div>
                <div data-speed="-0.4" className={cn("absolute top-[30%] w-[28%] sm:w-[17%]", i % 2 ? "right-[30%]" : "right-[8%]")}>
                  <Slap delay={0.1}>
                    <PhotoSticker src={img(r.photos[1], 600)} tilt={i % 2 ? -10 : 9} className="aspect-square" tape="corner" />
                  </Slap>
                </div>
                <div data-spin="30" className={cn("absolute top-[48%] w-[26%] sm:w-[14%]", i % 2 ? "right-[2%]" : "left-[2%]")}>
                  <VenueRoll id={`why-${i}`} title={r.roll.title} subtitle="Book by the day" color={r.roll.color} />
                </div>
                <ScribbleNote className={cn("absolute -top-24 hidden text-forest md:block", i % 2 ? "right-[12%]" : "left-[10%]")}>
                  {r.note}
                </ScribbleNote>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ Steps as ticket stubs */}
      <section className="relative bg-background py-32">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col items-center text-center">
            <span className="rounded-xl bg-forest px-4 py-1.5 font-display text-sm uppercase tracking-[0.12em] text-lime">
              How it works
            </span>
            <RevealLines
              as="h2"
              className="mt-6 font-display text-[clamp(3rem,8vw,7.5rem)] uppercase leading-[0.86]"
              lines={["Three steps to", <span key="b" className="italic">party time.</span>]}
            />
          </div>

          <div className="mt-20 grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <Slap key={s.n} delay={i * 0.12} from={i % 2 ? 12 : -12}>
                <div
                  className={cn(
                    "relative flex min-h-[22rem] flex-col justify-between rounded-[1.75rem] border-[3px] border-forest p-7 text-forest shadow-sticker transition-transform duration-500 ease-bounce hover:-translate-y-2",
                    s.color
                  )}
                  style={{ rotate: `${[-3, 2, -1.5][i]}deg` }}
                >
                  {/* perforated stub line */}
                  <span className="absolute inset-x-6 top-[5.5rem] border-t-[3px] border-dashed border-forest/60" />
                  <span className="absolute -left-[13px] top-[4.85rem] h-6 w-6 rounded-full border-[3px] border-forest bg-background" />
                  <span className="absolute -right-[13px] top-[4.85rem] h-6 w-6 rounded-full border-[3px] border-forest bg-background" />
                  <div className="flex items-start justify-between">
                    <span className="font-display text-sm uppercase tracking-[0.14em]">Admit one</span>
                    <span className="font-display text-5xl leading-none">{s.n}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-6xl uppercase leading-none sm:text-7xl">{s.title}</h3>
                    <p className="mt-3 text-[15px] font-medium leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </Slap>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Stats (forest) */}
      <section className="relative overflow-hidden bg-forest pb-16 pt-24 text-lime">
        <ArcEdge color="hsl(var(--background))" position="top" depth="6vw" />
        <div className="relative mx-auto grid max-w-[1440px] grid-cols-2 gap-8 px-5 pt-8 sm:px-8 md:grid-cols-4 lg:px-12">
          {stats.map((s, i) => (
            <Slap key={s.label} delay={i * 0.08} className="flex justify-center">
              <div
                className="grid aspect-square w-full max-w-[15rem] place-items-center rounded-full border-[3px] border-lime bg-forest-light text-center shadow-sticker-lime"
                style={{ rotate: `${[-6, 4, -3, 7][i]}deg` }}
              >
                <div>
                  <div className="font-display text-[clamp(3rem,7vw,5.5rem)] leading-none">{s.value}</div>
                  <div className="note mt-1 text-lg text-lime/85">{s.label}</div>
                </div>
              </div>
            </Slap>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ CTA */}
      <section className="relative overflow-hidden bg-tangerine pb-[9vw] pt-28 text-forest">
        <ArcEdge color="#0E3B10" position="top" depth="7vw" />
        <div className="relative mx-auto max-w-[1440px] px-5 text-center sm:px-8 lg:px-12">
          <RevealLines
            as="h2"
            className="font-display text-[clamp(3.5rem,12vw,12rem)] uppercase leading-[0.84]"
            lines={["Let's make", "it happen!"]}
          />
          <div data-speed="0.4" className="mx-auto -mt-6 w-[70%] max-w-xl">
            <PhotoSticker src={img(PHOTOS.stage, 1100)} tilt={-3} className="aspect-[16/10]" tape="top" shadow="ink" />
          </div>
          <p className="note mx-auto mt-10 max-w-md text-2xl">
            join thousands of event planners who trust OccasionHub.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href={isAuthenticated ? "/venues" : "/signup"}
              className="btn border-forest bg-forest px-10 py-5 text-xl text-lime"
            >
              {isAuthenticated ? "Start Browsing Venues" : "Sign Up — It's Free"}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer arcColor="#FF7A1A" />
    </div>
  );
}
