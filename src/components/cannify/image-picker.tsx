import { ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { readImageFile } from "@/lib/cannify/image";
import { toast } from "sonner";

export function ImagePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label htmlFor="item-image">Image</Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="relative size-20 overflow-hidden rounded-lg bg-surface-2 shadow-[var(--shadow-border)]"
          aria-label={value ? "Change item image" : "Add item image"}
        >
          {value ? (
            <img src={value} alt="" className="item-photo size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImagePlus className="size-5" />
            </span>
          )}
        </button>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {value ? "Replace photo" : "Add photo"}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              <X className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
        <input
          id="item-image"
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            try {
              onChange(await readImageFile(file));
            } catch {
              toast.error("Could not read that image. Try another photo.");
            }
          }}
        />
      </div>
    </div>
  );
}
