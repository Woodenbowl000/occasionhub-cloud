"use client";

/* Collage building blocks: tape, photo stickers, venue "rolls", notes. */

import { cn } from "@/lib/utils";

export function Tape({
  className,
  tilt = -6,
}: {
  className?: string;
  tilt?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn("tape", className)}
      style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
    />
  );
}

/** Rounded photo with a thick border, offset shadow, tilt and a strip of tape. */
export function PhotoSticker({
  src,
  alt = "",
  tilt = 0,
  className,
  imgClassName,
  tape = "top",
  shadow = "lime",
}: {
  src: string;
  alt?: string;
  tilt?: number;
  className?: string;
  imgClassName?: string;
  tape?: "top" | "corner" | "none";
  shadow?: "lime" | "ink";
}) {
  return (
    <div
      className={cn("relative", className)}
      style={{ "--tilt": `${tilt}deg`, transform: `rotate(${tilt}deg)` } as React.CSSProperties}
    >
      {tape === "top" && <Tape className="-top-4 left-1/2 -ml-10 sm:-ml-14" tilt={-4 - tilt / 2} />}
      {tape === "corner" && <Tape className="-left-6 -top-2" tilt={-38} />}
      <div
        className={cn(
          "h-full w-full overflow-hidden rounded-[1.75rem] border-[3px] border-forest",
          shadow === "lime" ? "shadow-sticker-lime" : "shadow-sticker"
        )}
      >
        <img src={src} alt={alt} className={cn("h-full w-full object-cover", imgClassName)} />
      </div>
    </div>
  );
}

const ROLL_COLORS = {
  lime: { ring: "#9BE000", face: "#E7FF9C", ink: "#0E3B10" },
  tangerine: { ring: "#FF7A1A", face: "#FFD9B8", ink: "#3D1A00" },
  bubblegum: { ring: "#FF6FAE", face: "#FFD8EA", ink: "#4A0F2A" },
  sky: { ring: "#2A9DF4", face: "#BDE3FF", ink: "#06294A" },
  sunny: { ring: "#F5B800", face: "#FFF1A2", ink: "#3A2A00" },
  violet: { ring: "#6C63FF", face: "#D7D4FF", ink: "#1A1550" },
} as const;

export type RollColor = keyof typeof ROLL_COLORS;

/** Split a label into at most two balanced lines. */
const twoLines = (title: string) => {
  const words = title.split(" ");
  if (words.length < 2) return [title];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
};

/**
 * A round "tape roll" badge: coloured ring, pale face, curved small print,
 * a big label and a barcode. All text lives inside the SVG so the badge
 * scales as one piece at any size.
 */
