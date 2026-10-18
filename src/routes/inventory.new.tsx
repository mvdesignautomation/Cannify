import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ItemForm } from "@/components/cannify/item-form";
import { PageHeader } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { userFacingError, useCategories, useCreateBatch, useCreateItem } from "@/lib/cannify/queries";

export const Route = createFileRoute("/inventory/new")({ component: NewItemPage });

function NewItemPage() {
  const navigate = useNavigate();
  const create = useCreateItem();
  const createBatch = useCreateBatch();
  const categories = useCategories();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        eyebrow="Inventory"
        title="New food item"
        description="Items can have several independent batches. Add the item first, then record each batch."
      />
      <Card className="p-5">
        <ItemForm
          categories={categories.data ?? []}
          submitLabel="Create item"
          pending={create.isPending || createBatch.isPending}
          allowInitialBatch
          onSubmit={async (value) => {
            try {
              const item = await create.mutateAsync(value);
              if (value.initialBatch) {
                await createBatch.mutateAsync({
                  itemId: item.id,
                  productionDate: value.initialBatch.productionDate,
                  bestBeforeDate: value.initialBatch.bestBeforeDate,
                  originalQuantity: Number(value.initialBatch.originalQuantity),
                  note: value.initialBatch.note,
                });
              }
              toast.success(value.initialBatch ? `${item.name} and its first batch were added.` : `${item.name} is in inventory. Add a batch when you are ready.`);
              await navigate({ to: "/inventory/$itemId", params: { itemId: item.id } });
            } catch (error) {
              toast.error(userFacingError(error));
            }
          }}
        />
      </Card>
    </div>
  );
}
