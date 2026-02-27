"use client";

import dynamic from "next/dynamic";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/lib/api/trpc";
import { Toaster } from "@/components/ui/sonner";

import { ThemeProvider } from "./theme-provider";
import { Analytics } from "@vercel/analytics/next";

const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then(
      (mod) => mod.ReactQueryDevtools,
    ),
  { ssr: false },
);

export default function Providers({ children }: { children: React.ReactNode }) {
  const shouldShowDevtools = process.env.NODE_ENV === "development";

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        {shouldShowDevtools ? <ReactQueryDevtools /> : null}
        <Analytics />
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
