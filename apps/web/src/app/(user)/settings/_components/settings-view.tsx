"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

/* ------------------------------------------------------------------ */
/*  Section shell — mirrors the GitHub settings card pattern            */
/* ------------------------------------------------------------------ */
function Section({
  icon,
  title,
  description,
  children,
  variant = "default",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  const borderColor = variant === "danger" ? "border-destructive/30" : "border-border";

  return (
    <div className={`border ${borderColor} bg-background`}>
      <div className={`border-b ${borderColor} px-5 py-5 space-y-2`}>
        <div className="flex items-center gap-2.5">
          {icon}
          <h2
            className={`text-sm font-semibold uppercase font-mono ${variant === "danger" ? "text-destructive" : "text-foreground"}`}
          >
            {title}
          </h2>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row — a single setting item inside a section                       */
/* ------------------------------------------------------------------ */
function Row({
  children,
  borderVariant = "default",
}: {
  children: React.ReactNode;
  borderVariant?: "default" | "danger";
}) {
  const border = borderVariant === "danger" ? "border-destructive/20" : "border-border";
  return (
    <div className={`flex items-center justify-between gap-4 border ${border} px-5 py-3.5`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
interface SettingsViewProps {
  userName: string;
  userEmail: string;
}

export default function SettingsView({ userName, userEmail }: SettingsViewProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedTheme = mounted ? (theme ?? "system") : "system";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "U";
  const userImage = session?.user.image;

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
    <main className="relative min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Page header */}
        <header className="mb-8">
          <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-primary">
            Workspace Preferences
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account, appearance, and security.
          </p>
        </header>

        <div className="space-y-6">
          {/* ── Account ── */}
          <Section
            icon={<User className="size-4 text-muted-foreground" aria-hidden="true" />}
            title="Account"
            description="Your signed-in identity. Connected through your authentication provider."
          >
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {userImage ? (
                  <span className="size-11 shrink-0 overflow-hidden rounded-full border border-border/70 bg-muted/40">
                    <Image
                      src={userImage}
                      alt={userName}
                      width={44}
                      height={44}
                      className="size-full object-cover"
                      unoptimized
                    />
                  </span>
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted text-sm font-semibold text-muted-foreground select-none">
                    {userInitial}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                  <p className="break-all text-xs font-mono text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              <div className="border-t border-dashed border-border" />

              <Row>
                <div className="flex items-center gap-3 min-w-0">
                  <LogOut className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm text-foreground">Sign out</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={handleSignOut}
                  disabled={signOutPending}
                >
                  {signOutPending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : null}
                  Sign out
                </Button>
              </Row>
            </div>
          </Section>

          {/* ── Appearance ── */}
          <Section
            icon={<Sun className="size-4 text-muted-foreground" aria-hidden="true" />}
            title="Appearance"
            description="Choose how Better Skills looks on this device."
          >
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
                    className={`group flex items-center gap-3 border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <span
                      className={`inline-flex size-8 shrink-0 items-center justify-center transition-colors ${
                        isSelected
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>

                    <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                      {option.label}
                    </span>

                    <span
                      className={`flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/25 text-transparent"
                      }`}
                    >
                      <Check className="size-2.5" aria-hidden="true" />
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Security ── */}
          <Section
            icon={<ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />}
            title="Security"
            description="Protect your account with additional verification."
          >
            <div className="space-y-3">
              <Row>
                <div className="flex items-center gap-3 min-w-0">
                  <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      Password
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Soon
                      </Badge>
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled>
                  Change
                </Button>
              </Row>

              <Row>
                <div className="flex items-center gap-3 min-w-0">
                  <ShieldCheck
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">
                      Two-Factor Authentication
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Soon
                      </Badge>
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled>
                  Enable
                </Button>
              </Row>
            </div>
          </Section>

          {/* ── Danger Zone ── */}
          <Section
            icon={<Trash2 className="size-4 text-destructive/70" aria-hidden="true" />}
            title="Danger Zone"
            description="Irreversible actions that affect your entire account."
            variant="danger"
          >
            <Row borderVariant="danger">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Delete account</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Permanently remove your account and all private data. This cannot be undone.
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
            </Row>
          </Section>
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
              {deletePending ? "Deleting\u2026" : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
