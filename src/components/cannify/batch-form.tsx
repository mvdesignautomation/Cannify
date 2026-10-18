import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayIso } from "@/lib/cannify/format";
import { BATCH_NOTE_MAX, type Batch } from "@/lib/cannify/types";

export type BatchFormValue = {
  productionDate: string;
  bestBeforeDate: string;
  originalQuantity: string;
  note: string;
};

export function BatchForm({
  initial,
  submitLabel,
  pending,
  lockQuantity,
  onSubmit,
}: {
  initial?: Partial<Batch>;
  submitLabel: string;
  pending?: boolean;
  lockQuantity?: boolean;
  onSubmit: (value: BatchFormValue) => void;
}) {
  const [productionDate, setProductionDate] = useState(initial?.productionDate ?? todayIso());
  const [bestBeforeDate, setBestBeforeDate] = useState(initial?.bestBeforeDate ?? "");
  const [originalQuantity, setOriginalQuantity] = useState(
    initial?.originalQuantity != null ? String(initial.originalQuantity) : "",
  );
  const [note, setNote] = useState(initial?.note ?? "");

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ productionDate, bestBeforeDate, originalQuantity, note });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="production-date">Production date</Label>
          <Input
            id="production-date"
            type="date"
            required
            value={productionDate}
            onChange={(event) => setProductionDate(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="best-before-date">Best-before date</Label>
          <Input
            id="best-before-date"
            type="date"
            required
            value={bestBeforeDate}
            onChange={(event) => setBestBeforeDate(event.target.value)}
          />
        </div>
      </div>
      {lockQuantity ? (
        <p className="text-sm text-muted-foreground">
          Original quantity stays {initial?.originalQuantity}. Quantity changes only through consume or discard.
        </p>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="original-quantity">Original quantity</Label>
          <Input
            id="original-quantity"
            type="number"
            inputMode="decimal"
            min="0.001"
            step="any"
            required
            value={originalQuantity}
            onChange={(event) => setOriginalQuantity(event.target.value)}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="batch-note">Batch note</Label>
        <Textarea
          id="batch-note"
          value={note}
          maxLength={BATCH_NOTE_MAX}
          placeholder="Optional, about 100 characters"
          onChange={(event) => setNote(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{note.length}/{BATCH_NOTE_MAX}</p>
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
