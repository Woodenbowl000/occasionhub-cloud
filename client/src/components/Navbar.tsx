"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/app/(auth)/authProvider";
import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";
import Logo from "@/components/Logo";
import { ScribbleNote, Tape } from "@/components/fun/Craft";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { user, signout, isAuthenticated } = useAuth();
  const { theme, toggleTheme, mounted } = useTheme();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // The landing hero is lime in both themes, so the bar uses fixed colours there
  const onLime = pathname === "/landing";

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isCustomer = isAuthenticated && user?.role !== "ADMIN" && !user?.isVendor;
  const links: { href: string; label: string }[] = !isAuthenticated
    ? [
        { href: "/landing", label: "Home" },
        { href: "/venues", label: "Venues" },
        { href: "/signup", label: "Join" },
      ]
    : isCustomer
    ? [
        { href: "/venues", label: "Browse Venues" },
        { href: "/dashboard", label: "My Dashboard" },
        { href: "/become-vendor", label: "Become a Vendor" },
      ]
    : [
        { href: "/venues", label: "Venues" },
        { href: user?.role === "ADMIN" ? "/admin" : "/vendor", label: "Dashboard" },
      ];

  const roleBadge =
    user?.role === "ADMIN" ? "Admin" : user?.isVendor ? "Vendor" : null;

  return (
    <>
      <header className={cn("relative z-40", onLime && "text-forest")}>
        <nav className="mx-auto flex h-24 max-w-[1440px] items-center justify-between gap-4 px-5 pr-36 sm:px-8 sm:pr-40 lg:px-12 lg:pr-44">
          <Logo />

          <ul className="hidden items-center gap-10 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "group flex flex-col items-center font-display text-xl uppercase tracking-[0.04em] transition-colors",
                      onLime
                        ? active
                          ? "text-forest"
                          : "text-forest/70 hover:text-forest"
                        : active
                        ? "text-foreground"
                        : "text-foreground/70 hover:text-foreground"
                    )}
                  >
                    {link.label}
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full bg-current transition-transform duration-300 ease-bounce",
                        active ? "scale-100" : "scale-0 group-hover:scale-100"
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden items-center gap-3 lg:flex">
            {mounted && (
              <button
                onClick={toggleTheme}
                className={cn("h-11 w-11 px-0 py-0", onLime ? "btn border-forest bg-paper text-forest" : "btn-ghost")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            {isAuthenticated ? (
              <button onClick={signout} className={cn("h-11 px-5 py-0", onLime ? "btn border-forest bg-paper text-forest" : "btn-ghost")}>
                Sign Out
              </button>
            ) : (
              <>
                <Link href="/signin" className={cn("h-11 px-5 py-0", onLime ? "btn border-forest bg-paper text-forest" : "btn-ghost")}>
                  Sign In
                </Link>
                <Link href="/signup" className={cn("h-11 px-5 py-0", onLime ? "btn border-forest bg-forest text-lime" : "btn-accent")}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* "PULL ME" ribbon: always reachable menu trigger */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        className="group fixed right-4 top-0 z-[80] sm:right-8"
      >
        <span
          className="flex h-[5.5rem] w-28 flex-col items-center justify-center bg-paper pb-4 text-forest shadow-[0_6px_14px_rgba(8,38,8,0.25)] transition-[height] duration-500 ease-bounce group-hover:h-[6.75rem]"
          style={{
            clipPath:
              "polygon(0 0,100% 0,100% 100%,88% 88%,76% 100%,64% 88%,52% 100%,40% 88%,28% 100%,16% 88%,0 100%)",
          }}
        >
          <span className="mb-2 w-[84%] border-t-[3px] border-dotted border-forest" />
          <span className="font-display text-xl uppercase leading-none tracking-[0.02em]">
            {menuOpen ? "Close" : "Pull me"}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            data-lenis-prevent
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[70] overflow-y-auto bg-lime text-forest"
          >
            <div className="mx-auto flex min-h-full max-w-[1440px] flex-col justify-between gap-12 px-6 pb-10 pt-28 sm:px-10 lg:px-14">
              <ul className="space-y-1">
                {links.map((link, i) => (
                  <li key={link.href} className="overflow-hidden">
                    <motion.div
                      initial={{ y: "105%", rotate: 4 }}
                      animate={{ y: 0, rotate: 0 }}
                      transition={{ delay: 0.25 + i * 0.07, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={link.href}
                        className="group flex items-baseline gap-5 font-display text-[clamp(3.5rem,11vw,9rem)] uppercase leading-[0.9]"
                      >
                        <span className="text-lg">0{i + 1}</span>
                        <span className="transition-transform duration-500 ease-bounce group-hover:translate-x-4 group-hover:-rotate-2">
                          {link.label}
                        </span>
                      </Link>
                    </motion.div>
                  </li>
                ))}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"
              >
                <ScribbleNote className="text-forest">where to next? pick a room, any room.</ScribbleNote>

                <div className="flex flex-wrap items-center gap-3">
                  {mounted && (
                    <button onClick={toggleTheme} className="btn border-forest bg-paper text-forest" aria-label="Toggle theme">
                      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {theme === "dark" ? "Light" : "Dark"}
                    </button>
                  )}
                  {isAuthenticated ? (
                    <>
                      <span className="relative rounded-2xl border-[3px] border-forest bg-paper px-4 py-2 font-display uppercase">
                        <Tape className="-top-4 left-4 h-6 w-16" tilt={-8} />
                        {user?.name}
                        {roleBadge ? ` · ${roleBadge}` : ""}
                      </span>
                      <button onClick={signout} className="btn border-forest bg-forest text-lime">
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/signin" className="btn border-forest bg-paper text-forest">
                        Sign In
                      </Link>
                      <Link href="/signup" className="btn border-forest bg-forest text-lime">
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
