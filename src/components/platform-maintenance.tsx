import { useEffect, useState } from "react";
import { Wrench, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function PlatformMaintenanceBanner() {
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    void supabase
      .from("platform_settings")
      .select("maintenance_enabled, maintenance_message")
      .maybeSingle()
      .then(({ data }) => {
        if (!mounted) return;
        const row = data as { maintenance_enabled?: boolean; maintenance_message?: string } | null;
        if (row?.maintenance_enabled) {
          setMaintenance({
            enabled: true,
            message: row.maintenance_message || "We are performing scheduled maintenance. Please check back soon.",
          });
        }
      });
    return () => { mounted = false; };
  }, []);

  if (!maintenance?.enabled || dismissed) return null;

  return (
    <div className="sticky top-0 z-[70] border-b border-gold/30 bg-gradient-to-r from-navy via-card to-navy px-3 py-2.5 shadow-lg backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
          <Wrench className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 text-[10px] font-semibold leading-relaxed text-foreground">
          <span className="mr-1 text-gold">Maintenance mode:</span>{maintenance.message}
        </p>
        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss maintenance notice" className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
