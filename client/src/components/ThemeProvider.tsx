"use client";

import { useTheme } from "@/hooks/useTheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mounted } = useTheme();

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
