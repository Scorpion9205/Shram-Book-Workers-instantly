"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { setMobileDrawerOpen } from "@/store/uiSlice";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/constants/nav";

export function MobileDrawer({ items }: { items: NavItem[] }) {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.mobileDrawerOpen);
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => dispatch(setMobileDrawerOpen(false))}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-card p-4 shadow-soft-lg lg:hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Logo size={36} />
                <span className="text-lg font-bold">SHRAM</span>
              </div>
              <button
                onClick={() => dispatch(setMobileDrawerOpen(false))}
                className="rounded-lg p-1.5 hover:bg-secondary"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => dispatch(setMobileDrawerOpen(false))}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
