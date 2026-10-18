import { cn } from "@/lib/utils";

export function JarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden="true"
      fill="none"
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="currentColor" className="text-primary" />
      <path
        d="M10 9.2h12M12.2 9.2v-1.4h7.6v1.4M11.2 11.4h9.6c.7 0 1.2.5 1.2 1.2v10.2c0 1.3-1 2.4-2.3 2.4H12.3c-1.3 0-2.3-1.1-2.3-2.4V12.6c0-.7.5-1.2 1.2-1.2Z"
        stroke="#f7f3ea"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.4 15.2h7.2" stroke="#c46a3a" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <JarMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-medium tracking-tight text-fg">Cannify</span>
        {compact ? null : (
          <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Local pantry
          </span>
        )}
      </span>
    </span>
  );
}
