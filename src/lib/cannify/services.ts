import { CannifyError } from "./errors";
import {
  applyConsume,
  applyDiscard,
  assertValidDates,
  availableGood,
  formatQty,
  planFifoConsumption,
  qty,
} from "./fifo";
import { itemQrPayload, newBatchId, newId, parseItemQrPayload } from "./ids";
import {
  cannifyStores,
  deleteRecord,
  getAll,
  getAllFromIndex,
  getById,
  putRecord,
  withTransaction,
} from "./db";
import type {
  Batch,
  CannifySettings,
  FoodItem,
  HistoryEvent,
  HistoryType,
  ItemWithBatches,
  QuantityAllocation,
  RecordStatus,
} from "./types";
import {
  ALERT_PERIODS,
  BATCH_NOTE_MAX,
  DISCARD_REASON_MAX,
  ITEM_NAME_MAX,
  ITEM_NOTE_MAX,
  type AlertPeriod,
  type AppTheme,
  type UiSize,
} from "./types";
import {
  cancelAllBestBeforeNotifications,
  scheduleBestBeforeNotifications,
} from "@/lib/notifications";

export const DEFAULT_SETTINGS: CannifySettings = {
  id: "app",
  theme: "system",
  uiSize: "default",
  notificationsEnabled: false,
  notificationPeriods: [14, 7],
};

