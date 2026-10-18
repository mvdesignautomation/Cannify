import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Utensils } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BatchCard } from "@/components/cannify/batch-card";
import { BatchForm, type BatchFormValue } from "@/components/cannify/batch-form";
import { ConfirmDialog } from "@/components/cannify/confirm-dialog";
import { ConsumePanel } from "@/components/cannify/consume-panel";
import { DiscardDialog } from "@/components/cannify/discard-dialog";
import { EmptyState } from "@/components/cannify/empty-state";
import { ItemQr } from "@/components/cannify/item-qr";
import { JarMark } from "@/components/cannify/logo";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatQty } from "@/lib/cannify/fifo";
import {
  userFacingError,
  useCreateBatch,
  useDeleteBatch,
  useDeleteItem,
  useItem,
  useUpdateBatch,
} from "@/lib/cannify/queries";
import { itemTotals } from "@/lib/cannify/services";
import type { Batch } from "@/lib/cannify/types";

type ItemSearch = { from?: "scan" };

export const Route = createFileRoute("/inventory/$itemId")({
  validateSearch: (search: Record<string, unknown>): ItemSearch => ({
    from: search.from === "scan" ? "scan" : undefined,
  }),
  component: ItemDetailPage,
});

function parseQuantity(value: string): number {
  return Number(value);
}

function ItemDetailPage() {
  const { itemId } = Route.useParams();
  const { from } = Route.useSearch();
  const navigate = useNavigate();
  const query = useItem(itemId);
  const createBatch = useCreateBatch();
  const updateBatch = useUpdateBatch();
  const deleteItem = useDeleteItem();
  const deleteBatch = useDeleteBatch();

  const [addOpen, setAddOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<Batch | null>(null);
  const [discardBatch, setDiscardBatch] = useState<Batch | null>(null);
  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [pendingBatchDelete, setPendingBatchDelete] = useState<Batch | null>(null);

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const row = query.data;
  if (!row) {
    return (
      <EmptyState
        title="Item not found"
        description="This food item is missing or was deleted."
        action={
          <Button asChild>
            <Link to="/inventory">Back to inventory</Link>
          </Button>
        }
      />
    );
  }

  const totals = itemTotals(row.batches);
  const scanned = from === "scan";

  async function submitNewBatch(value: BatchFormValue) {
    try {
      const result = await createBatch.mutateAsync({
        itemId,
        productionDate: value.productionDate,
        bestBeforeDate: value.bestBeforeDate || null,
        originalQuantity: parseQuantity(value.originalQuantity),
        note: value.note,
      });
      toast.success(result.event.summary);
      setAddOpen(false);
    } catch (error) {
      toast.error(userFacingError(error));
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Food item"
        title={row.item.name}
        description={row.item.note || "Independent batches stay separate. Good quantity is what can be consumed."}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/inventory/$itemId/edit" params={{ itemId }}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setDeleteItemOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        }
      />

      {scanned ? (
        <div className="mb-5 rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground">
          Scanned item. Consume using FIFO, or add a new batch, without opening a batch-specific code.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex gap-4">
              <div className="size-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {row.item.imageDataUrl ? (
                  <img
                    src={row.item.imageDataUrl}
                    alt={`${row.item.name}`}
                    className="item-photo size-full object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-primary">
                    <JarMark className="size-12" />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                {row.item.category ? <Badge variant="secondary">{row.item.category}</Badge> : null}
                <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Batches</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{totals.batchCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Good</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{formatQty(totals.good)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Discarded</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{formatQty(totals.bad)}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                Add batch
              </Button>
              <Button asChild variant="outline">
                <Link to="/consume" search={{ itemId }}>
                  <Utensils className="size-4" />
                  Consume
                </Link>
              </Button>
            </div>
          </Card>

          {scanned ? <ConsumePanel row={row} /> : null}

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-medium">Batches</h2>
              <p className="text-sm text-muted-foreground">Each batch keeps its own dates and quantities.</p>
            </div>
            {row.batches.length === 0 ? (
              <EmptyState
                title="No batches yet"
                description="Add a batch to record original quantity, production date, and best-before date."
                action={
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus className="size-4" />
                    Add batch
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3">
                {row.batches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    onEdit={() => setEditBatch(batch)}
                    onDiscard={() => setDiscardBatch(batch)}
                    onDelete={() => setPendingBatchDelete(batch)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <ItemQr itemId={row.item.id} itemName={row.item.name} />
          {!scanned && totals.good > 0 ? <ConsumePanel row={row} /> : null}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add batch</DialogTitle>
            <DialogDescription>
              New batches stay independent. Original quantity is stored and is not overwritten later.
            </DialogDescription>
          </DialogHeader>
          <BatchForm submitLabel="Save batch" pending={createBatch.isPending} onSubmit={submitNewBatch} />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editBatch)} onOpenChange={(open) => !open && setEditBatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit batch {editBatch?.id}</DialogTitle>
            <DialogDescription>Dates and notes can be corrected. Original quantity stays in history.</DialogDescription>
          </DialogHeader>
          {editBatch ? (
            <BatchForm
              initial={editBatch}
              lockQuantity
              submitLabel="Save changes"
              pending={updateBatch.isPending}
              onSubmit={async (value) => {
                try {
                  await updateBatch.mutateAsync({
                    id: editBatch.id,
                    productionDate: value.productionDate,
                    bestBeforeDate: value.bestBeforeDate || null,
                    note: value.note,
                  });
                  toast.success(`Updated ${editBatch.id}`);
                  setEditBatch(null);
                } catch (error) {
                  toast.error(userFacingError(error));
                }
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <DiscardDialog
        batch={discardBatch}
        open={Boolean(discardBatch)}
        onOpenChange={(open) => {
          if (!open) setDiscardBatch(null);
        }}
      />

      <ConfirmDialog
        open={deleteItemOpen}
        onOpenChange={setDeleteItemOpen}
        title={`Delete ${row.item.name}?`}
        description="The item and its batches move to Recently Deleted. You can restore them later. This is not the same as consuming or discarding food."
        confirmLabel="Move to Recently Deleted"
        destructive
        onConfirm={async () => {
          try {
            await deleteItem.mutateAsync(row.item.id);
            toast.success(`${row.item.name} moved to Recently Deleted.`);
            await navigate({ to: "/inventory" });
          } catch (error) {
            toast.error(userFacingError(error));
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingBatchDelete)}
        onOpenChange={(open) => !open && setPendingBatchDelete(null)}
        title={`Delete batch ${pendingBatchDelete?.id}?`}
        description="This batch moves to Recently Deleted. Consumption and discard history stay intact."
        confirmLabel="Move to Recently Deleted"
        destructive
        onConfirm={async () => {
          if (!pendingBatchDelete) return;
          try {
            await deleteBatch.mutateAsync(pendingBatchDelete.id);
            toast.success(`${pendingBatchDelete.id} moved to Recently Deleted.`);
            setPendingBatchDelete(null);
          } catch (error) {
            toast.error(userFacingError(error));
          }
        }}
      />
    </div>
  );
}
