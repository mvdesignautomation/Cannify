import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/cannify/empty-state";
import { ItemForm } from "@/components/cannify/item-form";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { userFacingError, useCategories, useItem, useUpdateItem } from "@/lib/cannify/queries";

export const Route = createFileRoute("/inventory/$itemId_/edit")({
  component: EditItemPage,
});

function EditItemPage() {
  const { itemId } = Route.useParams();
  const navigate = useNavigate();
  const query = useItem(itemId);
  const update = useUpdateItem();
  const categories = useCategories();

  if (query.isPending) return <Skeleton className="h-64" />;
  if (!query.data) {
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

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Inventory" title={`Edit ${query.data.item.name}`} />
      <Card className="p-5">
        <ItemForm
          initial={query.data.item}
          categories={categories.data ?? []}
          submitLabel="Save item"
          pending={update.isPending}
          onSubmit={async (value) => {
            try {
              await update.mutateAsync({ id: itemId, ...value });
              toast.success("Item updated.");
              await navigate({ to: "/inventory/$itemId", params: { itemId } });
            } catch (error) {
              toast.error(userFacingError(error));
            }
          }}
        />
      </Card>
    </div>
  );
}
