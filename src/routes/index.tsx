import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Package, ScanLine, Utensils } from "lucide-react";
import { EmptyState } from "@/components/cannify/empty-state";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { daysUntil, formatDate, formatDateTime, formatQty, historyLabel } from "@/lib/cannify/format";
import { useHistory, useInventory } from "@/lib/cannify/queries";
import { itemTotals } from "@/lib/cannify/services";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  const inventory = useInventory();
  const history = useHistory();
  const items = inventory.data ?? [];
  const itemCount = items.length;
  const goodCount = items.reduce((sum, row) => sum + itemTotals(row.batches).good, 0);

  const dated = items
    .flatMap((row) =>
      row.batches
        .filter((batch) => batch.bestBeforeDate)
        .map((batch) => ({
          item: row.item,
          batch,
          remaining: daysUntil(batch.bestBeforeDate),
        })),
    )
    .filter((row) => row.remaining != null && row.remaining <= 14)
    .sort((a, b) => (a.remaining ?? 0) - (b.remaining ?? 0))
    .slice(0, 6);
  const attentionCount = new Set([
    ...items.filter((row) => itemTotals(row.batches).good <= 1).map((row) => row.item.id),
    ...dated.map((row) => row.item.id),
  ]).size;

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Your pantry"
        description="Local food inventory on this device. No account, no cloud, no connection required."
        actions={
          <>
            <Button asChild>
              <Link to="/inventory/new">Add item</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/consume">Consume</Link>
            </Button>
          </>
        }
      />

      {inventory.isPending ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Food items" value={String(itemCount)} />
          <StatCard label="Need attention" value={String(attentionCount)} />
          <StatCard label="Good quantity" value={formatQty(goodCount)} />
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <QuickLink to="/inventory" icon={Package} label="Browse inventory" />
        <QuickLink to="/consume" icon={Utensils} label="Consume with FIFO" />
        <QuickLink to="/scan" icon={ScanLine} label="Scan an item QR" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-medium">Best-before dates</h2>
            <Link to="/inventory" className="text-sm font-medium text-primary">
              Inventory
            </Link>
          </div>
          {inventory.isPending ? (
            <Skeleton className="h-40" />
          ) : dated.length === 0 ? (
            <EmptyState
              title="Nothing coming due"
              description="When a batch has a best-before date in the next two weeks, it will show up here."
            />
          ) : (
            <Card className="divide-y divide-border">
              {dated.map((row) => (
                <Link
                  key={`${row.item.id}-${row.batch.id}`}
                  to="/inventory/$itemId"
                  params={{ itemId: row.item.id }}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.batch.id} · {formatDate(row.batch.bestBeforeDate)}
                    </p>
                  </div>
                  <Badge variant={(row.remaining ?? 0) < 0 ? "bad" : "warn"}>
                    {(row.remaining ?? 0) < 0 ? "Past date" : `${row.remaining} days`}
                  </Badge>
                </Link>
              ))}
            </Card>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-medium">Recent history</h2>
            <Link to="/history" className="text-sm font-medium text-primary">
              All history
            </Link>
          </div>
          {history.isPending ? (
            <Skeleton className="h-40" />
          ) : (history.data ?? []).length === 0 ? (
            <EmptyState
              title="No inventory events yet"
              description="Added, consumed, discarded, and restored events will appear here."
              action={
                <Button asChild>
                  <Link to="/inventory/new">Add a food item</Link>
                </Button>
              }
            />
          ) : (
            <Card className="divide-y divide-border">
              {(history.data ?? []).slice(0, 6).map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{historyLabel(event.type)}</p>
                    <p className="truncate text-sm text-muted-foreground">{event.summary}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-medium tabular-nums">{value}</p>
    </Card>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/inventory" | "/consume" | "/scan";
  icon: typeof Package;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center justify-between rounded-xl bg-card px-4 shadow-[var(--shadow-border)] transition-[box-shadow] hover:shadow-[var(--shadow-border-hover)]"
    >
      <span className="flex items-center gap-3 text-sm font-medium">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
