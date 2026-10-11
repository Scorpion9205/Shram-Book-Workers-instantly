"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { ProfileMenu } from "./ProfileMenu";
import { useAppDispatch } from "@/hooks/redux";
import { usePermission } from "@/hooks/usePermission";
import { setMobileDrawerOpen } from "@/store/uiSlice";
import { GoOnlineButton } from "@/features/worker/components/GoOnlineButton";

export function Navbar({ title }: { title?: string }) {
  const dispatch = useAppDispatch();
  const { isWorker } = usePermission();

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

      <div className="ml-auto flex items-center justify-end gap-2">
        {isWorker && <GoOnlineButton />}
        <ThemeToggle />
        <NotificationBell />
        <ProfileMenu />
      </div>
    </header>
  );
}
