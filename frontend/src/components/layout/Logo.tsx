import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 36, className }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Shram"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-xl object-contain", className)}
      priority
    />
  );
}
