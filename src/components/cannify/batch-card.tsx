import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { daysUntil, formatDate, formatQty } from "@/lib/cannify/format";
import type { Batch } from "@/lib/cannify/types";

export function BatchCard({
  batch,
  onEdit,
  onDiscard,
  onDelete,
}: {
  batch: Batch;
  onEdit: () => void;
  onDiscard: () => void;
  onDelete: () => void;
}) {
  const remaining = daysUntil(batch.bestBeforeDate);
  const consumedQuantity = Math.max(0, batch.originalQuantity - batch.goodQuantity - batch.badQuantity);
  const dateBadge =
    remaining == null
      ? null
      : remaining < 0
        ? { variant: "bad" as const, label: "Past best-before" }
        : remaining <= 14
          ? { variant: "warn" as const, label: "Best-before soon" }
          : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-medium tracking-wide text-fg">{batch.id}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Produced {formatDate(batch.productionDate)}
            {batch.bestBeforeDate ? ` · Best-before ${formatDate(batch.bestBeforeDate)}` : ""}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for batch ${batch.id}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>Edit batch</DropdownMenuItem>
            <DropdownMenuItem onSelect={onDiscard} disabled={batch.goodQuantity <= 0}>
              Discard food
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete}>Move to Recently Deleted</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Original</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatQty(batch.originalQuantity)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Available</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-primary">{formatQty(batch.goodQuantity)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Consumed</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatQty(consumedQuantity)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Bad</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatQty(batch.badQuantity)}</dd>
        </div>
      </dl>
      {dateBadge ? (
        <div className="mt-3">
          <Badge variant={dateBadge.variant}>{dateBadge.label}</Badge>
        </div>
      ) : null}
      {batch.note ? <p className="mt-3 text-sm text-muted-foreground">{batch.note}</p> : null}
    </Card>
  );
}
