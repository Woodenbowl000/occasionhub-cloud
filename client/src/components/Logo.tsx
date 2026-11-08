import Link from "next/link";
import { cn } from "@/lib/utils";

/** Blob-shaped sticker wordmark. */
export default function Logo({
  href = "/landing",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="OccasionHub home"
      className={cn(
        "group relative inline-block h-[3.25rem] w-[7.5rem] -rotate-3 transition-transform duration-300 ease-bounce hover:rotate-2 hover:scale-105",
        className
      )}
    >
      <svg viewBox="0 0 200 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <path
          d="M22 9 C62 -3 142 -1 181 11 C199 17 202 41 197 61 C192 82 168 94 119 95 C70 97 21 93 8 74 C-3 57 -2 23 22 9 Z"
          className="fill-forest stroke-lime"
          strokeWidth="5"
        />
      </svg>
      <span className="relative flex h-full flex-col items-center justify-center font-display uppercase leading-[0.82] text-lime">
        <span className="text-[1.05rem] tracking-[0.04em]">Occasion</span>
        <span className="text-[1.35rem] tracking-[0.06em]">Hub</span>
      </span>
    </Link>
  );
}
