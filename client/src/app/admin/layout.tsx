"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../(auth)/authProvider";
import DashboardSidebar from "@/components/DashboardSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/signin");
      } else if (user?.role !== "ADMIN") {
        if (user?.isVendor) {
          router.push("/vendor");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [isAuthenticated, loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary"></div>
      </div>
    );
  }

  // Only admins can access
  if (!isAuthenticated || user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <DashboardSidebar />
      <main className="dash-main min-w-0 flex-1">{children}</main>
    </div>
  );
}
