export const HISTORY_TYPES = ["added", "consumed", "discarded", "restored"] as const;
export type HistoryType = (typeof HISTORY_TYPES)[number];

export const RECORD_STATUS = ["active", "deleted"] as const;
export type RecordStatus = (typeof RECORD_STATUS)[number];

export const APP_THEMES = ["light", "dark", "system"] as const;
export type AppTheme = (typeof APP_THEMES)[number];

export const UI_SIZES = ["small", "default", "large", "extra-large"] as const;
export type UiSize = (typeof UI_SIZES)[number];

export const ALERT_PERIODS = [90, 60, 30, 21, 14, 7] as const;
export type AlertPeriod = (typeof ALERT_PERIODS)[number];

export type QuantityAllocation = {
  batchId: string;
  amount: number;
};

export type FoodItem = {
  id: string;
  name: string;
  category: string;
  note: string;
  imageDataUrl: string | null;
  createdAt: number;
  updatedAt: number;
  status: RecordStatus;
  deletedAt: number | null;
};

export type Batch = {
  id: string;
  itemId: string;
  productionDate: string;
  bestBeforeDate: string | null;
  originalQuantity: number;
  goodQuantity: number;
  badQuantity: number;
  note: string;
  createdAt: number;
  updatedAt: number;
  status: RecordStatus;
  deletedAt: number | null;
};

export type HistoryEvent = {
  id: string;
  type: HistoryType;
  itemId: string;
  itemName: string;
  batchId: string | null;
  quantity: number;
  reason: string | null;
  summary: string;
  allocations: QuantityAllocation[];
  createdAt: number;
};

export type ItemWithBatches = {
  item: FoodItem;
  batches: Batch[];
};

export type InventorySnapshot = {
  items: ItemWithBatches[];
  history: HistoryEvent[];
  deletedItems: ItemWithBatches[];
  deletedBatches: Array<{ batch: Batch; item: FoodItem | null }>;
};

export type ConsumePlan = {
  itemId: string;
  quantity: number;
  allocations: QuantityAllocation[];
  available: number;
};

export type CannifySettings = {
  id: "app";
  theme: AppTheme;
  uiSize: UiSize;
  notificationsEnabled: boolean;
  notificationPeriods: AlertPeriod[];
};

export const QR_PREFIX = "cannify:item:";

export const BATCH_NOTE_MAX = 100;
export const ITEM_NOTE_MAX = 500;
export const ITEM_NAME_MAX = 80;
export const CATEGORY_MAX = 40;
export const DISCARD_REASON_MAX = 120;
