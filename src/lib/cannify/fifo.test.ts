import assert from "node:assert/strict";
import { test } from "node:test";
import { CannifyError } from "./errors.ts";
import {
  applyConsume,
  applyDiscard,
  availableGood,
  planFifoConsumption,
  qty,
} from "./fifo.ts";
import type { Batch } from "./types.ts";

function batch(partial: Partial<Batch> & Pick<Batch, "id" | "goodQuantity" | "productionDate">): Batch {
  return {
    itemId: "item-1",
    bestBeforeDate: null,
    originalQuantity: partial.originalQuantity ?? partial.goodQuantity,
    badQuantity: partial.badQuantity ?? 0,
    note: "",
    createdAt: partial.createdAt ?? 1,
    updatedAt: 1,
    status: "active",
    deletedAt: null,
    ...partial,
  };
}

test("qty rounds to three decimal places", () => {
  assert.equal(qty(1.2346), 1.235);
  assert.equal(qty(2), 2);
});

test("one batch: consume less than available", () => {
  const batches = [batch({ id: "B-AAA", goodQuantity: 10, productionDate: "2026-01-01" })];
  const plan = planFifoConsumption(batches, 4);
  assert.deepEqual(plan, [{ batchId: "B-AAA", amount: 4 }]);
  const next = applyConsume(batches[0], 4, 10);
  assert.equal(next.goodQuantity, 6);
  assert.equal(next.originalQuantity, 10);
});

test("one batch: consume entire good quantity", () => {
  const batches = [batch({ id: "B-AAA", goodQuantity: 5, productionDate: "2026-01-01" })];
  const plan = planFifoConsumption(batches, 5);
  assert.deepEqual(plan, [{ batchId: "B-AAA", amount: 5 }]);
  const next = applyConsume(batches[0], 5, 10);
  assert.equal(next.goodQuantity, 0);
  assert.equal(next.originalQuantity, 5);
});

test("multiple batches: oldest production date is consumed first", () => {
  const batches = [
    batch({ id: "B-NEW", goodQuantity: 8, productionDate: "2026-03-01", createdAt: 1 }),
    batch({ id: "B-OLD", goodQuantity: 5, productionDate: "2026-01-01", createdAt: 2 }),
  ];
  const plan = planFifoConsumption(batches, 3);
  assert.deepEqual(plan, [{ batchId: "B-OLD", amount: 3 }]);
});

test("consuming across multiple batches uses FIFO then the next batch", () => {
  const batches = [
    batch({ id: "B-OLD", goodQuantity: 2, productionDate: "2026-01-01", createdAt: 1 }),
    batch({ id: "B-MID", goodQuantity: 4, productionDate: "2026-02-01", createdAt: 2 }),
    batch({ id: "B-NEW", goodQuantity: 9, productionDate: "2026-03-01", createdAt: 3 }),
  ];
  const plan = planFifoConsumption(batches, 5);
  assert.deepEqual(plan, [
    { batchId: "B-OLD", amount: 2 },
    { batchId: "B-MID", amount: 3 },
  ]);
});

test("tie-breaker: earlier createdAt wins when production dates match", () => {
  const batches = [
    batch({ id: "B-LATER", goodQuantity: 4, productionDate: "2026-01-01", createdAt: 20 }),
    batch({ id: "B-FIRST", goodQuantity: 4, productionDate: "2026-01-01", createdAt: 10 }),
  ];
  const plan = planFifoConsumption(batches, 3);
  assert.deepEqual(plan, [{ batchId: "B-FIRST", amount: 3 }]);
});

test("insufficient good quantity is rejected", () => {
  const batches = [batch({ id: "B-AAA", goodQuantity: 2, productionDate: "2026-01-01" })];
  assert.throws(() => planFifoConsumption(batches, 3), (error: unknown) => {
    assert.ok(error instanceof CannifyError);
    assert.equal(error.code, "insufficient-quantity");
    return true;
  });
});

test("zero or negative quantity is rejected", () => {
  const batches = [batch({ id: "B-AAA", goodQuantity: 2, productionDate: "2026-01-01" })];
  assert.throws(() => planFifoConsumption(batches, 0), (error: unknown) => {
    assert.ok(error instanceof CannifyError);
    assert.equal(error.code, "invalid-quantity");
    return true;
  });
});

test("discarded quantity is excluded from available good inventory", () => {
  const batches = [
    batch({
      id: "B-BAD",
      goodQuantity: 0,
      badQuantity: 6,
      originalQuantity: 6,
      productionDate: "2025-01-01",
    }),
    batch({ id: "B-GOOD", goodQuantity: 3, productionDate: "2026-06-01" }),
  ];
  assert.equal(availableGood(batches), 3);
  const plan = planFifoConsumption(batches, 3);
  assert.deepEqual(plan, [{ batchId: "B-GOOD", amount: 3 }]);
});

test("deleted batches are excluded from FIFO", () => {
  const batches = [
    batch({
      id: "B-DEL",
      goodQuantity: 10,
      productionDate: "2025-01-01",
      status: "deleted",
      deletedAt: 99,
    }),
    batch({ id: "B-LIVE", goodQuantity: 2, productionDate: "2026-01-01" }),
  ];
  assert.equal(availableGood(batches), 2);
  const plan = planFifoConsumption(batches, 2);
  assert.deepEqual(plan, [{ batchId: "B-LIVE", amount: 2 }]);
});

test("discard moves quantity from good to bad and keeps original", () => {
  const original = batch({
    id: "B-AAA",
    goodQuantity: 10,
    badQuantity: 1,
    originalQuantity: 12,
    productionDate: "2026-01-01",
  });
  const next = applyDiscard(original, 4, 50);
  assert.equal(next.goodQuantity, 6);
  assert.equal(next.badQuantity, 5);
  assert.equal(next.originalQuantity, 12);
});

test("discard cannot exceed remaining good quantity", () => {
  const original = batch({ id: "B-AAA", goodQuantity: 2, productionDate: "2026-01-01" });
  assert.throws(() => applyDiscard(original, 3, 1), (error: unknown) => {
    assert.ok(error instanceof CannifyError);
    assert.equal(error.code, "insufficient-quantity");
    return true;
  });
});
