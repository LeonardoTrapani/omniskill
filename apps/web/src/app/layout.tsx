import type { Metadata } from "next";

import { Fira_Mono, Geist_Mono, Google_Sans_Code } from "next/font/google";

import "./globals.css";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import { getSkillCount } from "@/lib/get-skill-count";

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
  title: "Omniskill - The Open Agent Skills Ecosystem",
  description:
    "Omniskill lets you build, share, and manage a graph of reusable skills for your AI agents. Connect your CLI and web app to a powerful skill marketplace.",
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
        className={`${geistMono.variable} ${googleSansCode.variable} ${firaMono.variable} antialiased`}
      >
        <Providers>
          <Navbar skillCount={skillCount} />
          {children}
        </Providers>
      </body>
    </html>
  );
}