function dateAtLocalMidnight(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

/**
 * Notification calls run only after IndexedDB commits. A native scheduling
 * failure must not make a successful inventory mutation appear to have failed.
 */
async function safelyRunNotificationTask(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch {
    // The saved inventory data remains valid; notifications can be reconciled later.
  }
}

async function syncBatchNotifications(
  batch: Batch,
  itemName: string,
  settings?: CannifySettings,
): Promise<void> {
  const currentSettings = settings ?? (await getSettings());
  if (!currentSettings.notificationsEnabled || !batch.bestBeforeDate) return;

  await safelyRunNotificationTask(() =>
    scheduleBestBeforeNotifications({
      batchId: batch.id,
      itemName,
      bestBefore: dateAtLocalMidnight(batch.bestBeforeDate!),
      alertPeriods: currentSettings.notificationPeriods,
    }),
  );
}

async function cancelBatchNotifications(batchId: string): Promise<void> {
  await safelyRunNotificationTask(() =>
    cancelAllBestBeforeNotifications(batchId, ALERT_PERIODS),
  );
}

function now(): number {
  return Date.now();
}

function trimText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function assertName(name: string): string {
  const value = trimText(name);
  if (!value) throw new CannifyError("missing-name", "Item name is required.");
  if (value.length > ITEM_NAME_MAX) {
    throw new CannifyError("missing-name", `Item name must be ${ITEM_NAME_MAX} characters or fewer.`);
  }
  return value;
}

function assertBatchNote(note: string): string {
  const value = trimText(note);
  if (value.length > BATCH_NOTE_MAX) {
    throw new CannifyError("note-too-long", `Batch notes can be about ${BATCH_NOTE_MAX} characters.`);
  }
  return value;
}

function assertItemNote(note: string): string {
  const value = trimText(note);
  if (value.length > ITEM_NOTE_MAX) {
    throw new CannifyError("note-too-long", "Item note is too long.");
  }
  return value;
}

function historyEvent(input: {
  type: HistoryType;
  itemId: string;
  itemName: string;
  batchId?: string | null;
  quantity: number;
  reason?: string | null;
  summary: string;
  allocations?: QuantityAllocation[];
  createdAt?: number;
}): HistoryEvent {
  return {
    id: newId(),
    type: input.type,
    itemId: input.itemId,
    itemName: input.itemName,
    batchId: input.batchId ?? null,
    quantity: qty(input.quantity),
    reason: input.reason ?? null,
    summary: input.summary,
    allocations: input.allocations ?? [],
    createdAt: input.createdAt ?? now(),
  };
}

export type CreateItemInput = {
  name: string;
  category?: string;
  note?: string;
  imageDataUrl?: string | null;
};

export type CreateBatchInput = {
  itemId: string;
  productionDate: string;
  bestBeforeDate?: string | null;
  originalQuantity: number;
  note?: string;
};

export async function createItem(input: CreateItemInput): Promise<FoodItem> {
  const createdAt = now();
  const item: FoodItem = {
    id: newId(),
    name: assertName(input.name),
    category: trimText(input.category),
    note: assertItemNote(input.note ?? ""),
    imageDataUrl: input.imageDataUrl ?? null,
    createdAt,
    updatedAt: createdAt,
    status: "active",
    deletedAt: null,
  };
  await withTransaction(["items"], "readwrite", async (tx) => {
    await putRecord(cannifyStores(tx).items, item);
  });
  return item;
}

export async function updateItem(
  itemId: string,
  patch: Partial<Pick<FoodItem, "name" | "category" | "note" | "imageDataUrl">>,
): Promise<FoodItem> {
  return withTransaction(["items"], "readwrite", async (tx) => {
    const items = cannifyStores(tx).items;
    const current = await getById<FoodItem>(items, itemId);
    if (!current || current.status !== "active") {
      throw new CannifyError("missing-item", "That food item could not be found.");
    }
    const next: FoodItem = {
      ...current,
      name: patch.name !== undefined ? assertName(patch.name) : current.name,
      category: patch.category !== undefined ? trimText(patch.category) : current.category,
      note: patch.note !== undefined ? assertItemNote(patch.note) : current.note,
      imageDataUrl: patch.imageDataUrl !== undefined ? patch.imageDataUrl : current.imageDataUrl,
      updatedAt: now(),
    };
    await putRecord(items, next);
    return next;
  });
}

export async function createBatch(input: CreateBatchInput): Promise<{ batch: Batch; event: HistoryEvent }> {
  const originalQuantity = qty(input.originalQuantity);
  if (originalQuantity <= 0) {
    throw new CannifyError("invalid-quantity", "Original quantity must be greater than zero.");
  }
  assertValidDates(input.productionDate, input.bestBeforeDate ?? null);
  const note = assertBatchNote(input.note ?? "");
  const createdAt = now();

  const result = await withTransaction(["items", "batches", "history"], "readwrite", async (tx) => {
    const stores = cannifyStores(tx);
    const item = await getById<FoodItem>(stores.items, input.itemId);
    if (!item || item.status !== "active") {
      throw new CannifyError("missing-item", "That food item could not be found.");
    }
    const existing = await getAll<Batch>(stores.batches);
    const batch: Batch = {
      id: newBatchId(new Set(existing.map((row) => row.id))),
      itemId: item.id,
      productionDate: input.productionDate,
      bestBeforeDate: input.bestBeforeDate ? input.bestBeforeDate : null,
      originalQuantity,
      goodQuantity: originalQuantity,
      badQuantity: 0,
      note,
      createdAt,
      updatedAt: createdAt,
      status: "active",
      deletedAt: null,
    };
    const event = historyEvent({
      type: "added",
      itemId: item.id,
      itemName: item.name,
      batchId: batch.id,
      quantity: originalQuantity,
      summary: `Added ${formatQty(originalQuantity)} to ${item.name} (${batch.id})`,
      allocations: [{ batchId: batch.id, amount: originalQuantity }],
      createdAt,
    });
    await putRecord(stores.batches, batch);
    await putRecord(stores.history, event);
    await putRecord(stores.items, { ...item, updatedAt: createdAt });
    return { batch, event };
  });

  await syncBatchNotifications(result.batch, result.event.itemName);
  return result;
}

export async function updateBatch(
  batchId: string,
  patch: Partial<Pick<Batch, "productionDate" | "bestBeforeDate" | "note">>,
): Promise<Batch> {
  const result = await withTransaction(["items", "batches"], "readwrite", async (tx) => {
    const stores = cannifyStores(tx);
    const batches = stores.batches;
    const current = await getById<Batch>(batches, batchId);
    if (!current || current.status !== "active") {
      throw new CannifyError("missing-batch", "That batch could not be found.");
    }
    const productionDate = patch.productionDate ?? current.productionDate;
    const bestBeforeDate =
      patch.bestBeforeDate === undefined ? current.bestBeforeDate : patch.bestBeforeDate;
    assertValidDates(productionDate, bestBeforeDate);
    const next: Batch = {
      ...current,
      productionDate,
      bestBeforeDate,
      note: patch.note !== undefined ? assertBatchNote(patch.note) : current.note,
      updatedAt: now(),
    };
    await putRecord(batches, next);
    const item = await getById<FoodItem>(stores.items, next.itemId);
    return { batch: next, itemName: item?.name };
  });

  if (patch.bestBeforeDate !== undefined) {
    await cancelBatchNotifications(result.batch.id);
    if (result.itemName) {
      await syncBatchNotifications(result.batch, result.itemName);
    }
  }

  return result.batch;
}

export async function consumeItem(
  itemId: string,
  quantity: number,
): Promise<{ item: FoodItem; allocations: QuantityAllocation[]; event: HistoryEvent; batches: Batch[] }> {
  const wanted = qty(quantity);
  return withTransaction(["items", "batches", "history"], "readwrite", async (tx) => {
    const stores = cannifyStores(tx);
    const item = await getById<FoodItem>(stores.items, itemId);
    if (!item || item.status !== "active") {
      throw new CannifyError("missing-item", "That food item could not be found.");
    }
    const batches = await getAllFromIndex<Batch>(stores.batches, "by_item", itemId);
    const allocations = planFifoConsumption(batches, wanted);
    const stamp = now();
    const updated: Batch[] = [];
    for (const allocation of allocations) {
      const current = batches.find((row) => row.id === allocation.batchId);
      if (!current) {
        throw new CannifyError("missing-batch", "A batch required for consumption is missing.");
      }
      const next = applyConsume(current, allocation.amount, stamp);
      await putRecord(stores.batches, next);
      updated.push(next);
    }
    const event = historyEvent({
      type: "consumed",
      itemId: item.id,
      itemName: item.name,
      batchId: allocations.length === 1 ? allocations[0].batchId : null,
      quantity: wanted,
      summary:
        allocations.length === 1
          ? `Consumed ${formatQty(wanted)} of ${item.name} from ${allocations[0].batchId}`
          : `Consumed ${formatQty(wanted)} of ${item.name} across ${allocations.length} batches`,
      allocations,
      createdAt: stamp,
    });
    await putRecord(stores.history, event);
    const nextItem = { ...item, updatedAt: stamp };
    await putRecord(stores.items, nextItem);
    return { item: nextItem, allocations, event, batches: updated };
  });
}

export async function discardFromBatch(
  batchId: string,
  quantity: number,
  reason: string,
): Promise<{ batch: Batch; event: HistoryEvent }> {
  const amount = qty(quantity);
  const trimmedReason = trimText(reason);
  if (trimmedReason.length > DISCARD_REASON_MAX) {
    throw new CannifyError("missing-reason", "Discard reason is too long.");
  }

  return withTransaction(["items", "batches", "history"], "readwrite", async (tx) => {
    const stores = cannifyStores(tx);
    const batch = await getById<Batch>(stores.batches, batchId);
    if (!batch || batch.status !== "active") {
      throw new CannifyError("missing-batch", "That batch could not be found.");
    }
    const item = await getById<FoodItem>(stores.items, batch.itemId);
    if (!item || item.status !== "active") {
      throw new CannifyError("missing-item", "That food item could not be found.");
    }
    const stamp = now();
    const next = applyDiscard(batch, amount, stamp);
    const event = historyEvent({
      type: "discarded",
      itemId: item.id,
      itemName: item.name,
      batchId: batch.id,
      quantity: amount,
      reason: trimmedReason || null,
      summary: `Discarded ${formatQty(amount)} of ${item.name} from ${batch.id}${trimmedReason ? ` (${trimmedReason})` : ""}`,
      allocations: [{ batchId: batch.id, amount }],
      createdAt: stamp,
    });
    await putRecord(stores.batches, next);
    await putRecord(stores.history, event);
    await putRecord(stores.items, { ...item, updatedAt: stamp });
    return { batch: next, event };
  });
}

export async function getSettings(): Promise<CannifySettings> {
  return withTransaction(["settings"], "readonly", async (tx) => {
    const saved = await getById<CannifySettings>(cannifyStores(tx).settings, "app");
    if (!saved) return DEFAULT_SETTINGS;
    const theme: AppTheme = ["light", "dark", "system"].includes(saved.theme)
      ? saved.theme
      : DEFAULT_SETTINGS.theme;
    const uiSize: UiSize = ["small", "default", "large", "extra-large"].includes(saved.uiSize)
      ? saved.uiSize
      : DEFAULT_SETTINGS.uiSize;
    const notificationPeriods = saved.notificationPeriods.filter((period): period is AlertPeriod =>
      (ALERT_PERIODS as readonly number[]).includes(period),
    );
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      theme,
      uiSize,
      notificationPeriods,
    };
  });
}

