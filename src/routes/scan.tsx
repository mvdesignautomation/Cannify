import { createFileRoute } from "@tanstack/react-router";
import { QrScanner } from "@/components/cannify/qr-scanner";
import { PageHeader } from "@/components/layout/app-shell";

export const Route = createFileRoute("/scan")({ component: ScanPage });

function ScanPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Item QR"
        title="Scan"
        description="Scan a Cannify item QR to consume food or add a batch. QR codes represent the food item, not a single batch."
      />
      <QrScanner />
    </div>
  );
}
