import type { Metadata } from "next";

import { Fira_Mono, Geist } from "next/font/google";

import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import { getSkillCount } from "@/lib/get-skill-count";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const firaMono = Fira_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-fira-mono",
});

export const metadata: Metadata = {
  title: "BETTER-SKILLS - The Open Agent Skills Ecosystem",
  description:
    "BETTER-SKILLS lets you build, share, and manage a graph of reusable skills for your AI agents. Connect your CLI and web app to a powerful skill marketplace.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const skillCount = await getSkillCount();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${geistSans.variable} ${firaMono.variable} antialiased`}
      >
        <Providers>
          <Navbar skillCount={skillCount} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