export async function updateSettings(
  patch: Partial<Omit<CannifySettings, "id">>,
): Promise<CannifySettings> {
  const next = await withTransaction(["settings"], "readwrite", async (tx) => {
    const store = cannifyStores(tx).settings;
    const current = (await getById<CannifySettings>(store, "app")) ?? DEFAULT_SETTINGS;
    const next: CannifySettings = { ...current, ...patch, id: "app" };
    await putRecord(store, next);
    return next;
  });

  if (patch.notificationsEnabled !== undefined || patch.notificationPeriods !== undefined) {
    await safelyRunNotificationTask(() => reconcileBestBeforeNotifications(next));
  }

  return next;
}

async function reconcileBestBeforeNotifications(settings: CannifySettings): Promise<void> {
  const inventory = await listInventory();
  for (const { item, batches } of inventory) {
    for (const batch of batches) {
      // Cancel every supported period first, including periods that were removed.
      await cancelBatchNotifications(batch.id);
      await syncBatchNotifications(batch, item.name, settings);
    }
  }
}

function markDeleted<T extends { status: RecordStatus; deletedAt: number | null; updatedAt: number }>(
  record: T,
  stamp: number,
): T {
  return { ...record, status: "deleted", deletedAt: stamp, updatedAt: stamp };
}

