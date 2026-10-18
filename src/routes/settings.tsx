import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CircleHelp, Info, Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ALERT_PERIODS, type AlertPeriod, type AppTheme, type UiSize } from "@/lib/cannify/types";
import { useSettings, useUpdateSettings } from "@/lib/cannify/queries";
import {
  isNativeNotificationsAvailable,
  requestNotificationPermission,
  hasNotificationPermission,
} from "@/lib/notifications";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const PERIOD_LABELS: Record<AlertPeriod, string> = {
  90: "3 months",
  60: "2 months",
  30: "1 month",
  21: "3 weeks",
  14: "2 weeks",
  7: "1 week",
};

function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const value = settings.data;

  async function save(patch: Parameters<typeof update.mutateAsync>[0]) {
    try {
      await update.mutateAsync(patch);
    } catch {
      toast.error("Cannify could not save that setting.");
    }
  }

  async function setNotifications(enabled: boolean) {
    if (enabled) {
      // Android / Capacitor uses the native notification permission system.
      if (isNativeNotificationsAvailable()) {
        const permission = await requestNotificationPermission();

        if (!permission) {
          toast.error(
            "Notification permission was not granted. You can enable notifications in Android settings.",
          );
          return;
        }

        await save({ notificationsEnabled: true });
        toast.success("Best-before alerts are now enabled.");
        return;
      }

      // Normal browser/PWA notification permission.
      if (typeof Notification !== "undefined") {
        let permission = Notification.permission;

        if (permission === "default") {
          permission = await Notification.requestPermission();
        }

        if (!permission) {
          toast.error(
            "Notification permission was not granted. You can enable it in your browser or device settings.",
          );
          return;
        }

        await save({ notificationsEnabled: true });
        toast.success("Best-before alerts are now enabled.");
        return;
      }

      toast.error("Notifications are unavailable on this device.");
      return;
    }

    await save({ notificationsEnabled: false });
    toast.success("Best-before alerts are turned off.");
  }

  async function verifyNotificationPermission() {
    if (!isNativeNotificationsAvailable()) return;

    const permission = await hasNotificationPermission();

    if (!permission) {
      return;
    }

    if (!permission) {
      toast.error(
        "Android has blocked notifications for Cannify. Enable them in Android Settings.",
      );
    }
  }

  if (settings.isPending || !value) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Keep Cannify comfortable to read and choose when you want best-before alerts. All preferences stay on this device."
      />

      <div className="space-y-5">
        <SettingsCard
          title="Appearance"
          icon={value.theme === "dark" ? Moon : value.theme === "light" ? Sun : Monitor}
        >
          <p className="text-sm text-muted-foreground">
            Choose the color scheme that works best for you.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Choice
              label="Light"
              active={value.theme === "light"}
              onClick={() => save({ theme: "light" as AppTheme })}
            />

            <Choice
              label="Dark"
              active={value.theme === "dark"}
              onClick={() => save({ theme: "dark" as AppTheme })}
            />

            <Choice
              label="Use device setting"
              active={value.theme === "system"}
              onClick={() => save({ theme: "system" as AppTheme })}
            />
          </div>
        </SettingsCard>

        <SettingsCard title="Text and interface size" icon={Info}>
          <p className="text-sm text-muted-foreground">
            Text, controls, spacing, and layouts scale together.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            {(["small", "default", "large", "extra-large"] as UiSize[]).map((size) => (
              <Choice
                key={size}
                label={size === "extra-large" ? "Extra large" : size[0].toUpperCase() + size.slice(1)}
                active={value.uiSize === size}
                onClick={() => save({ uiSize: size })}
              />
            ))}
          </div>
        </SettingsCard>

        <SettingsCard title="Best-before notifications" icon={Bell}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Local alerts</p>

              <p className="text-sm text-muted-foreground">
                {isNativeNotificationsAvailable()
                  ? "Cannify can send native Android alerts even when the app is closed."
                  : "Cannify checks dates whenever you open the app."}
              </p>
            </div>

            <Choice
              label={value.notificationsEnabled ? "Alerts on" : "Alerts off"}
              active={value.notificationsEnabled}
              onClick={() => setNotifications(!value.notificationsEnabled)}
            />
          </div>

          <fieldset
            disabled={!value.notificationsEnabled || update.isPending}
            className="mt-5"
            onChange={() => {
              void verifyNotificationPermission();
            }}
          >
            <legend className="text-sm font-medium">
              Alert me before a batch reaches its best-before date
            </legend>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {ALERT_PERIODS.map((period) => {
                const active = value.notificationPeriods.includes(period);

                return (
                  <Choice
                    key={period}
                    label={PERIOD_LABELS[period]}
                    active={active}
                    onClick={() =>
                      save({
                        notificationPeriods: active
                          ? value.notificationPeriods.filter((entry) => entry !== period)
                          : [...value.notificationPeriods, period].sort((a, b) => b - a),
                      })
                    }
                  />
                );
              })}
            </div>
          </fieldset>
        </SettingsCard>

        <SettingsCard title="Help and about" icon={CircleHelp}>
          <p className="text-sm text-muted-foreground">
            Cannify keeps food inventory, images, and preferences locally on this device. It has no
            account, cloud sync, or backup service.
          </p>

          <Button asChild variant="outline" className="mt-4">
            <Link to="/help">Open Help</Link>
          </Button>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Bell;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-display text-2xl font-medium">
        <Icon className="size-5" aria-hidden="true" />
        {title}
      </h2>

      <div className="mt-3">{children}</div>
    </Card>
  );
}

function Choice({
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
      className={
        active
          ? "min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
          : "min-h-11 rounded-lg bg-surface-2 px-3 text-sm font-medium text-fg hover:bg-secondary"
      }
    >
      {label}
    </button>
  );
}
