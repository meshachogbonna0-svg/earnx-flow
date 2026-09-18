import { Download, Maximize2, Minus, Plus, RotateCw, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Thumbnail + full-screen zoomable viewer for an uploaded payment receipt. */
export function ReceiptViewer({ url, label = "Payment receipt" }: { url?: string | null; label?: string }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!url) {
    return (
      <p className="rounded-xl border border-dashed border-border px-3 py-2 text-[10px] text-muted-foreground">
        No receipt uploaded
      </p>
    );
  }

  const isPdf = url.toLowerCase().includes(".pdf");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setZoom(1);
          setRotation(0);
          setOpen(true);
        }}
        className="group relative block w-full overflow-hidden rounded-xl border border-border bg-secondary/40"
      >
        {isPdf ? (
          <span className="flex h-24 items-center justify-center text-[11px] font-semibold text-gold">
            View PDF receipt
          </span>
        ) : (
          <img src={url} alt={label} loading="lazy" className="h-28 w-full object-cover" />
        )}
        <span className="absolute inset-0 grid place-items-center bg-background/60 opacity-0 transition group-hover:opacity-100">
          <Maximize2 className="h-4 w-4 text-gold" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-xs font-bold text-gold">{label}</p>
            <div className="flex items-center gap-1.5">
              <IconButton onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} icon={Minus} label="Zoom out" />
              <span className="w-10 text-center text-[10px] text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <IconButton onClick={() => setZoom((z) => Math.min(4, z + 0.25))} icon={Plus} label="Zoom in" />
              <IconButton onClick={() => setRotation((r) => (r + 90) % 360)} icon={RotateCw} label="Rotate" />
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                download
                aria-label="Download receipt"
                className="grid h-8 w-8 place-items-center rounded-lg border border-border transition active:scale-95"
              >
                <Download className="h-3.5 w-3.5 text-gold" />
              </a>
              <IconButton onClick={() => setOpen(false)} icon={X} label="Close" />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {isPdf ? (
              <iframe title={label} src={url} className="h-full min-h-[70vh] w-full rounded-xl border border-border" />
            ) : (
              <img
                src={url}
                alt={label}
                className="mx-auto origin-top transition-transform duration-200"
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function IconButton({
  onClick,
  icon: Icon,
  label,
  className,
}: {
  onClick: () => void;
  icon: typeof X;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg border border-border transition active:scale-95",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 text-gold" />
    </button>
  );
}
