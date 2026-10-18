import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/cannify/empty-state";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatQty, historyLabel } from "@/lib/cannify/format";
import { useHistory } from "@/lib/cannify/queries";
import type { HistoryType } from "@/lib/cannify/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({ component: HistoryPage });

const FILTERS: Array<{ id: "all" | HistoryType; label: string }> = [
  { id: "all", label: "All" },
  { id: "added", label: "Added" },
  { id: "consumed", label: "Consumed" },
  { id: "discarded", label: "Discarded" },
  { id: "restored", label: "Restored" },
];

function HistoryPage() {
  const history = useHistory();
  const [filter, setFilter] = useState<"all" | HistoryType>("all");
  const events = useMemo(() => {
    const rows = history.data ?? [];
    return filter === "all" ? rows : rows.filter((event) => event.type === filter);
  }, [filter, history.data]);

  return (
    <div>
      <PageHeader
        eyebrow="Activity"
        title="History"
        description="A compact record of added, consumed, discarded, and restored inventory events."
        actions={
          <Button asChild variant="outline">
            <Link to="/deleted">Recently Deleted</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="History filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium",
              filter === item.id ? "bg-primary text-primary-foreground" : "bg-surface shadow-[var(--shadow-border)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {history.isPending ? (
        <Skeleton className="h-64" />
      ) : events.length === 0 ? (
        <EmptyState
          title="No events"
          description="Inventory actions will appear here as a compact history — not an analytics report."
        />
      ) : (
        <Card className="divide-y divide-border">
          {events.map((event) => (
            <article key={event.id} className="px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      event.type === "discarded"
                        ? "bad"
                        : event.type === "consumed"
                          ? "warn"
                          : event.type === "restored"
                            ? "secondary"
                            : "good"
                    }
                  >
                    {historyLabel(event.type)}
                  </Badge>
                  <h2 className="font-medium">{event.itemName}</h2>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{event.summary}</p>
              {event.quantity > 0 ? (
                <p className="mt-1 text-sm tabular-nums">Quantity: {formatQty(event.quantity)}</p>
              ) : null}
              {event.reason ? <p className="mt-1 text-sm">Reason: {event.reason}</p> : null}
              {event.allocations.length > 1 ? (
                <details className="mt-3 text-sm text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-fg">View batch split and event details</summary>
                  <ul className="mt-2 space-y-1">
                    {event.allocations.map((allocation) => (
                      <li key={allocation.batchId} className="flex justify-between gap-3 tabular-nums">
                        <span>{allocation.batchId}</span>
                        <span>{formatQty(allocation.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-mono text-xs">Event {event.id}</p>
                </details>
              ) : event.batchId ? (
                <details className="mt-3 text-sm text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-fg">View event details</summary>
                  <p className="mt-2 font-mono text-xs">Event {event.id} · Batch {event.batchId}</p>
                </details>
              ) : (
                <details className="mt-3 text-sm text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-fg">View event details</summary>
                  <p className="mt-2 font-mono text-xs">Event {event.id} · Item {event.itemId}</p>
                </details>
              )}
            </article>
          ))}
        </Card>
      )}
    </div>
  );
}
