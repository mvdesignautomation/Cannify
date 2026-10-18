import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/cannify/confirm-dialog";
import { EmptyState } from "@/components/cannify/empty-state";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/cannify/format";
import {
  userFacingError,
  useDeleted,
  usePermanentlyDeleteBatch,
  usePermanentlyDeleteItem,
  useRestoreBatch,
  useRestoreItem,
} from "@/lib/cannify/queries";

export const Route = createFileRoute("/deleted")({ component: DeletedPage });

function DeletedPage() {
  const deleted = useDeleted();
  const restoreItem = useRestoreItem();
  const restoreBatch = useRestoreBatch();
  const wipeItem = usePermanentlyDeleteItem();
  const wipeBatch = usePermanentlyDeleteBatch();
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [pendingBatch, setPendingBatch] = useState<string | null>(null);

  const items = deleted.data?.items ?? [];
  const batches = deleted.data?.batches ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Recovery"
        title="Recently Deleted"
        description="Deleted records can be restored or permanently removed. Consuming or discarding food is not deletion."
      />

      {deleted.isPending ? (
        <Skeleton className="h-48" />
      ) : items.length === 0 && batches.length === 0 ? (
        <EmptyState
          title="Nothing in Recently Deleted"
          description="Deleted food items and independently deleted batches will appear here until you restore or permanently delete them."
        />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-display text-2xl font-medium">Items</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deleted items.</p>
            ) : (
              <div className="grid gap-3">
                {items.map((row) => (
                  <Card key={row.item.id} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-lg font-medium">{row.item.name}</h3>
                          <Badge variant="secondary">{row.batches.length} batches</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Deleted {row.item.deletedAt ? formatDateTime(row.item.deletedAt) : "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              const result = await restoreItem.mutateAsync(row.item.id);
                              toast.success(result.event.summary);
                            } catch (error) {
                              toast.error(userFacingError(error));
                            }
                          }}
                        >
                          Restore
                        </Button>
                        <Button variant="destructive" onClick={() => setPendingItem(row.item.id)}>
                          Delete permanently
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-2xl font-medium">Batches</h2>
            {batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No independently deleted batches.</p>
            ) : (
              <div className="grid gap-3">
                {batches.map(({ batch, item }) => (
                  <Card key={batch.id} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-mono text-sm font-medium">{batch.id}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item?.name ?? "Unknown item"} · Deleted{" "}
                          {batch.deletedAt ? formatDateTime(batch.deletedAt) : "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              const result = await restoreBatch.mutateAsync(batch.id);
                              toast.success(result.event.summary);
                            } catch (error) {
                              toast.error(userFacingError(error));
                            }
                          }}
                        >
                          Restore
                        </Button>
                        <Button variant="destructive" onClick={() => setPendingBatch(batch.id)}>
                          Delete permanently
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingItem)}
        onOpenChange={(open) => !open && setPendingItem(null)}
        title="Permanently delete this item?"
        description="This removes the item and its batches from this device. History events remain. This cannot be undone."
        confirmLabel="Delete permanently"
        destructive
        onConfirm={async () => {
          if (!pendingItem) return;
          try {
            await wipeItem.mutateAsync(pendingItem);
            toast.success("Item permanently deleted.");
            setPendingItem(null);
          } catch (error) {
            toast.error(userFacingError(error));
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingBatch)}
        onOpenChange={(open) => !open && setPendingBatch(null)}
        title="Permanently delete this batch?"
        description="This removes the batch from this device. History events remain. This cannot be undone."
        confirmLabel="Delete permanently"
        destructive
        onConfirm={async () => {
          if (!pendingBatch) return;
          try {
            await wipeBatch.mutateAsync(pendingBatch);
            toast.success("Batch permanently deleted.");
            setPendingBatch(null);
          } catch (error) {
            toast.error(userFacingError(error));
          }
        }}
      />
    </div>
  );
}
