import { Capacitor } from "@capacitor/core";
import {
  LocalNotifications,
  type PermissionStatus,
  type ScheduleOptions,
} from "@capacitor/local-notifications";

const CHANNEL_ID = "cannify-best-before";
const CHANNEL_NAME = "Best-before alerts";
const CHANNEL_DESCRIPTION =
  "Notifications for items approaching their best-before date.";

const TEST_NOTIFICATION_ID = 999_999_999;

/**
 * Returns true when Cannify is running inside a native Capacitor app.
 */
export function isNativeNotificationsAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Create the Android notification channel used by Cannify.
 *
 * This is safe to call repeatedly.
 */
export async function ensureNotificationChannel(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: CHANNEL_NAME,
    description: CHANNEL_DESCRIPTION,
    importance: 4,
    visibility: 1,
    sound: "default",
    vibration: true,
  });
}

/**
 * Check whether Cannify currently has notification permission.
 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const permission = await LocalNotifications.checkPermissions();
    return permission.display === "granted";
  }

  if (typeof Notification === "undefined") {
    return false;
  }

  return Notification.permission === "granted";
}

/**
 * Request notification permission.
 *
 * Android uses Capacitor's native permission API.
 * Browsers continue using the standard Notification API.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    await ensureNotificationChannel();

    let permission: PermissionStatus =
      await LocalNotifications.checkPermissions();

    if (permission.display !== "granted") {
      permission = await LocalNotifications.requestPermissions();
    }

    return permission.display === "granted";
  }

  if (typeof Notification === "undefined") {
    return false;
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return Notification.permission === "granted";
}

/**
 * Disable/cancel all notifications owned by Cannify.
 *
 * This currently uses the notification IDs that are tracked by the
 * notification service. The best-before scheduler can use the same
 * ID scheme through scheduleBestBeforeNotification().
 */
export async function cancelNotifications(
  ids: number[] = [],
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  if (ids.length === 0) return;

  await LocalNotifications.cancel({
    notifications: ids.map((id) => ({ id })),
  });
}

/**
 * Schedule one native Android notification.
 */
export async function scheduleNotification(options: {
  id: number;
  title: string;
  body: string;
  at: Date;
  extra?: Record<string, unknown>;
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await ensureNotificationChannel();

  const permission = await hasNotificationPermission();

  if (!permission) {
    throw new Error("Notification permission has not been granted.");
  }

  if (!(options.at instanceof Date) || Number.isNaN(options.at.getTime())) {
    throw new Error("Invalid notification date.");
  }

  if (options.at.getTime() <= Date.now()) {
    return;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: options.id,
        title: options.title,
        body: options.body,
        channelId: CHANNEL_ID,
        schedule: {
          at: options.at,
          allowWhileIdle: true,
        },
        extra: options.extra,
      },
    ],
  });
}

/**
 * Cancel and replace a notification with the same ID.
 *
 * This makes reconciliation safe to run repeatedly.
 */
export async function rescheduleNotification(options: {
  id: number;
  title: string;
  body: string;
  at: Date;
  extra?: Record<string, unknown>;
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LocalNotifications.cancel({
      notifications: [{ id: options.id }],
    });
  } catch {
    // It is okay if the notification did not previously exist.
  }

  await scheduleNotification(options);
}

/**
 * Generate a deterministic notification ID.
 *
 * The same batch + alert period will always produce the same ID.
 *
 * Android notification IDs must be integers, so we hash the logical
 * notification identity into a positive 32-bit integer.
 */
export function getBestBeforeNotificationId(
  batchId: string,
  alertPeriodDays: number,
): number {
  const input = `cannify:${batchId}:${alertPeriodDays}`;

  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // Keep IDs positive and away from the reserved test ID.
  const id = Math.abs(hash) % 2_000_000_000;

  return id === TEST_NOTIFICATION_ID ? id - 1 : id;
}

/**
 * Schedule a Cannify best-before notification.
 *
 * `bestBefore` should represent the user's local best-before date.
 * The notification fires `alertPeriodDays` before that date.
 */
export async function scheduleBestBeforeNotification(options: {
  batchId: string;
  itemName: string;
  bestBefore: Date;
  alertPeriodDays: number;
}): Promise<void> {
  const notificationId = getBestBeforeNotificationId(
    options.batchId,
    options.alertPeriodDays,
  );

  const notificationDate = new Date(options.bestBefore);
  notificationDate.setDate(
    notificationDate.getDate() - options.alertPeriodDays,
  );

  if (notificationDate.getTime() <= Date.now()) {
    return;
  }

  const bestBeforeLabel = formatLocalDate(options.bestBefore);

  const periodLabel =
    options.alertPeriodDays === 1
      ? "1 day"
      : `${options.alertPeriodDays} days`;

  await rescheduleNotification({
    id: notificationId,
    title: `${options.itemName} is approaching its best-before date`,
    body: `${options.itemName} reaches its best-before date on ${bestBeforeLabel}. This is your ${periodLabel}-before reminder.`,
    at: notificationDate,
    extra: {
      type: "best-before",
      batchId: options.batchId,
      alertPeriodDays: options.alertPeriodDays,
    },
  });
}

/**
 * Cancel one best-before notification.
 */
export async function cancelBestBeforeNotification(options: {
  batchId: string;
  alertPeriodDays: number;
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const id = getBestBeforeNotificationId(
    options.batchId,
    options.alertPeriodDays,
  );

  await cancelNotifications([id]);
}

/**
 * Cancel every configured alert period for a batch.
 */
export async function cancelAllBestBeforeNotifications(
  batchId: string,
  alertPeriods: readonly number[],
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const ids = alertPeriods.map((period) =>
    getBestBeforeNotificationId(batchId, period),
  );

  await cancelNotifications(ids);
}

/**
 * Schedule all selected best-before alerts for a batch.
 */
export async function scheduleBestBeforeNotifications(options: {
  batchId: string;
  itemName: string;
  bestBefore: Date;
  alertPeriods: readonly number[];
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const permission = await hasNotificationPermission();

  if (!permission) {
    throw new Error("Notification permission has not been granted.");
  }

  await ensureNotificationChannel();

  for (const period of options.alertPeriods) {
    await scheduleBestBeforeNotification({
      batchId: options.batchId,
      itemName: options.itemName,
      bestBefore: options.bestBefore,
      alertPeriodDays: period,
    });
  }
}

/**
 * Test notification.
 *
 * Schedules a notification 30 seconds from now.
 *
 * This is intentionally retained as a proper service function so it can
 * also be used from Settings during development/testing.
 */
export async function scheduleTestNotification(): Promise<void> {
  const permission = await requestNotificationPermission();

  if (!permission) {
    throw new Error("Notification permission was not granted.");
  }

  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification === "undefined") {
      throw new Error("Browser notifications are unavailable.");
    }

    new Notification("Cannify test notification", {
      body: "Cannify notifications are working.",
    });

    return;
  }

  await ensureNotificationChannel();

  await rescheduleNotification({
    id: TEST_NOTIFICATION_ID,
    title: "Cannify test notification",
    body: "Cannify Android local notifications are working.",
    at: new Date(Date.now() + 30_000),
    extra: {
      type: "test",
    },
  });
}

/**
 * Format a Date using the device's local timezone.
 */
function formatLocalDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}