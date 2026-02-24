import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Laptop, LogOut, Moon, Palette, Settings, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export default function UserMenu() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedTheme = mounted ? (theme ?? "system") : "system";
  const resolvedThemeLabel = mounted ? (resolvedTheme === "dark" ? "Dark" : "Light") : "Auto";

  if (isPending) {
    return <Skeleton className="h-8 w-8" />;
  }

  if (!session) {
    return (
      <Link href="/login">
        <Button variant="outline" size="icon" aria-label="Sign in">
          <User aria-hidden="true" />
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" aria-label="Open user menu">
            <User aria-hidden="true" />
          </Button>
        }
      >
        <span className="sr-only">Open user menu</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="bg-card min-w-48 w-auto" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{session.user.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => window.location.assign("/settings")}>
            <Settings aria-hidden="true" />
            Settings
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette aria-hidden="true" />
              Theme
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent className="min-w-32">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = option.value === selectedTheme;

                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    aria-label={`Use ${option.label} theme`}
                  >
                    <Icon aria-hidden="true" />
                    {option.label}
                    {isSelected ? (
                      <Check className="ml-auto text-primary" aria-hidden="true" />
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/");
                  },
                },
              });
            }}
          >
            <LogOut aria-hidden="true" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
