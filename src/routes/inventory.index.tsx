import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/cannify/empty-state";
import { ItemCard } from "@/components/cannify/item-card";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCategories, useInventory } from "@/lib/cannify/queries";

export const Route = createFileRoute("/inventory/")({ component: InventoryPage });

function InventoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const inventory = useInventory({ search, category });
  const categories = useCategories();
  const chips = categories.data ?? [];
  const rows = inventory.data ?? [];

  const emptyTitle = useMemo(() => {
    if (search || category) return "No matching items";
    return "Inventory is empty";
  }, [search, category]);

  return (
    <div>
      <PageHeader
        eyebrow="Pantry"
        title="Inventory"
        description="Browse food items and their independent batches. Search by name, category, note, or batch ID."
        actions={
          <Button asChild>
            <Link to="/inventory/new">Add item</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search inventory"
          aria-label="Search inventory"
        />
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            <FilterChip label="All" active={category == null} onClick={() => setCategory(null)} />
            {chips.map((chip) => (
              <FilterChip
                key={chip}
                label={chip}
                active={category === chip}
                onClick={() => setCategory(category === chip ? null : chip)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {inventory.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={
            search || category
              ? "Try a different search or clear the category filter."
              : "Add a food item, then record independent batches with their own quantities and dates."
          }
          action={
            <Button asChild>
              <Link to="/inventory/new">Add item</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <ItemCard key={row.item.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center rounded-full px-3 text-sm font-medium",
        active ? "bg-primary text-primary-foreground" : "bg-surface text-fg shadow-[var(--shadow-border)]",
      )}
    >
      {label}
    </button>
  );
}
