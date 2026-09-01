import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Option = { label: string; value: string };

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
};

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  disabled,
  name,
  id,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-expanded={open}
            className="h-11 w-full justify-between rounded-xl border border-gold/20 bg-gradient-to-r from-background/70 via-secondary/30 to-background/70 px-3 font-normal shadow-sm backdrop-blur-sm transition-all hover:border-gold/40 hover:bg-secondary/50 focus:ring-2 focus:ring-gold/20"
          >
            <span className={cn("flex min-w-0 items-center gap-2 truncate", !selected && "text-muted-foreground")}>
              {selected ? <><span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gold/10 text-[10px] font-bold text-gold">{selected.label.slice(0, 1).toUpperCase()}</span><span className="truncate">{selected.label}</span></> : <span>{placeholder}</span>}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-60 transition-transform", open && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-3xl border-gold/30 bg-card/98 p-0 shadow-[0_25px_80px_rgba(0,0,0,.45)] backdrop-blur-2xl"
        >
          <Command>
            <div className="relative border-b border-border/70"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><CommandInput className="pl-10 h-12 text-sm" placeholder={searchPlaceholder} /></div>
            <CommandList className="max-h-64">
              <CommandEmpty>No matching option.</CommandEmpty>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="min-h-11 cursor-pointer rounded-xl px-3 py-2.5 transition-colors data-[selected=true]:bg-gold/10 data-[selected=true]:text-foreground"
                >
                  <Check className={cn("h-4 w-4", value === option.value ? "opacity-100 text-gold" : "opacity-0")} />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
