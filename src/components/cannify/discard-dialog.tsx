import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatQty } from "@/lib/cannify/fifo";
import { userFacingError, useDiscardBatch } from "@/lib/cannify/queries";
import { DISCARD_REASON_MAX, type Batch } from "@/lib/cannify/types";

export function DiscardDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: Batch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const discard = useDiscardBatch();
  const [mode, setMode] = useState<"partial" | "all">("partial");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const good = batch?.goodQuantity ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setMode("partial");
          setQuantity("");
          setReason("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Discard food</DialogTitle>
          <DialogDescription>
            {batch
              ? `Discard from batch ${batch.id}. ${formatQty(good)} good quantity is currently available.`
              : "Choose a batch to discard from."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!batch) return;
            const amount = mode === "all" ? good : Number(quantity);
            try {
              const result = await discard.mutateAsync({
                batchId: batch.id,
                quantity: amount,
                reason,
              });
              toast.success(result.event.summary);
              onOpenChange(false);
            } catch (error) {
              toast.error(userFacingError(error));
            }
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "partial" ? "default" : "outline"}
              onClick={() => setMode("partial")}
            >
              Partial
            </Button>
            <Button type="button" variant={mode === "all" ? "default" : "outline"} onClick={() => setMode("all")}>
              Discard all good
            </Button>
          </div>
          {mode === "partial" ? (
            <div className="space-y-2">
              <Label htmlFor="discard-qty">Quantity</Label>
              <Input
                id="discard-qty"
                type="number"
                inputMode="decimal"
                min="0.001"
                step="any"
                max={good}
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This will discard all remaining good quantity ({formatQty(good)}) from this batch.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="discard-reason">Reason (optional)</Label>
            <Textarea
              id="discard-reason"
              maxLength={DISCARD_REASON_MAX}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Spoiled, damaged, contaminated, leaking, or another reason"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={discard.isPending || good <= 0}>
              {discard.isPending ? "Discarding…" : "Discard"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
