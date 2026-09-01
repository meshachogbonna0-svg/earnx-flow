import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Admin media uploader (images, videos, documents) backed by the private media bucket. */
export function MediaUpload({
  value,
  onChange,
  folder,
  accept = "image/*",
  label = "Upload file",
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${folder}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (error) {
      setBusy(false);
      return toast.error("Upload failed", { description: error.message });
    }
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, TEN_YEARS);
    setBusy(false);
    onChange(signed?.signedUrl ?? path);
    toast.success("File uploaded");
  };

  const isImage = /\.(png|jpe?g|webp|gif|avif)/i.test(value) || value.includes("image");

  return (
    <div className="mt-1 space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
      {value && isImage && (
        <img src={value} alt="Uploaded preview" className="h-24 w-full rounded-xl border border-border object-cover" />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2 text-[10px] font-semibold text-gold transition active:scale-[0.98]"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {value ? "Replace file" : label}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-xl border border-destructive/40 px-3 py-2 text-[10px] font-semibold text-destructive transition active:scale-95"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="or paste a link"
        className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-[10px] outline-none transition focus:border-gold/60"
      />
    </div>
  );
}
