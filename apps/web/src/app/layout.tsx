import type { Metadata } from "next";

import { Fira_Mono, Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import Navbar from "@/components/navigation/navbar";
import Providers from "@/providers/providers";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const firaMono = Fira_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-fira-mono",
});

export const metadata: Metadata = {
  title: "BETTER-SKILLS - The Open Agent Skills Ecosystem",
  description:
    "BETTER-SKILLS lets you build and manage a graph of reusable skills for your AI agents. Connect your CLI and web app to your vault.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} ${firaMono.variable} antialiased`}
      >
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
