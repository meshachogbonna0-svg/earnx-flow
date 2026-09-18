import { useRef, useState } from "react";
import { ImageUp, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  value: string;
  onChange: (url: string) => void;
  folder: string;
};

const MAX_BYTES = 2 * 1024 * 1024;

export function ReceiptUpload({ value, onChange, folder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string>("");

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file (JPG, PNG or WEBP).");
    if (file.size > 12 * 1024 * 1024) return toast.error("That image is too large to process. Please choose a smaller receipt.");

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Please sign in again to upload your receipt.");

    setBusy(true);
    setProgress(10);

    const compressReceipt = async (input: File): Promise<File> => {
      const bitmap = await createImageBitmap(input);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Image processing is unavailable.");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let quality = 0.82;
      let blob: Blob | null = null;
      do {
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        quality -= 0.08;
      } while (blob && blob.size > MAX_BYTES && quality >= 0.34);
      if (!blob || blob.size > MAX_BYTES) throw new Error("Receipt is still above the 2MB limit after compression.");
      return new File([blob], `${input.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
    };

    let uploadFile: File;
    try {
      uploadFile = await compressReceipt(file);
    } catch (error) {
      setBusy(false);
      setProgress(0);
      return toast.error("Receipt could not be compressed", { description: error instanceof Error ? error.message : "Please choose another image." });
    }

    const local = URL.createObjectURL(uploadFile);
    setPreview(local);
    const path = `${auth.user.id}/${folder}-${Date.now()}.jpg`;
    const timer = window.setInterval(() => setProgress((p) => Math.min(90, p + 12)), 180);

    const { error } = await supabase.storage.from("receipts").upload(path, uploadFile, { upsert: true, contentType: "image/jpeg", cacheControl: "31536000" });
    window.clearInterval(timer);

    if (error) {
      setBusy(false);
      setProgress(0);
      return toast.error("Upload failed", { description: "Please check your connection and try again." });
    }
    const { data: signed } = await supabase.storage.from("receipts").createSignedUrl(path, 60 * 60 * 24 * 365);
    setProgress(100);
    setBusy(false);
    onChange(signed?.signedUrl ?? path);
    toast.success("Receipt uploaded");
  };

  const remove = () => {
    onChange("");
    setPreview("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const shown = preview || value;

  return (
    <div className="rounded-2xl border border-dashed border-gold/40 bg-secondary/30 p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {shown ? (
        <div className="space-y-2.5">
          <img
            src={shown}
            alt="Payment receipt preview"
            loading="lazy"
            className="max-h-56 w-full rounded-xl border border-border object-contain"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-[11px] font-semibold transition active:scale-[0.98]"
            >
              <RefreshCw className="h-3.5 w-3.5 text-gold" /> Replace
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 py-2.5 text-[11px] font-semibold text-destructive transition active:scale-[0.98]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1.5 py-6 text-center"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/40 bg-gold/10">
            {busy ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin text-gold" />
            ) : (
              <ImageUp className="h-4.5 w-4.5 text-gold" />
            )}
          </span>
          <span className="text-[11px] font-semibold">Upload payment receipt</span>
          <span className="text-[10px] text-muted-foreground">JPG, PNG or WEBP · compressed to max 2MB</span>
        </button>
      )}

      {busy && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gold-gradient transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
