"use client";

import { useEffect, useState } from "react";
import { Laptop, Loader2, Lock, LogOut, Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
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
import { Separator } from "@/components/ui/separator";
import PageHeroCard from "@/components/page-hero-card";

/* ------------------------------------------------------------------ */
/*  Setting Row                                                        */
/*  Left: label + description. Right: control.                         */
/*  Two columns on md+, stacked on mobile.                             */
/* ------------------------------------------------------------------ */
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 pl-4 md:grid-cols-[280px_1fr] md:gap-8">
      <div className="min-w-0">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Theme options                                                      */
/* ------------------------------------------------------------------ */
type ThemeOption = {
  value: "light" | "dark" | "system";
  label: string;
  icon: typeof Sun;
  description: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "Bright interface with strong contrast.",
  },
  { value: "dark", label: "Dark", icon: Moon, description: "Lower glare in dim environments." },
  { value: "system", label: "System", icon: Laptop, description: "Follow your device preference." },
];

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
export default function SettingsView() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? (theme ?? "system") : "system";
  const userName = session?.user.name ?? "Unnamed user";
  const userEmail = session?.user.email ?? "No email";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "U";

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
    <main className="relative min-h-screen overflow-hidden px-4 py-7 sm:px-6 lg:px-0">
      <div className="relative mx-auto max-w-5xl space-y-8">
        <PageHeroCard
          eyebrow="Workspace Preferences"
          title="Settings"
          description="Manage your account details, security, and appearance."
        />

        {/* ---- Account ---- */}
        <SettingRow
          title="Account"
          description="Your signed-in workspace identity. Connected through your authentication provider."
        >
          <div className="space-y-3">
            <div className="border border-border bg-card px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center bg-muted text-xs font-semibold text-foreground">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                  <p className="break-all text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <div className="flex items-center justify-between gap-4 border border-border bg-card px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <LogOut className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">Session</p>
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
        </SettingRow>

        <Separator />

        {/* ---- Security ---- */}
        <SettingRow
          title="Security"
          description="Protect your account with additional verification and control active sessions."
        >
          <div className="space-y-3">
            {/* Change Password */}
            <div className="flex items-center justify-between gap-4 border border-border bg-card px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Password
                    <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                      Soon
                    </Badge>
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled
                aria-label="Change password (coming soon)"
              >
                Change
              </Button>
            </div>

            {/* 2FA */}
            <div className="flex items-center justify-between gap-4 border border-border bg-card px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <ShieldCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Two-Factor
                    <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                      Soon
                    </Badge>
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled
                aria-label="Enable two-factor auth (coming soon)"
              >
                Enable
              </Button>
            </div>
          </div>
        </SettingRow>

        <Separator />

        {/* ---- Danger Zone ---- */}
        <SettingRow
          title="Delete Account"
          description="Permanently remove your account and all associated private data. This action cannot be undone."
        >
          <div className="flex items-center justify-between gap-4 border border-destructive/30 bg-destructive/5 px-5 py-3.5">
            <p className="text-xs text-muted-foreground text-pretty">
              All private skills and workspace settings will be lost.
            </p>
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
        </SettingRow>
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
