import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function Chip({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "outline" | "success";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none",
        tone === "default" && "bg-secondary text-secondary-foreground",
        tone === "accent" && "bg-accent text-accent-foreground",
        tone === "outline" && "border border-border bg-card text-muted-foreground",
        tone === "success" && "bg-online/15 text-online",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Ava({
  src,
  alt,
  size = 44,
  online,
  ring,
}: {
  src: string;
  alt: string;
  size?: number;
  online?: boolean;
  ring?: boolean;
}) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn(
          "h-full w-full rounded-full object-cover",
          ring && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      />
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            online ? "bg-online" : "bg-muted-foreground/60",
          )}
        />
      )}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3.5 flex items-end justify-between gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[28px] border border-dashed border-border bg-surface/70 px-6 py-10 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        {icon}
      </div>
      <h3 className="text-base font-semibold leading-snug">{title}</h3>
      <p className="mt-1.5 max-w-[34ch] text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function TopBar({
  title,
  back,
  right,
  subtitle,
}: {
  title: string;
  back?: string;
  right?: ReactNode;
  subtitle?: string;
}) {
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-5 border-b border-border/70 bg-background/92 px-4 py-[max(0.875rem,env(safe-area-inset-top))] backdrop-blur-xl sm:-mx-5 sm:px-5">
      <div className="flex items-center gap-3">
        {back && (
          <Link
            to={back}
            aria-label="Quay lại"
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="truncate pt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