export function VenueRoll({
  title,
  subtitle,
  ring = "OCCASIONHUB · BOOK BY THE DAY · ",
  color = "lime",
  className,
  id,
}: {
  title: string;
  subtitle?: string;
  ring?: string;
  color?: RollColor;
  className?: string;
  id: string;
}) {
  const c = ROLL_COLORS[color];
  const lines = twoLines(title.toUpperCase());
  const size = lines.length === 1 ? 30 : 25;
  // Anton glyphs average ~0.46em wide; squeeze anything wider than the face
  const fit = (text: string, fontSize: number, max: number) => {
    const est = text.length * fontSize * 0.46;
    return est > max ? { textLength: max, lengthAdjust: "spacingAndGlyphs" as const } : {};
  };
  const firstY = lines.length === 1 ? 104 : 92;

  return (
    <div className={cn("relative aspect-square select-none", className)}>
      <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-[6px_8px_0_rgba(14,59,16,0.85)]">
        <defs>
          <path id={`ring-${id}`} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="98" fill={c.ring} />
        <circle cx="100" cy="100" r="68" fill={c.face} />
        {/* hang-tab cut-out */}
        <path d="M84 40 Q100 26 116 40 Q108 46 100 46 Q92 46 84 40Z" fill={c.ring} opacity="0.9" />
        {/* Stretched to exactly one lap (2π·78 ≈ 490) so the print meets itself cleanly */}
        <text fill={c.ink} className="font-display" style={{ fontSize: 10 }}>
          <textPath href={`#ring-${id}`} textLength="488" lengthAdjust="spacing">
            {ring.repeat(2)}
          </textPath>
        </text>
        <g transform="rotate(-6 100 100)" fill={c.ink} className="font-display" textAnchor="middle">
          {lines.map((line, i) => (
            <text key={i} x="100" y={firstY + i * (size * 0.92)} style={{ fontSize: size }} {...fit(line, size, 112)}>
              {line}
            </text>
          ))}
          {subtitle && (
            <text
              x="100"
              y={firstY + (lines.length - 1) * (size * 0.92) + 15}
              style={{ fontSize: 9, letterSpacing: 1 }}
              opacity="0.8"
              {...fit(subtitle.toUpperCase(), 9, 100)}
            >
              {subtitle.toUpperCase()}
            </text>
          )}
          {/* barcode */}
          <g transform="translate(79 136)">
            {[0, 3, 5, 9, 11, 14, 18, 20, 23, 27, 29, 33, 36, 38, 41].map((x, i) => (
              <rect key={i} x={x} y={0} width={i % 3 === 0 ? 2 : 1.2} height={12} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Handwritten note with a drawn corner bracket. */
export function ScribbleNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative pl-6 pt-5", className)}>
      <svg aria-hidden viewBox="0 0 160 110" className="absolute left-0 top-0 h-[110px] w-[160px] overflow-visible">
        <path d="M2 18 L158 2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M22 -4 L26 108" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
      <p className="note relative max-w-[13rem] -rotate-6">{children}</p>
    </div>
  );
}

/** Yellow sticky note with a binder clip and a hand-written checklist. */
export function StickyNote({
  title,
  items,
  className,
  tilt = -4,
}: {
  title: string;
  items: string[];
  className?: string;
  tilt?: number;
}) {
  return (
    <div
      className={cn("relative w-64 bg-sunny p-6 pb-8 text-[#3a2a00] shadow-lift", className)}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <Tape className="-top-4 left-12" tilt={-3} />
      <h4 className="font-display text-3xl uppercase leading-none">{title}</h4>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="note flex items-center gap-2 border-b border-dashed border-[#3a2a00]/40 pb-1 text-base">
            <span className="h-3 w-3 rounded-full border-[1.5px] border-current" />
            {item}
          </li>
        ))}
      </ul>
      {/* binder clip */}
      <svg aria-hidden viewBox="0 0 60 60" className="absolute -bottom-6 -left-5 h-16 w-16 -rotate-[25deg]">
        <path d="M14 30 L30 4 L46 30" fill="none" stroke="#9ca3af" strokeWidth="4" strokeLinejoin="round" />
        <rect x="8" y="28" width="44" height="26" rx="4" fill="#d1d5db" stroke="#6b7280" strokeWidth="2" />
        <rect x="8" y="28" width="44" height="7" fill="#9ca3af" />
      </svg>
    </div>
  );
}

/**
 * Curved edge that makes the next section look like it bulges into this one.
 * Place at the top or bottom of a section; `color` is the neighbouring fill.
 */
export function ArcEdge({
  color,
  position = "bottom",
  depth = "6vw",
  className,
}: {
  color: string;
  position?: "top" | "bottom";
  depth?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-[-10%] z-[1]",
        position === "bottom" ? "bottom-0 translate-y-[1px]" : "top-0 -translate-y-[1px]",
        className
      )}
      style={{
        height: depth,
        background: color,
        borderRadius:
          position === "bottom" ? "50% 50% 0 0 / 100% 100% 0 0" : "0 0 50% 50% / 0 0 100% 100%",
      }}
    />
  );
}
