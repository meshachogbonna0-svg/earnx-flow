import { Toaster as SonnerToaster } from "sonner";

/** App-wide toast host, themed with the EarnX design tokens. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "glass !w-[calc(100vw-2rem)] !max-w-[420px] !rounded-2xl !border-border !text-black !shadow-[var(--shadow-elevated)] !px-4 !py-3 sm:!w-[min(420px,calc(100vw-2rem))]",
          description: "!text-muted-foreground",
          actionButton: "!bg-gold-gradient !text-gold-foreground",
          cancelButton: "!bg-secondary !text-secondary-foreground",
        },
      }}
    />
  );
}
