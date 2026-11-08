"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./(auth)/authProvider";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const { user } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/landing");
      } else if (user?.role === "ADMIN") {
        router.push("/admin");
      } else if (user?.isVendor) {
        router.push("/vendor");
      } else {
        router.push("/venues");
      }
    }
  }, [loading, isAuthenticated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
