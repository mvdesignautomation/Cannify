import { CannifyError } from "./errors.ts";
import type { Batch, QuantityAllocation } from "./types.ts";

export function qty(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

export function formatQty(n: number): string {
  const value = qty(n);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(3).replace(/\.?0+$/, "");
}

export function isActiveBatch(batch: Pick<Batch, "status" | "deletedAt">): boolean {
  return batch.status === "active" && batch.deletedAt == null;
}

export function fifoSort<T extends Pick<Batch, "productionDate" | "createdAt">>(a: T, b: T): number {
  if (a.productionDate !== b.productionDate) {
    return a.productionDate < b.productionDate ? -1 : 1;
  }
  return a.createdAt - b.createdAt;
}

export function goodBatches<T extends Pick<Batch, "status" | "deletedAt" | "goodQuantity" | "productionDate" | "createdAt">>(
  batches: T[],
): T[] {
  return batches.filter((batch) => isActiveBatch(batch) && batch.goodQuantity > 0).sort(fifoSort);
}

export function availableGood(batches: Pick<Batch, "status" | "deletedAt" | "goodQuantity">[]): number {
  return qty(
    batches
      .filter((batch) => isActiveBatch(batch) && batch.goodQuantity > 0)
      .reduce((sum, batch) => sum + batch.goodQuantity, 0),
  );
}

export function planFifoConsumption(
  batches: Array<Pick<Batch, "id" | "status" | "deletedAt" | "goodQuantity" | "productionDate" | "createdAt">>,
  quantity: number,
): QuantityAllocation[] {
  if (!Number.isFinite(quantity) || qty(quantity) <= 0) {
    throw new CannifyError("invalid-quantity", "Enter a quantity greater than zero.");
  }
  const wanted = qty(quantity);
  const ordered = goodBatches(batches);
  const available = availableGood(ordered);
  if (wanted > available) {
    throw new CannifyError(
      "insufficient-quantity",
      available === 0
        ? "There is no good quantity available to consume."
        : `Only ${formatQty(available)} good quantity is available.`,
    );
  }

  const allocations: QuantityAllocation[] = [];
  let remaining = wanted;
  for (const batch of ordered) {
    if (remaining <= 0) break;
    const take = qty(Math.min(remaining, batch.goodQuantity));
    if (take <= 0) continue;
    allocations.push({ batchId: batch.id, amount: take });
    remaining = qty(remaining - take);
  }
  return allocations;
}

export function applyConsume(batch: Batch, amount: number, now: number): Batch {
  const take = qty(amount);
  if (take <= 0) {
    throw new CannifyError("invalid-quantity", "Enter a quantity greater than zero.");
  }
  if (take > qty(batch.goodQuantity)) {
    throw new CannifyError(
      "insufficient-quantity",
      `Batch ${batch.id} only has ${formatQty(batch.goodQuantity)} good quantity.`,
    );
  }
  return {
    ...batch,
    goodQuantity: qty(batch.goodQuantity - take),
    updatedAt: now,
  };
}

export function applyDiscard(batch: Batch, amount: number, now: number): Batch {
  const take = qty(amount);
  if (take <= 0) {
    throw new CannifyError("invalid-quantity", "Enter a quantity greater than zero.");
  }
  if (take > qty(batch.goodQuantity)) {
    throw new CannifyError(
      "insufficient-quantity",
      `Batch ${batch.id} only has ${formatQty(batch.goodQuantity)} good quantity to discard.`,
    );
  }
  return {
    ...batch,
    goodQuantity: qty(batch.goodQuantity - take),
    badQuantity: qty(batch.badQuantity + take),
    updatedAt: now,
  };
}

export function assertValidDates(productionDate: string, bestBeforeDate: string | null): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(productionDate)) {
    throw new CannifyError("invalid-dates", "Production date is required.");
  }
  if (bestBeforeDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bestBeforeDate)) {
      throw new CannifyError("invalid-dates", "Best-before date is not valid.");
    }
    if (bestBeforeDate < productionDate) {
      throw new CannifyError("invalid-dates", "Best-before date cannot be before the production date.");
    }
  }
}
