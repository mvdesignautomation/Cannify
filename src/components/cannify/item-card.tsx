import { Link } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { daysUntil, formatDate, formatQty } from "@/lib/cannify/format";
import { itemTotals } from "@/lib/cannify/services";
import type { ItemWithBatches } from "@/lib/cannify/types";
import { JarMark } from "@/components/cannify/logo";

function soonestBestBefore(item: ItemWithBatches): string | null {
  const dates = item.batches
    .map((batch) => batch.bestBeforeDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates[0] ?? null;
}

export function ItemCard({ row }: { row: ItemWithBatches }) {
  const totals = itemTotals(row.batches);
  const soonest = soonestBestBefore(row);
  const remaining = daysUntil(soonest);
  const status =
    remaining == null
      ? null
      : remaining < 0
        ? { variant: "bad" as const, label: `Best-before ${formatDate(soonest)}` }
        : remaining <= 14
          ? { variant: "warn" as const, label: `Best-before ${formatDate(soonest)}` }
          : null;

  return (
    <Link to="/inventory/$itemId" params={{ itemId: row.item.id }} className="block h-full">
      <Card className="h-full p-4 transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]">
        <div className="flex gap-4">
          <div className="size-16 shrink-0 overflow-hidden rounded-md bg-surface-2">
            {row.item.imageDataUrl ? (
              <img src={row.item.imageDataUrl} alt="" className="item-photo size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-primary">
                <JarMark className="size-8" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="truncate font-display text-lg font-medium">{row.item.name}</h2>
              {row.item.category ? <Badge variant="secondary">{row.item.category}</Badge> : null}
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="size-3.5" aria-hidden="true" />
              <span className="tabular-nums">
                {totals.batchCount} {totals.batchCount === 1 ? "batch" : "batches"}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatQty(totals.good)} good</span>
            </p>
            {status ? (
              <p className="mt-2">
                <Badge variant={status.variant}>{status.label}</Badge>
              </p>
            ) : null}
            {totals.good <= 1 ? (
              <p className="mt-2">
                <Badge variant="warn">{totals.good === 0 ? "No good quantity" : "Low quantity"}</Badge>
              </p>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
