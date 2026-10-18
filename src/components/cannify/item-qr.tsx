import { Download, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { itemQrPayload } from "@/lib/cannify/ids";

export function ItemQr({ itemId, itemName }: { itemId: string; itemName: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const payload = itemQrPayload(itemId);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, {
      width: 280,
      margin: 1,
      color: { dark: "#1a2420", light: "#fbf7f0" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  return (
    <Card className="p-5">
      <h2 className="font-display text-xl font-medium">Item QR</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This code opens {itemName}. It is for the food item, not an individual batch.
      </p>
      <div className="mt-4 flex justify-center rounded-lg bg-surface-2 p-4">
        {src ? (
          <img src={src} alt={`QR code for ${itemName}`} className="size-44" />
        ) : (
          <Skeleton className="size-44" />
        )}
      </div>
      <p className="mt-3 break-all text-center font-mono text-xs text-muted-foreground">{payload}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" disabled={!src} onClick={() => src && downloadQr(src, itemName)}>
          <Download className="size-4" />Download image
        </Button>
        <Button type="button" variant="outline" disabled={!src} onClick={() => src && shareQr(src, itemName, payload)}>
          <Share2 className="size-4" />Share QR
        </Button>
      </div>
    </Card>
  );
}

function fileName(name: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item"}-cannify-qr.png`;
}

function downloadQr(src: string, itemName: string) {
  const link = document.createElement("a");
  link.href = src;
  link.download = fileName(itemName);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function shareQr(src: string, itemName: string, payload: string) {
  const filename = fileName(itemName);
  try {
    const blob = await (await fetch(src)).blob();
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: `${itemName} QR`, text: payload, files: [file] });
      return;
    }
    downloadQr(src, itemName);
    toast.message("Sharing is not available here, so the QR image was downloaded.");
  } catch {
    toast.error("Cannify could not share this QR image.");
  }
}