function markRestored<T extends { status: RecordStatus; deletedAt: number | null; updatedAt: number }>(
  record: T,
  stamp: number,
): T {
  return { ...record, status: "active", deletedAt: null, updatedAt: stamp };
}

export async function deleteItem(itemId: string): Promise<FoodItem> {
  const result = await withTransaction(["items", "batches"], "readwrite", async (tx) => {
    const stores = cannifyStores(tx);
    const item = await getById<FoodItem>(stores.items, itemId);
    if (!item || item.status !== "active") {
      throw new CannifyError("missing-item", "That food item could not be found.");
    }
    const stamp = now();
    const next = markDeleted(item, stamp);
    await putRecord(stores.items, next);
    const batches = await getAllFromIndex<Batch>(stores.batches, "by_item", itemId);
    const deletedBatchIds: string[] = [];
    for (const batch of batches) {
      if (batch.status === "active") {
        await putRecord(stores.batches, markDeleted(batch, stamp));
        deletedBatchIds.push(batch.id);
      }
    }
    return { item: next, deletedBatchIds };
  });

  for (const batchId of result.deletedBatchIds) {
    await cancelBatchNotifications(batchId);
  }
  return result.item;
}

export async function deleteBatch(batchId: string): Promise<Batch> {
  const next = await withTransaction(["batches"], "readwrite", async (tx) => {
    const batches = cannifyStores(tx).batches;
    const batch = await getById<Batch>(batches, batchId);
    if (!batch || batch.status !== "active") {
      throw new CannifyError("missing-batch", "That batch could not be found.");
    }
    const next = markDeleted(batch, now());
    await putRecord(batches, next);
    return next;
  });

  await cancelBatchNotifications(next.id);
  return next;
}

