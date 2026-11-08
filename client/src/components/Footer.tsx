"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { RevealLines } from "@/components/motion/Reveal";
import { ArcEdge, ScribbleNote, VenueRoll, type RollColor } from "@/components/fun/Craft";

const navLinks = [
  { label: "Venues", href: "/venues" },
  { label: "Sign In", href: "/signin" },
  { label: "Sign Up", href: "/signup" },
  { label: "Become a Vendor", href: "/become-vendor" },
];

const rolls: { title: string; sub: string; color: RollColor; x: string; y: string; size: string; tilt: number }[] = [
  { title: "Banquet Hall", sub: "Up to 1,000 guests", color: "tangerine", x: "4%", y: "16%", size: "clamp(8rem,15vw,13rem)", tilt: -12 },
  { title: "Rooftop", sub: "Golden hour ready", color: "sky", x: "26%", y: "48%", size: "clamp(7rem,13vw,11rem)", tilt: 9 },
  { title: "Garden", sub: "Open-air & fresh", color: "lime", x: "58%", y: "8%", size: "clamp(8rem,14vw,12rem)", tilt: -6 },
  { title: "Gallery", sub: "Art on every wall", color: "bubblegum", x: "76%", y: "44%", size: "clamp(7rem,13vw,11rem)", tilt: 14 },
];

export default function Footer({
  arcColor = "hsl(var(--background))",
}: {
  /** Fill of the section above, so the arc blends into it */
  arcColor?: string;
}) {
  const playRef = useRef<HTMLDivElement>(null);

  return (
    <footer className="relative overflow-hidden bg-forest text-lime">
      <ArcEdge color={arcColor} position="top" depth="7vw" />

      <div className="relative mx-auto max-w-[1440px] px-5 pb-8 pt-[12vw] sm:px-8 lg:px-12">
        <ul className="flex flex-wrap items-start justify-between gap-6">
          {navLinks.map((l) => (
            <li key={l.label}>
              <Link
                href={l.href}
                className="group flex flex-col items-center font-display text-3xl uppercase sm:text-4xl"
              >
                {l.label}
                <span className="mt-1 h-2 w-2 rounded-full bg-lime transition-transform duration-300 ease-bounce group-hover:scale-150" />
              </Link>
            </li>
          ))}
        </ul>

        {/* Playground: drag the venue rolls around */}
        <div ref={playRef} className="relative mt-10 h-[min(46rem,120vw)] sm:h-[34rem]">
          <RevealLines
            as="h2"
            className="pointer-events-none absolute inset-x-0 top-[18%] text-center font-display text-[clamp(4.5rem,17vw,16rem)] leading-[0.82] text-lime"
            lines={["See you", "there."]}
          />
          {rolls.map((r, i) => (
            <motion.div
              key={r.title}
              drag
              dragConstraints={playRef}
              dragElastic={0.15}
              dragTransition={{ bounceStiffness: 300, bounceDamping: 14 }}
              whileHover={{ scale: 1.06, rotate: r.tilt + 6 }}
              whileDrag={{ scale: 1.12, rotate: r.tilt - 8, cursor: "grabbing" }}
              initial={{ rotate: r.tilt }}
              className="absolute cursor-grab touch-none"
              style={{ left: r.x, top: r.y, width: r.size }}
            >
              <VenueRoll id={`footer-${i}`} title={r.title} subtitle={r.sub} color={r.color} />
            </motion.div>
          ))}
          <ScribbleNote className="absolute bottom-6 left-2 text-lime/90 sm:left-6">
            psst, the stickers are draggable.
          </ScribbleNote>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t-2 border-dashed border-lime/30 pt-6 sm:flex-row">
          <p className="rounded-full bg-forest-deep px-4 py-1.5 text-sm text-lime/90">
            &copy; {new Date().getFullYear()} OccasionHub. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-lime/80">
            <Link href="#" className="link-underline">Terms</Link>
            <Link href="#" className="link-underline">Privacy</Link>
            <Link href="#" className="link-underline">Help</Link>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="grid h-12 w-12 place-items-center rounded-full border-[3px] border-lime bg-lime text-forest transition-transform duration-300 ease-bounce hover:-translate-y-1 hover:rotate-12"
              aria-label="Back to top"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
