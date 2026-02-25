import type { Metadata } from "next";

import { Fira_Mono, Geist_Mono, Google_Sans_Code } from "next/font/google";

import "./globals.css";
import Providers from "@/components/providers";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const googleSansCode = Google_Sans_Code({
  subsets: ["latin"],
  variable: "--font-google-sans-code",
});

const firaMono = Fira_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-fira-mono",
});

export const metadata: Metadata = {
  title: "Omniscient - The Open Agent Skills Ecosystem",
  description:
    "Omniscient lets you build, share, and manage a graph of reusable skills for your AI agents. Connect your CLI and web app to a powerful skill marketplace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistMono.variable} ${googleSansCode.variable} ${firaMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