export async function restoreItem(itemId: string): Promise<{ item: FoodItem; event: HistoryEvent }> {
  return withTransaction(["items", "batches", "history"], "readwrite", async (tx) => {
    const stores = cannifyStores(tx);
    const item = await getById<FoodItem>(stores.items, itemId);
    if (!item) throw new CannifyError("missing-item", "That food item could not be found.");
    if (item.status !== "deleted") {
      throw new CannifyError("not-deleted", "That item is not in Recently Deleted.");
    }
    const stamp = now();
    const next = markRestored(item, stamp);
    await putRecord(stores.items, next);
    const batches = await getAllFromIndex<Batch>(stores.batches, "by_item", itemId);
    for (const batch of batches) {
      if (batch.status === "deleted" && batch.deletedAt === item.deletedAt) {
        await putRecord(stores.batches, markRestored(batch, stamp));
      }
    }
    const event = historyEvent({
      type: "restored",
      itemId: item.id,
      itemName: item.name,
      quantity: 0,
      summary: `Restored ${item.name}`,
      createdAt: stamp,
    });
    await putRecord(stores.history, event);
    return { item: next, event };
  });
}

export async function restoreBatch(batchId: string): Promise<{ batch: Batch; event: HistoryEvent }> {
  return withTransaction(["items", "batches", "history"], "readwrite", async (tx) => {
    const stores = cannifyStores(tx);
    const batch = await getById<Batch>(stores.batches, batchId);
    if (!batch) throw new CannifyError("missing-batch", "That batch could not be found.");
    if (batch.status !== "deleted") {
      throw new CannifyError("not-deleted", "That batch is not in Recently Deleted.");
    }
    const item = await getById<FoodItem>(stores.items, batch.itemId);
    if (!item) throw new CannifyError("missing-item", "The parent item could not be found.");
    if (item.status !== "active") {
      throw new CannifyError(
        "already-deleted",
        "Restore the parent food item first. That will restore its batches too.",
      );
    }
    const stamp = now();
    const next = markRestored(batch, stamp);
    await putRecord(stores.batches, next);
    const event = historyEvent({
      type: "restored",
      itemId: item.id,
      itemName: item.name,
      batchId: batch.id,
      quantity: next.goodQuantity,
      summary: `Restored batch ${batch.id} of ${item.name}`,
      allocations: [{ batchId: batch.id, amount: next.goodQuantity }],
      createdAt: stamp,
    });
    await putRecord(stores.history, event);
    return { batch: next, event };
  });
}

export async function permanentlyDeleteItem(itemId: string): Promise<void> {
  await withTransaction(["items", "batches"], "readwrite", async (tx) => {
    const stores = cannifyStores(tx);
    const item = await getById<FoodItem>(stores.items, itemId);
    if (!item) throw new CannifyError("missing-item", "That food item could not be found.");
    const batches = await getAllFromIndex<Batch>(stores.batches, "by_item", itemId);
    for (const batch of batches) {
      await deleteRecord(stores.batches, batch.id);
    }
    await deleteRecord(stores.items, itemId);
  });
}

export async function permanentlyDeleteBatch(batchId: string): Promise<void> {
  await withTransaction(["batches"], "readwrite", async (tx) => {
    const batches = cannifyStores(tx).batches;
    const batch = await getById<Batch>(batches, batchId);
    if (!batch) throw new CannifyError("missing-batch", "That batch could not be found.");
    await deleteRecord(batches, batchId);
  });
}

export type InventoryQuery = {
  search?: string;
  category?: string | null;
};

function matchesSearch(item: FoodItem, batches: Batch[], search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  if (item.name.toLowerCase().includes(q)) return true;
  if (item.category.toLowerCase().includes(q)) return true;
  if (item.note.toLowerCase().includes(q)) return true;
  return batches.some(
    (batch) =>
      batch.id.toLowerCase().includes(q) ||
      batch.note.toLowerCase().includes(q),
  );
}

