"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* RevealLines: each line slides up from behind a mask                 */
/* ------------------------------------------------------------------ */

interface RevealLinesProps {
  lines: React.ReactNode[];
  as?: "h1" | "h2" | "h3" | "p" | "div";
  className?: string;
  lineClassName?: string;
  /** Animate on mount instead of when scrolled into view. */
  immediate?: boolean;
  /** With `immediate`, hold the animation until this is true. */
  play?: boolean;
  delay?: number;
  stagger?: number;
}

export function RevealLines({
  lines,
  as: Tag = "div",
  className,
  lineClassName,
  immediate = false,
  play = true,
  delay = 0,
  stagger = 0.09,
}: RevealLinesProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ref.current || !play) return;
      const inner = ref.current.querySelectorAll(".reveal-line > span");
      if (prefersReducedMotion()) {
        gsap.set(inner, { y: 0, yPercent: 0 });
        return;
      }
      gsap.fromTo(
        inner,
        { y: 0, yPercent: 115, rotate: 2 },
        {
          y: 0,
          yPercent: 0,
          rotate: 0,
          duration: 1.3,
          ease: "expo.out",
          stagger,
          delay,
          scrollTrigger: immediate
            ? undefined
            : { trigger: ref.current, start: "top 88%", once: true },
        }
      );
    },
    { scope: ref, dependencies: [play] }
  );

  return (
    <Tag ref={ref as React.Ref<never>} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={cn("reveal-line", lineClassName)}>
          <span style={{ transform: "translate3d(0,115%,0)" }}>{line}</span>
        </span>
      ))}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* FadeIn: fades and lifts a block (or its [data-reveal] children)     */
/* ------------------------------------------------------------------ */

interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  /** Animate direct `[data-reveal]` descendants in sequence instead of the wrapper. */
  stagger?: number;
  immediate?: boolean;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  y = 40,
  stagger,
  immediate = false,
  ...rest
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const targets =
        stagger !== undefined
          ? ref.current.querySelectorAll("[data-reveal]")
          : [ref.current];
      if (prefersReducedMotion()) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "expo.out",
          delay,
          stagger: stagger ?? 0,
          clearProps: "transform",
          scrollTrigger: immediate
            ? undefined
            : { trigger: ref.current, start: "top 90%", once: true },
        }
      );
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className} {...rest}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ScrubText: words brighten one by one as the paragraph scrolls past  */
/* ------------------------------------------------------------------ */

export function ScrubText({
  text,
  className,
  highlight = [],
}: {
  text: string;
  className?: string;
  /** Words (case-insensitive, punctuation ignored) rendered in the accent colour. */
  highlight?: string[];
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const marked = new Set(highlight.map((w) => w.toLowerCase()));

  useGSAP(
    () => {
      if (!ref.current) return;
      const words = ref.current.querySelectorAll("[data-word]");
      if (prefersReducedMotion()) {
        gsap.set(words, { opacity: 1 });
        return;
      }
      gsap.fromTo(
        words,
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.1,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 80%",
            end: "bottom 45%",
            scrub: true,
          },
        }
      );
    },
    { scope: ref }
  );

  return (
    <p ref={ref} className={className}>
      {text.split(" ").map((word, i) => (
        <span
          key={i}
          data-word
          className={
            marked.has(word.toLowerCase().replace(/[^a-z]/g, ""))
              ? "italic text-primary"
              : undefined
          }
        >
          {word}{" "}
        </span>
      ))}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Marquee: infinite horizontal loop                                   */
/* ------------------------------------------------------------------ */

export function Marquee({
  children,
  duration = 30,
  reverse = false,
  className,
}: {
  children: React.ReactNode;
  duration?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("group flex overflow-hidden", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center group-hover:[animation-play-state:paused]",
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        )}
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slap: children land like a sticker being slapped on (scale + spin)  */
/* ------------------------------------------------------------------ */

export function Slap({
  children,
  className,
  style,
  delay = 0,
  from = 14,
  immediate = false,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
  /** Extra rotation (deg) it starts with before settling */
  from?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;
      gsap.fromTo(
        ref.current,
        { scale: 1.45, rotate: from, opacity: 0 },
        {
          scale: 1,
          rotate: 0,
          opacity: 1,
          duration: 0.75,
          delay,
          ease: "back.out(2.2)",
          clearProps: "transform",
          scrollTrigger: immediate
            ? undefined
            : { trigger: ref.current, start: "top 88%", once: true },
        }
      );
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
