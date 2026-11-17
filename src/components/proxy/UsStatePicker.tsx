import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { US_STATES, findUsState } from "@/lib/geo/us-states";
import { cn } from "@/lib/utils";

type Props = {
  value?: string;
  onChange: (stateCode: string) => void;
  className?: string;
  placeholder?: string;
};

export function UsStatePicker({ value, onChange, className, placeholder = "Choose a US state" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = findUsState(value);

  const states = useMemo(() => US_STATES, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="US state"
          className={cn("w-full justify-between font-normal sm:w-[280px]", className)}
        >
          <span className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selected ? `${selected.name} (${selected.code})` : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-2rem))] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search states..." />
          <CommandList>
            <CommandEmpty>No state matches that search.</CommandEmpty>
            <CommandGroup>
              {states.map((state) => (
                <CommandItem
                  key={state.code}
                  value={`${state.name} ${state.code}`}
                  onSelect={() => {
                    onChange(state.code);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("h-4 w-4", selected?.code === state.code ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{state.name}</span>
                  <span className="text-xs text-muted-foreground">{state.code}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
