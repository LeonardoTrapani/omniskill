"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Command, LogOut, Moon, Search, Settings, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function UserAvatar({
  name,
  image,
  size = "trigger",
}: {
  name: string;
  image?: string | null;
  size?: "trigger" | "menu";
}) {
  const dimensions = size === "trigger" ? "size-7" : "size-8";
  const textSize = size === "trigger" ? "text-[11px]" : "text-xs";
  const imageSize = size === "trigger" ? 28 : 32;

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (image) {
    return (
      <span
        className={`${dimensions} rounded-full border border-border/70 bg-muted/40 overflow-hidden`}
      >
        <Image
          src={image}
          alt={name}
          width={imageSize}
          height={imageSize}
          className="size-full object-cover"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span
      className={`${dimensions} rounded-full bg-muted border border-border/70 flex items-center justify-center ${textSize} font-medium text-muted-foreground select-none`}
    >
      {initials || "?"}
    </span>
  );
}

interface UserMenuProps {
  onOpenCommandPalette?: () => void;
  onSearchVault?: () => void;
}

export default function UserMenu({ onOpenCommandPalette, onSearchVault }: UserMenuProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  if (isPending) {
    return <Skeleton className="h-7 w-7 rounded-full" />;
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

  const userName = session.user.name || "Unnamed";
  const userEmail = session.user.email || "";
  const userImage = session.user.image;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center justify-center outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full"
            aria-label="Open user menu"
          >
            <UserAvatar name={userName} image={userImage} size="trigger" />
          </button>
        }
      >
        <span className="sr-only">Open user menu</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="bg-card w-64" align="end" sideOffset={8}>
        {/* ── Profile section ── */}
        <div className="flex items-center gap-3 px-3 py-3">
          <UserAvatar name={userName} image={userImage} size="menu" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-foreground truncate">{userName}</span>
            <span className="text-[10px] text-muted-foreground font-mono truncate">
              {userEmail}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* ── Navigation section ── */}
        <DropdownMenuGroup className="p-1">
          <DropdownMenuLabel className="uppercase font-mono text-[10px] text-neutral-300">
            Navigation
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onSearchVault?.()}>
            <Search aria-hidden="true" className="text-muted-foreground" />
            Search your vault
            <DropdownMenuShortcut className="text-muted-foreground ml-auto tracking-widest flex items-center gap-0.5 text-[10px] font-mono">
              <Command className="h-2 w-2" />/
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenCommandPalette?.()}>
            <Command className="text-muted-foreground" />
            Command menu
            <DropdownMenuShortcut className="text-muted-foreground ml-auto tracking-widest flex items-center gap-0.5 text-[10px] font-mono">
              <Command className="h-2 w-2" />K
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* ── Preferences section ── */}
        <DropdownMenuGroup className="p-1">
          <DropdownMenuLabel className="uppercase font-mono text-[10px] text-neutral-300">
            Preferences
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={toggleTheme}>
            {isDark ? (
              <Sun aria-hidden="true" className="text-muted-foreground" />
            ) : (
              <Moon aria-hidden="true" className="text-muted-foreground" />
            )}
            {isDark ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.location.assign("/settings")}>
            <Settings aria-hidden="true" className="text-muted-foreground" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* ── Sign out ── */}
        <DropdownMenuGroup className="p-1">
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
