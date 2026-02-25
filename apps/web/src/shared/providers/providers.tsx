"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { queryClient } from "@/shared/api/trpc";
import { Toaster } from "@/components/ui/sonner";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  const shouldShowDevtools = process.env.NODE_ENV === "development";

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        {shouldShowDevtools ? <ReactQueryDevtools /> : null}
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
