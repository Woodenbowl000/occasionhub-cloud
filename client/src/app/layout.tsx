import type { Metadata } from "next";
import { Anton, Inter_Tight, Nothing_You_Could_Do } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./(auth)/authProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import SmoothScroll from "@/components/motion/SmoothScroll";

const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const hand = Nothing_You_Could_Do({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OccasionHub - Book Your Perfect Venue",
  description: "Find and book the perfect venue for your next event",
};

// Applies the saved/system theme before first paint so there is no flash.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${hand.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
        <SmoothScroll />
        {/* Crumpled-paper texture over everything */}
        <div
          aria-hidden
          className="paper-texture pointer-events-none fixed inset-0 z-[90] opacity-[0.32] dark:opacity-[0.5]"
        />
      </body>
    </html>
  );
}
