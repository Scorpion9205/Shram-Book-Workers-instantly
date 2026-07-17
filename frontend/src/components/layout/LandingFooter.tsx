import Link from "next/link";
import { Briefcase, AtSign, Globe, Send } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
                S
              </div>
              <span className="text-lg font-bold">SHRAM</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              India's smart labour hiring platform.
            </p>
            <div className="mt-4 flex gap-3">
              {[Send, Globe, AtSign].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground">About</Link></li>
              <li><Link href="#" className="hover:text-foreground">Careers</Link></li>
              <li><Link href="#" className="hover:text-foreground">Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">For You</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/signup" className="hover:text-foreground">Become a Worker</Link></li>
              <li><Link href="/signup" className="hover:text-foreground">Hire Workers</Link></li>
              <li><Link href="/login" className="hover:text-foreground">Log In</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground">Terms</Link></li>
              <li><Link href="#" className="hover:text-foreground">Privacy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p className="flex items-center gap-1.5">
            <Briefcase className="size-3.5" /> © {new Date().getFullYear()} SHRAM. All rights reserved.
          </p>
          <p>Made with care, for India's workforce.</p>
        </div>
      </div>
    </footer>
  );
}
