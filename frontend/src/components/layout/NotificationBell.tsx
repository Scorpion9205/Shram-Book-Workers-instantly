"use client";

import { Bell, CheckCheck, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { markAllRead, markOneRead } from "@/store/notificationSlice";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

function groupByDate(items: AppNotification[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, AppNotification[]> = { Today: [], Yesterday: [], Older: [] };
  for (const item of items) {
    const d = new Date(item.createdAt).toDateString();
    if (d === today) groups.Today.push(item);
    else if (d === yesterday) groups.Yesterday.push(item);
    else groups.Older.push(item);
  }
  return groups;
}

const typeColor: Record<string, string> = {
  success: "bg-success",
  warning: "bg-accent",
  error: "bg-destructive",
  info: "bg-primary",
};

export function NotificationBell() {
  const dispatch = useAppDispatch();
  const { items, unreadCount } = useAppSelector((s) => s.notifications);
  const groups = groupByDate(items);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3.5 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={() => dispatch(markAllRead())}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          )}
        </div>
        <div className="h-px bg-border" />
        <ScrollArea className="h-96">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Inbox className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            Object.entries(groups).map(
              ([label, list]) =>
                list.length > 0 && (
                  <div key={label} className="px-1.5 py-1.5">
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">{label}</p>
                    {list.map((notif, idx) => {
                      return (
                        <motion.button
                          key={notif.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => dispatch(markOneRead(notif.id))}
                          className={cn(
                            "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-secondary",
                            !notif.read && "bg-primary/5"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-1.5 size-1.5 shrink-0 rounded-full",
                              typeColor[notif.type] || "bg-primary"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{notif.title}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {notif.message}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )
            )
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
