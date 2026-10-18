import { useState } from "react";
import { ImagePicker } from "@/components/cannify/image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayIso } from "@/lib/cannify/format";
import { BATCH_NOTE_MAX, ITEM_NAME_MAX, ITEM_NOTE_MAX, type FoodItem } from "@/lib/cannify/types";

const SUGGESTED_CATEGORIES = [
  "Meat",
  "Vegetable",
  "Fish / Seafood",
  "Condiment",
  "Seed",
  "Fruit",
  "Fermented",
  "Other",
];

export type InitialBatchValue = {
  productionDate: string;
  bestBeforeDate: string;
  originalQuantity: string;
  note: string;
};

export type ItemFormValue = {
  name: string;
  category: string;
  note: string;
  imageDataUrl: string | null;
  initialBatch: InitialBatchValue | null;
};

export function ItemForm({
  initial,
  categories = [],
  submitLabel,
  onSubmit,
  pending,
  allowInitialBatch = false,
}: {
  initial?: Partial<FoodItem>;
  categories?: string[];
  submitLabel: string;
  pending?: boolean;
  allowInitialBatch?: boolean;
  onSubmit: (value: ItemFormValue) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(initial?.imageDataUrl ?? null);
  const [addInitialBatch, setAddInitialBatch] = useState(allowInitialBatch);
  const [productionDate, setProductionDate] = useState(todayIso());
  const [bestBeforeDate, setBestBeforeDate] = useState("");
  const [originalQuantity, setOriginalQuantity] = useState("");
  const [batchNote, setBatchNote] = useState("");

  const options = [...new Set([...categories.filter((category) => SUGGESTED_CATEGORIES.includes(category)), ...SUGGESTED_CATEGORIES])];

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          name,
          category,
          note,
          imageDataUrl,
          initialBatch: addInitialBatch ? { productionDate, bestBeforeDate, originalQuantity, note: batchNote } : null,
        });
      }}
    >
      <ImagePicker value={imageDataUrl} onChange={setImageDataUrl} />
      <div className="space-y-2">
        <Label htmlFor="item-name">Item name</Label>
        <Input
          id="item-name"
          value={name}
          maxLength={ITEM_NAME_MAX}
          required
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      {allowInitialBatch ? (
        <fieldset className="rounded-xl border border-border bg-surface-2 p-4">
          <label className="flex min-h-11 items-center gap-3 font-medium">
            <input type="checkbox" checked={addInitialBatch} onChange={(event) => setAddInitialBatch(event.target.checked)} />
            Add the first batch now
          </label>
          {addInitialBatch ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-production-date">Production date</Label>
                  <Input id="first-production-date" type="date" required value={productionDate} onChange={(event) => setProductionDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first-best-before-date">Best-before date</Label>
                  <Input id="first-best-before-date" type="date" required value={bestBeforeDate} onChange={(event) => setBestBeforeDate(event.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="first-batch-quantity">Quantity</Label>
                <Input id="first-batch-quantity" type="number" inputMode="decimal" min="0.001" step="any" required value={originalQuantity} onChange={(event) => setOriginalQuantity(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first-batch-note">Batch note</Label>
                <Textarea id="first-batch-note" maxLength={BATCH_NOTE_MAX} value={batchNote} onChange={(event) => setBatchNote(event.target.value)} placeholder="Optional, about 100 characters" />
              </div>
            </div>
          ) : null}
        </fieldset>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="item-category">Category</Label>
        <select
          id="item-category"
          value={category}
          required
          className="flex min-h-11 w-full rounded-md border border-input bg-surface px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="" disabled>Select a category</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="item-note">Note</Label>
        <Textarea
          id="item-note"
          value={note}
          maxLength={ITEM_NOTE_MAX}
          placeholder="Optional notes about this food item"
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
