import type { ReactNode } from "react";
import { JarMark } from "@/components/cannify/logo";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl bg-card px-6 py-12 text-center shadow-[var(--shadow-border)]",
        className,
      )}
    >
      <JarMark className="size-12 opacity-80" />
      <h2 className="mt-4 font-display text-2xl font-medium">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
