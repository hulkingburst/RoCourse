"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SelectFieldOption {
  value: string;
  label: string;
}

export function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useLayoutEffect(() => {
    if (!open) return;
    const el = triggerRef.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={triggerRef} className={cn("w-full", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            id={id}
            aria-label={ariaLabel}
            aria-haspopup="listbox"
            className={cn(
              "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              !selected && placeholder && "text-muted-foreground"
            )}
          >
            <span className="truncate text-left">
              {selected ? selected.label : placeholder ?? ""}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={4}
          style={width ? { width: `${width}px` } : undefined}
          className="max-h-72 overflow-y-auto"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => onValueChange(option.value)}
                className={cn(isSelected && "bg-accent text-accent-foreground")}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}