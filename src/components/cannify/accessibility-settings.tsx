import { useEffect } from "react";
import { daysUntil } from "@/lib/cannify/format";
import { useInventory, useSettings } from "@/lib/cannify/queries";

export function AccessibilitySettings() {
  const settings = useSettings();
  const inventory = useInventory();

  useEffect(() => {
    const current = settings.data;
    if (!current) return;
    const root = document.documentElement;
    root.dataset.theme = current.theme;
    root.dataset.uiSize = current.uiSize;
  }, [settings.data]);

  useEffect(() => {
    const current = settings.data;
    if (
      !current?.notificationsEnabled ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted" ||
      !inventory.data
    ) {
      return;
    }
    const checkKey = "cannify:best-before-notification-check";
    const today = new Date().toDateString();
    if (window.localStorage.getItem(checkKey) === today) return;

    const due = inventory.data.flatMap((row) =>
      row.batches
        .filter((batch) => {
          const remaining = daysUntil(batch.bestBeforeDate);
          return remaining != null && current.notificationPeriods.includes(remaining as never);
        })
        .map((batch) => ({ name: row.item.name, batchId: batch.id, remaining: daysUntil(batch.bestBeforeDate)! })),
    );
    if (due.length) {
      const first = due[0];
      const suffix = due.length > 1 ? ` and ${due.length - 1} more` : "";
      new Notification("Cannify best-before alert", {
        body: `${first.name} (${first.batchId}) is due in ${first.remaining} day${first.remaining === 1 ? "" : "s"}${suffix}.`,
        icon: "/__grok/icon-180.png",
      });
    }
    window.localStorage.setItem(checkKey, today);
  }, [inventory.data, settings.data]);

  return null;
}
