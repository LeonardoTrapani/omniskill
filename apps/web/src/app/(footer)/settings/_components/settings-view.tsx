"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Laptop,
  Loader2,
  Lock,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/auth-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun, description: "Classic bright interface" },
  { value: "dark", label: "Dark", icon: Moon, description: "Focused low-light canvas" },
  { value: "system", label: "System", icon: Laptop, description: "Match your device settings" },
] as const;

const SETTINGS_TABS = [
  { id: "account", label: "Account", icon: User, shortcut: "1" },
  { id: "appearance", label: "Appearance", icon: Sun, shortcut: "2" },
  { id: "security", label: "Security", icon: ShieldCheck, shortcut: "3" },
  { id: "danger", label: "Danger", icon: Trash2, shortcut: "4" },
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

interface SettingsViewProps {
  userName: string;
  userEmail: string;
}

export default function SettingsView({ userName, userEmail }: SettingsViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedTheme = mounted ? (theme ?? "system") : "system";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "U";

  const activeTabMeta = useMemo(
    () => SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0],
    [activeTab],
  );

  const handleSignOut = async () => {
    if (signOutPending) return;
    setSignOutPending(true);
    try {
      await authClient.signOut({
        fetchOptions: { onSuccess: () => router.push("/") },
      });
    } finally {
      setSignOutPending(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deletePending) return;
    setDeletePending(true);
    try {
      const result = await authClient.deleteUser({ callbackURL: "/" });
      if (result.error) {
        toast.error(result.error.message || "Failed to delete account");
        return;
      }
      toast.success("Your account has been deleted");
      router.push("/");
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setDeletePending(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-background lg:h-[calc(100dvh-52px)] lg:min-h-0 lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_70%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_70%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-20" />

      <div className="relative mx-auto h-full max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="flex h-full min-h-[calc(100dvh-5rem)] flex-col gap-5 lg:min-h-0 lg:grid lg:grid-cols-[290px_1fr] lg:gap-6">
          <aside className="border border-border bg-background/90 backdrop-blur-sm lg:min-h-0 lg:overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
                Workspace
              </p>
              <h1 className="mt-1 text-xl font-semibold text-foreground">Settings</h1>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Configure your account, theme, and security preferences.
              </p>
            </div>

            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-muted text-xs font-semibold text-foreground">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                  <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </div>
            </div>

            <nav className="px-3 py-3" aria-label="Settings sections">
              <div className="grid gap-1.5">
                {SETTINGS_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = tab.id === activeTab;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center justify-between border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "border-primary/35 bg-primary/8 text-foreground"
                          : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary/35 hover:text-foreground"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="size-3.5" aria-hidden="true" />
                        <span className="text-[12px] font-medium">{tab.label}</span>
                      </span>
                      <span className="border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {tab.shortcut}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          <section className="min-h-0 border border-border bg-background/92 backdrop-blur-sm">
            <div className="border-b border-border px-5 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                <span>workspace</span>
                <span className="text-border">/</span>
                <span>settings</span>
                <span className="text-border">/</span>
                <span className="text-foreground">{activeTabMeta.label.toLowerCase()}</span>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-6 lg:h-[calc(100dvh-180px)]">
              {activeTab === "account" ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Account</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your signed-in workspace identity and active session.
                    </p>
                  </div>

                  <div className="border border-border bg-card px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center border border-border bg-muted text-sm font-semibold text-foreground">
                        {userInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                        <p className="break-all text-xs text-muted-foreground">{userEmail}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border border-border bg-card px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <LogOut
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Session</p>
                        <p className="text-xs text-muted-foreground">Sign out from this browser.</p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0 gap-2"
                      onClick={handleSignOut}
                      disabled={signOutPending}
                    >
                      {signOutPending ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      ) : null}
                      Sign Out
                    </Button>
                  </div>
                </div>
              ) : null}

              {activeTab === "appearance" ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose how Better Skills looks on this device.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {THEME_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = option.value === selectedTheme;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setTheme(option.value)}
                          className={`flex flex-col items-start gap-3 border px-4 py-4 text-left transition-colors ${
                            isSelected
                              ? "border-primary/35 bg-primary/7"
                              : "border-border bg-card hover:bg-secondary/35"
                          }`}
                        >
                          <span
                            className={`inline-flex size-8 items-center justify-center border ${
                              isSelected
                                ? "border-primary/35 bg-primary/10 text-primary"
                                : "border-border bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            <Icon className="size-4" aria-hidden="true" />
                          </span>

                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{option.label}</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                              {option.description}
                            </p>
                          </div>

                          <div
                            className={`inline-flex size-5 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 text-transparent"
                            }`}
                          >
                            <Check className="size-3" aria-hidden="true" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {activeTab === "security" ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Security</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Protect your account with stronger authentication controls.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4 border border-border bg-card px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Lock
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            Password
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              Soon
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Change your account password.
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" disabled>
                        Change
                      </Button>
                    </div>

                    <div className="flex items-center justify-between gap-4 border border-border bg-card px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <ShieldCheck
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            Two-Factor
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              Soon
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Require a second verification step.
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" disabled>
                        Enable
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeTab === "danger" ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Danger Zone</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Permanently remove your account and private workspace data.
                    </p>
                  </div>

                  <div className="border border-destructive/35 bg-destructive/6 px-5 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Delete account</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          This action cannot be undone. All private skills and settings will be
                          lost.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="shrink-0 gap-2"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently removes your account and cannot be undone. You will lose
              access to your private skills and workspace settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={handleDeleteAccount}
            >
              {deletePending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
