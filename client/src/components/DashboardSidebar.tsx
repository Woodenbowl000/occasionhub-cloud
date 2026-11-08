"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Clock,
  Compass,
  Heart,
  LayoutGrid,
  LogOut,
  MessagesSquare,
  Moon,
  Sun,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/app/(auth)/authProvider";
import { useTheme } from "@/hooks/useTheme";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; icon: LucideIcon };

const userLinks: NavLink[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/bookings", label: "My Bookings", icon: CalendarDays },
  { href: "/dashboard/negotiations", label: "Negotiations", icon: MessagesSquare },
  { href: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

const vendorLinks: NavLink[] = [
  { href: "/vendor", label: "Dashboard", icon: LayoutGrid },
  { href: "/vendor/venues", label: "My Venues", icon: Building2 },
  { href: "/vendor/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/vendor/conversations", label: "Negotiations", icon: MessagesSquare },
];

const adminLinks: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/vendors", label: "Vendors", icon: Users },
  { href: "/admin/venues", label: "All Venues", icon: Building2 },
  { href: "/admin/pending-venues", label: "Pending Venues", icon: Clock },
  { href: "/admin/bookings", label: "All Bookings", icon: CalendarDays },
  { href: "/admin/users", label: "Users", icon: User },
  { href: "/admin/applications", label: "Applications", icon: ClipboardList },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  // Seeded vendors have role VENDOR; approved applicants keep role USER.
  // Both carry isVendor, which is what the vendor layout checks too.
  const isVendor = !isAdmin && !!user?.isVendor;
  const links = isAdmin ? adminLinks : isVendor ? vendorLinks : userLinks;
  const home = isAdmin ? "/admin" : isVendor ? "/vendor" : "/dashboard";
  const title = isAdmin ? "Admin Dashboard" : isVendor ? "Vendor Dashboard" : "My Dashboard";

  useEffect(() => setOpen(false), [pathname]);

  // Exact match for section roots, prefix match for nested pages
  const isActive = (href: string) =>
    href === home ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);

  const logout = () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/signin";
    }
  };

  const content = (layoutGroup: string) => (
    <>
      <div className="px-6 pb-6 pt-7">
        <Logo href={home} />
        <p className="mt-3 font-display text-sm uppercase tracking-[0.12em] text-lime/70">{title}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3" data-lenis-prevent>
        <p className="note px-3 pb-2 pt-2 text-base text-lime/60">where to?</p>
        <ul className="space-y-0.5">
          {links.map((link) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-full px-4 py-2.5 font-display text-[17px] uppercase tracking-[0.04em] transition-colors duration-300",
                    active ? "text-forest" : "text-lime/75 hover:text-lime"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={`sidebar-active-${layoutGroup}`}
                      className="absolute inset-0 -rotate-1 rounded-full border-2 border-forest bg-lime shadow-[3px_4px_0_0_#082608]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  {!active && (
                    <span className="absolute inset-0 rounded-full bg-lime/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  )}
                  <Icon className="relative h-[18px] w-[18px] shrink-0" />
                  <span className="relative">{link.label}</span>
                  {active && (
                    <span className="relative ml-auto h-2 w-2 rounded-full bg-forest" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-1 border-t-2 border-dashed border-lime/25 p-3">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-lime/75 transition-colors hover:bg-lime/10 hover:text-lime"
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        {/* Show Browse Venues only for regular users, not vendors or admins */}
        {!isAdmin && !user?.isVendor && (
          <Link
            href="/venues"
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-lime/75 transition-colors hover:bg-lime/10 hover:text-lime"
          >
            <Compass className="h-[18px] w-[18px]" />
            Browse Venues
          </Link>
        )}

        <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-lime/30 bg-forest-light p-3">
          <span className="grid h-10 w-10 shrink-0 -rotate-6 place-items-center rounded-full border-2 border-forest bg-tangerine font-display text-sm uppercase text-forest">
            {(user?.name || "?").slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-lime">{user?.name}</p>
            <p className="truncate text-xs text-lime/60">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Logout"
            title="Logout"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lime/70 transition-colors hover:bg-bubblegum hover:text-forest"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-forest text-lime lg:flex">
        {content("desktop")}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-20 items-center justify-between border-b-[3px] border-forest bg-lime px-4 lg:hidden">
        <Logo href={home} />
        <button
          onClick={() => setOpen(true)}
          className="btn h-10 border-forest bg-forest px-5 py-0 text-lime"
          aria-label="Open menu"
          aria-expanded={open}
        >
          Menu
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-xs flex-col bg-forest text-lime shadow-2xl lg:hidden"
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-6 grid h-9 w-9 place-items-center rounded-full border-2 border-lime text-lime"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
              {content("mobile")}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
