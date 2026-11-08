"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { FadeIn, RevealLines, Slap } from "@/components/motion/Reveal";
import { PhotoSticker, ScribbleNote, Tape, VenueRoll } from "@/components/fun/Craft";

interface AuthShellProps {
  eyebrow: string;
  title: React.ReactNode[];
  subtitle?: React.ReactNode;
  image: string;
  quote: string;
  children: React.ReactNode;
}

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  image,
  quote,
  children,
}: AuthShellProps) {
  return (
    <div className="grid min-h-[100svh] bg-background lg:grid-cols-[1.05fr_1fr]">
      {/* Collage panel */}
      <aside className="relative hidden overflow-hidden bg-lime p-10 text-forest lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <RevealLines
          as="h2"
          immediate
          className="relative z-[2] mt-10 font-display text-[clamp(3.5rem,6.5vw,6.5rem)] uppercase leading-[0.86]"
          lines={quote.split("|")}
        />
        <div className="relative h-[46%]">
          <Slap immediate delay={0.4} className="absolute bottom-0 left-0 w-[58%]">
            <PhotoSticker src={image} tilt={-6} className="aspect-[4/3]" tape="top" />
          </Slap>
          <Slap immediate delay={0.6} className="absolute bottom-[18%] right-[4%] w-[36%]">
            <div className="animate-spin-slow">
              <VenueRoll id="auth" title="Occasion Hub" subtitle="Book by the day" color="tangerine" />
            </div>
          </Slap>
          <ScribbleNote className="absolute right-[6%] top-0 text-forest">
            your next big day starts here.
          </ScribbleNote>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link
            href="/landing"
            className="group flex items-center gap-2 font-display text-sm uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-bounce group-hover:-translate-x-1" />
            Back home
          </Link>
          <Logo className="lg:hidden" />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
          <FadeIn immediate>
            <span className="rounded-xl bg-forest px-3 py-1 font-display text-xs uppercase tracking-[0.12em] text-lime">
              {eyebrow}
            </span>
          </FadeIn>
          <RevealLines
            as="h1"
            immediate
            delay={0.1}
            className="mt-6 font-display text-[clamp(3.25rem,7vw,5rem)] uppercase leading-[0.88]"
            lines={title}
          />
          {subtitle && (
            <FadeIn immediate delay={0.3} className="note mt-3 text-xl text-muted-foreground">
              {subtitle}
            </FadeIn>
          )}
          <Slap immediate delay={0.35} from={-6} className="mt-10">
            <div className="relative rounded-[1.75rem] border-[3px] border-forest bg-card p-6 shadow-sticker sm:p-8 dark:border-lime">
              <Tape className="-top-4 right-8" tilt={6} />
              {children}
            </div>
          </Slap>
        </div>
      </main>
    </div>
  );
}

export function FormNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-2xl border-2 border-forest bg-lime/30 px-4 py-3 text-sm font-medium text-foreground dark:border-lime"
    >
      {children}
    </div>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-2xl border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
    >
      {children}
    </div>
  );
}
