import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import jsQR from "jsqr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CannifyError, userFacingError } from "@/lib/cannify/errors";
import { getItemWithBatches, resolveQr } from "@/lib/cannify/services";

type DetectorCtor = {
  new (options?: { formats?: string[] }): {
    detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
  };
};

function getDetector(): DetectorCtor | null {
  const ctor = (window as Window & { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

export function QrScanner() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);

  async function openItem(raw: string) {
    const itemId = resolveQr(raw);
    const found = await getItemWithBatches(itemId);
    if (!found) {
      throw new CannifyError("missing-item", "No matching food item was found for that QR code.");
    }
    await navigate({ to: "/inventory/$itemId", params: { itemId }, search: { from: "scan" } });
  }

  async function decodeQrImageFile(file: File): Promise<string | null> {
    const Detector = getDetector();
    if (Detector) {
      try {
        const bitmap = await createImageBitmap(file);
        const codes = await new Detector({ formats: ["qr_code"] }).detect(bitmap);
        bitmap.close();
        if (codes[0]?.rawValue) {
          return codes[0].rawValue;
        }
      } catch {
        // Fallback to jsQR
      }
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image canvas.");
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    return result?.data ?? null;
  }

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const Detector = getDetector();
        const nativeDetector = Detector ? new Detector({ formats: ["qr_code"] }) : null;

        const tick = async () => {
          if (stopped) return;
          try {
            if (video.readyState >= 2) {
              let raw: string | null = null;

              if (nativeDetector) {
                try {
                  const codes = await nativeDetector.detect(video);
                  raw = codes[0]?.rawValue ?? null;
                } catch {
                  // Fallback to jsQR
                }
              }

              if (!raw && ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                raw = code?.data ?? null;
              }

              if (raw) {
                stopped = true;
                await openItem(raw);
                return;
              }
            }
          } catch {
            // Keep scanning; a single failed frame is not fatal.
          }
          timer = window.setTimeout(tick, 200);
        };
        tick();
      } catch {
        setCameraError("Camera access was blocked. Upload a photo of the QR code instead.");
      }
    }

    start();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
      <Card className="overflow-hidden p-0">
        <video
          ref={videoRef}
          className="aspect-[3/4] w-full bg-fg object-cover sm:aspect-video"
          playsInline
          muted
          aria-label="QR camera preview"
        />
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-xl font-medium">Scan an item</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Point the camera at a Cannify item QR code. This opens consume and add-batch actions for that item.
        </p>
        {cameraError ? <p className="mt-3 text-sm text-warn">{cameraError}</p> : null}
        <form
          className="mt-5 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              await openItem(manual);
            } catch (error) {
              toast.error(userFacingError(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="qr-manual">Or paste a Cannify item code</Label>
            <Input
              id="qr-manual"
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              placeholder="cannify:item:…"
            />
          </div>
          <Button type="submit" disabled={busy || !manual.trim()}>
            Open item
          </Button>
        </form>
        <div className="mt-5 space-y-2">
          <Label htmlFor="qr-file">Upload a QR photo</Label>
          <Input
            id="qr-file"
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const raw = await decodeQrImageFile(file);
                if (!raw) {
                  toast.error("No QR code was found in that image.");
                  return;
                }
                await openItem(raw);
              } catch (error) {
                toast.error(userFacingError(error));
              }
            }}
          />
        </div>
      </Card>
    </div>
  );
}
