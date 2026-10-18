import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  consumeItem,
  createBatch,
  createItem,
  deleteBatch,
  deleteItem,
  discardFromBatch,
  getItemWithBatches,
  listCategories,
  listDeleted,
  listHistory,
  listInventory,
  getSettings,
  permanentlyDeleteBatch,
  permanentlyDeleteItem,
  restoreBatch,
  restoreItem,
  updateBatch,
  updateItem,
  updateSettings,
  type CreateBatchInput,
  type CreateItemInput,
  type InventoryQuery,
} from "./services";
import { userFacingError } from "./errors";

export const cannifyKeys = {
  all: ["cannify"] as const,
  inventory: (query: InventoryQuery = {}) => ["cannify", "inventory", query] as const,
  item: (id: string) => ["cannify", "item", id] as const,
  history: () => ["cannify", "history"] as const,
  deleted: () => ["cannify", "deleted"] as const,
  categories: () => ["cannify", "categories"] as const,
  settings: () => ["cannify", "settings"] as const,
};

function browserEnabled() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export function useInventory(query: InventoryQuery = {}) {
  return useQuery({
    queryKey: cannifyKeys.inventory(query),
    queryFn: () => listInventory(query),
    enabled: browserEnabled(),
  });
}

export function useItem(itemId: string | undefined) {
  return useQuery({
    queryKey: cannifyKeys.item(itemId ?? ""),
    queryFn: () => getItemWithBatches(itemId!),
    enabled: browserEnabled() && Boolean(itemId),
  });
}

export function useHistory() {
  return useQuery({
    queryKey: cannifyKeys.history(),
    queryFn: listHistory,
    enabled: browserEnabled(),
  });
}

export function useDeleted() {
  return useQuery({
    queryKey: cannifyKeys.deleted(),
    queryFn: listDeleted,
    enabled: browserEnabled(),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: cannifyKeys.categories(),
    queryFn: listCategories,
    enabled: browserEnabled(),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: cannifyKeys.settings(),
    queryFn: getSettings,
    enabled: browserEnabled(),
  });
}

export function useCannifyMutation<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: cannifyKeys.all });
    },
  });
}

export function useCreateItem() {
  return useCannifyMutation((input: CreateItemInput) => createItem(input));
}

export function useUpdateItem() {
  return useCannifyMutation(
    (input: { id: string } & Partial<CreateItemInput>) => updateItem(input.id, input),
  );
}

export function useUpdateSettings() {
  return useCannifyMutation(updateSettings);
}

export function useCreateBatch() {
  return useCannifyMutation((input: CreateBatchInput) => createBatch(input));
}

export function useUpdateBatch() {
  return useCannifyMutation(
    (
      input: { id: string } & Partial<
        Pick<CreateBatchInput, "productionDate" | "bestBeforeDate" | "note">
      >,
    ) => updateBatch(input.id, input),
  );
}

export function useConsumeItem() {
  return useCannifyMutation((input: { itemId: string; quantity: number }) =>
    consumeItem(input.itemId, input.quantity),
  );
}

export function useDiscardBatch() {
  return useCannifyMutation((input: { batchId: string; quantity: number; reason: string }) =>
    discardFromBatch(input.batchId, input.quantity, input.reason),
  );
}

export function useDeleteItem() {
  return useCannifyMutation((itemId: string) => deleteItem(itemId));
}

export function useDeleteBatch() {
  return useCannifyMutation((batchId: string) => deleteBatch(batchId));
}

export function useRestoreItem() {
  return useCannifyMutation((itemId: string) => restoreItem(itemId));
}

export function useRestoreBatch() {
  return useCannifyMutation((batchId: string) => restoreBatch(batchId));
}

export function usePermanentlyDeleteItem() {
  return useCannifyMutation((itemId: string) => permanentlyDeleteItem(itemId));
}

export function usePermanentlyDeleteBatch() {
  return useCannifyMutation((batchId: string) => permanentlyDeleteBatch(batchId));
}

export { userFacingError };
