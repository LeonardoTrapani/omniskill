"use client";

import { useEffect, useState } from "react";
import { Laptop, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import PageHeroCard from "@/components/page-hero-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ThemeOption = {
  value: "light" | "dark" | "system";
  title: string;
  description: string;
  icon: typeof Sun;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    title: "Light",
    description: "Bright interface with strong text contrast.",
    icon: Sun,
  },
  {
    value: "dark",
    title: "Dark",
    description: "Lower glare in dim environments.",
    icon: Moon,
  },
  {
    value: "system",
    title: "System",
    description: "Follow your device appearance preference.",
    icon: Laptop,
  },
];

export default function SettingsView() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { data: session } = authClient.useSession();
  const { theme, resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? (theme ?? "system") : "system";
  const effectiveTheme = mounted ? (resolvedTheme === "dark" ? "dark" : "light") : "system";
  const userName = session?.user.name ?? "Unnamed user";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "U";

  return (
    <main className="relative overflow-hidden px-6 pb-16 pt-12 md:px-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_8%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_70%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_70%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-35" />

      <div className="relative mx-auto grid max-w-[1120px] gap-6">
        <PageHeroCard
          eyebrow="Workspace Preferences"
          title="Settings"
          description="Manage your account details, appearance, and current session from one place."
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="grid gap-6">
            <Card className="bg-background/90">
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Signed-in workspace identity details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-3 border border-border bg-background px-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center border border-border text-xs font-semibold text-foreground">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground break-all">{session?.user.email}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border border-border bg-background px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                      Name
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">{userName}</p>
                  </div>
                  <div className="border border-border bg-background px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                      Email
                    </p>
                    <p className="mt-1 break-all text-sm text-foreground">{session?.user.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/90">
              <CardHeader>
                <CardTitle>Session</CardTitle>
                <CardDescription>Control the active browser session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs leading-5 text-muted-foreground">
                  Signing out removes local session access from this device.
                </p>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => {
                    authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => router.push("/"),
                      },
                    });
                  }}
                >
                  <LogOut className="size-4" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-background/90">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Choose how the interface renders on this device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = mounted && activeTheme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={`w-full border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                      isActive
                        ? "border-primary/50 bg-primary/10"
                        : "border-border bg-background hover:border-primary/30 hover:bg-secondary/60"
                    }`}
                    aria-label={`Use ${option.title} theme`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{option.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground text-pretty">
                          {option.description}
                        </p>
                      </div>
                      <Icon className="mt-0.5 size-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}

              <div className="border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                Effective theme:{" "}
                <span className="text-foreground capitalize">{effectiveTheme}</span>
                {activeTheme === "system" ? " (following system)" : ""}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
