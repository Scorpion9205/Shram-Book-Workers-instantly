"use client";

import { useState } from "react";
import { Menu, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { ProfileMenu } from "./ProfileMenu";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { setMobileDrawerOpen } from "@/store/uiSlice";
import { GoOnlineButton } from "@/features/worker/components/GoOnlineButton";

export function Navbar({ title }: { title?: string }) {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.user?.role);
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => dispatch(setMobileDrawerOpen(true))}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      {title ? (
        <h1 className="hidden text-lg font-semibold lg:block">{title}</h1>
      ) : (
        <div className="hidden lg:block" />
      )}

      <div className="ml-auto flex max-w-md flex-1 items-center justify-end gap-2 lg:flex-initial">
        <div
          className={`relative hidden flex-1 sm:block ${searchFocused ? "lg:w-72" : "lg:w-56"} transition-all duration-300`}
        >
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search…"
            className="pl-9"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
        {role === "worker" && <GoOnlineButton />}
        <ThemeToggle />
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
