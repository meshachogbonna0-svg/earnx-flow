import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
const logoAsset = { url: "/earnx-eagle-logo.png" };

/** EarnX-Finance official logo lockup. Fixed brand identity. */
export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link to="/" className={cn("flex items-center", className)} aria-label="EarnX-Finance home">
      <img
        src={logoAsset.url}
        alt="EarnX-Finance logo"
        width={640}
        height={494}
        className={cn("w-auto shrink-0 object-contain", compact ? "h-8" : "h-10 sm:h-11")}
      />
    </Link>
  );
}
