import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/cannify/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CannifyError } from "@/lib/cannify/errors";
import { availableGood, formatQty, planFifoConsumption } from "@/lib/cannify/fifo";
import { userFacingError, useConsumeItem } from "@/lib/cannify/queries";
import type { ItemWithBatches } from "@/lib/cannify/types";

export function ConsumePanel({
  row,
  onConsumed,
}: {
  row: ItemWithBatches;
  onConsumed?: () => void;
}) {
  const consume = useConsumeItem();
  const [quantity, setQuantity] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const available = availableGood(row.batches);

  const plan = useMemo(() => {
    const value = Number(quantity);
    if (!quantity.trim() || !Number.isFinite(value)) return null;
    try {
      return planFifoConsumption(row.batches, value);
    } catch (error) {
      return error;
    }
  }, [quantity, row.batches]);

  const allocations = Array.isArray(plan) ? plan : null;
  const planError = plan instanceof CannifyError ? plan.message : null;

  return (
    <Card className="p-5">
      <h2 className="font-display text-xl font-medium">Consume {row.item.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cannify uses FIFO: the oldest good batch is used first. You do not pick a batch.
      </p>
      <p className="mt-3 text-sm">
        Available good quantity: <span className="font-medium tabular-nums">{formatQty(available)}</span>
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (allocations) setConfirmOpen(true);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="consume-qty">Quantity to consume</Label>
          <Input
            id="consume-qty"
            type="number"
            inputMode="decimal"
            min="0.001"
            step="any"
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        {planError ? <p className="text-sm text-destructive">{planError}</p> : null}
        {allocations ? (
          <div className="rounded-lg bg-surface-2 p-3 text-sm">
            <p className="font-medium">FIFO plan</p>
            <ul className="mt-2 space-y-1">
              {allocations.map((allocation) => (
                <li key={allocation.batchId} className="flex justify-between gap-3 tabular-nums">
                  <span>{allocation.batchId}</span>
                  <span>{formatQty(allocation.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Button type="submit" disabled={consume.isPending || available <= 0} className="w-full sm:w-auto">
          {consume.isPending ? "Consuming…" : "Consume"}
        </Button>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Consume ${quantity || "this quantity"} of ${row.item.name}?`}
        description={allocations ? `Cannify will use ${allocations.map((allocation) => `${formatQty(allocation.amount)} from ${allocation.batchId}`).join(", ")}.` : "Review the FIFO recommendation before confirming."}
        confirmLabel="Confirm consumption"
        onConfirm={async () => {
          try {
            const result = await consume.mutateAsync({ itemId: row.item.id, quantity: Number(quantity) });
            toast.success(result.event.summary);
            setQuantity("");
            setConfirmOpen(false);
            onConsumed?.();
          } catch (error) {
            toast.error(userFacingError(error));
          }
        }}
      />
    </Card>
  );
}