export async function listInventory(query: InventoryQuery = {}): Promise<ItemWithBatches[]> {
  return withTransaction(["items", "batches"], "readonly", async (tx) => {
    const stores = cannifyStores(tx);
    const items = (await getAll<FoodItem>(stores.items)).filter((item) => item.status === "active");
    const batches = await getAll<Batch>(stores.batches);
    const grouped = new Map<string, Batch[]>();
    for (const batch of batches) {
      if (batch.status !== "active") continue;
      const list = grouped.get(batch.itemId) ?? [];
      list.push(batch);
      grouped.set(batch.itemId, list);
    }
    const category = query.category?.trim();
    return items
      .map((item) => ({
        item,
        batches: (grouped.get(item.id) ?? []).slice().sort((a, b) => {
          if (a.productionDate !== b.productionDate) {
            return a.productionDate < b.productionDate ? -1 : 1;
          }
          return a.createdAt - b.createdAt;
        }),
      }))
      .filter((row) => (category ? row.item.category === category : true))
      .filter((row) => matchesSearch(row.item, row.batches, query.search ?? ""))
      .sort((a, b) => a.item.name.localeCompare(b.item.name));
  });
}

export async function getItemWithBatches(itemId: string): Promise<ItemWithBatches | null> {
  return withTransaction(["items", "batches"], "readonly", async (tx) => {
    const stores = cannifyStores(tx);
    const item = await getById<FoodItem>(stores.items, itemId);
    if (!item || item.status !== "active") return null;
    const batches = (await getAllFromIndex<Batch>(stores.batches, "by_item", itemId))
      .filter((batch) => batch.status === "active")
      .sort((a, b) => {
        if (a.productionDate !== b.productionDate) return a.productionDate < b.productionDate ? -1 : 1;
        return a.createdAt - b.createdAt;
      });
    return { item, batches };
  });
}

export async function listHistory(): Promise<HistoryEvent[]> {
  return withTransaction(["history"], "readonly", async (tx) => {
    const rows = await getAll<HistoryEvent>(cannifyStores(tx).history);
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  });
}

export async function listDeleted(): Promise<{
  items: ItemWithBatches[];
  batches: Array<{ batch: Batch; item: FoodItem | null }>;
}> {
  return withTransaction(["items", "batches"], "readonly", async (tx) => {
    const stores = cannifyStores(tx);
    const items = await getAll<FoodItem>(stores.items);
    const batches = await getAll<Batch>(stores.batches);
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const deletedItems = items
      .filter((item) => item.status === "deleted")
      .map((item) => ({
        item,
        batches: batches.filter((batch) => batch.itemId === item.id),
      }))
      .sort((a, b) => (b.item.deletedAt ?? 0) - (a.item.deletedAt ?? 0));
    const deletedBatches = batches
      .filter((batch) => {
        if (batch.status !== "deleted") return false;
        const parent = itemMap.get(batch.itemId);
        return parent?.status === "active";
      })
      .map((batch) => ({ batch, item: itemMap.get(batch.itemId) ?? null }))
      .sort((a, b) => (b.batch.deletedAt ?? 0) - (a.batch.deletedAt ?? 0));
    return { items: deletedItems, batches: deletedBatches };
  });
}

export async function listCategories(): Promise<string[]> {
  const inventory = await listInventory();
  const set = new Set<string>();
  for (const row of inventory) {
    if (row.item.category) set.add(row.item.category);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function itemTotals(batches: Batch[]) {
  return {
    good: availableGood(batches),
    bad: qty(batches.filter((b) => b.status === "active").reduce((sum, b) => sum + b.badQuantity, 0)),
    original: qty(
      batches.filter((b) => b.status === "active").reduce((sum, b) => sum + b.originalQuantity, 0),
    ),
    batchCount: batches.filter((b) => b.status === "active").length,
  };
}

export function resolveQr(raw: string): string {
  const id = parseItemQrPayload(raw);
  if (!id) {
    throw new CannifyError(
      "invalid-qr",
      "This QR code is not a Cannify item code. Scan an item QR from Cannify.",
    );
  }
  return id;
}

export { itemQrPayload, availableGood, planFifoConsumption };
