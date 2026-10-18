import { createFileRoute, Link } from "@tanstack/react-router";
import { ConsumePanel } from "@/components/cannify/consume-panel";
import { EmptyState } from "@/components/cannify/empty-state";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatQty } from "@/lib/cannify/fifo";
import { useInventory, useItem } from "@/lib/cannify/queries";
import { itemTotals } from "@/lib/cannify/services";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

type ConsumeSearch = { itemId?: string };

export const Route = createFileRoute("/consume")({
  validateSearch: (search: Record<string, unknown>): ConsumeSearch => ({
    itemId: typeof search.itemId === "string" ? search.itemId : undefined,
  }),
  component: ConsumePage,
});

function ConsumePage() {
  const { itemId } = Route.useSearch();
  const [search, setSearch] = useState("");
  const inventory = useInventory({ search });
  const selected = useItem(itemId);
  const rows = useMemo(
    () => (inventory.data ?? []).filter((row) => itemTotals(row.batches).good > 0),
    [inventory.data],
  );

  return (
    <div>
      <PageHeader
        eyebrow="FIFO"
        title="Consume"
        description="Only good quantity can be consumed. Cannify uses the oldest applicable batch first, then continues across batches if needed."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find an item"
            aria-label="Find an item to consume"
            className="mb-3"
          />
          {inventory.isPending ? (
            <Skeleton className="h-48" />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nothing to consume"
              description="Add a batch with good quantity, or clear the search."
              action={
                <Button asChild>
                  <Link to="/inventory/new">Add item</Link>
                </Button>
              }
            />
          ) : (
            <Card className="divide-y divide-border">
              {rows.map((row) => {
                const active = row.item.id === itemId;
                const totals = itemTotals(row.batches);
                return (
                  <Link
                    key={row.item.id}
                    to="/consume"
                    search={{ itemId: row.item.id }}
                    className={cn(
                      "flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2",
                      active && "bg-surface-2",
                    )}
                  >
                    <span className="truncate font-medium">{row.item.name}</span>
                    <Badge variant="good">{formatQty(totals.good)} good</Badge>
                  </Link>
                );
              })}
            </Card>
          )}
        </section>

        <section>
          {itemId && selected.isPending ? (
            <Skeleton className="h-64" />
          ) : selected.data ? (
            <ConsumePanel row={selected.data} />
          ) : (
            <EmptyState
              title="Choose an item"
              description="Select a food item on the left. Cannify will plan FIFO consumption across its good batches."
            />
          )}
        </section>
      </div>
    </div>
  );
}
