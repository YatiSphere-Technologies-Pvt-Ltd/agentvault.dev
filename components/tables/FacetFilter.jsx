'use client';

import { Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

/**
 * Faceted filter chip + popover for table toolbars.
 *
 * Multi-select; the chip itself shows a `+` until something's selected, then
 * the count + selected labels (truncated). Clicking opens a searchable
 * checkbox list. Inspired by the shadcn data-table-faceted-filter recipe but
 * adapted to the @base-ui Popover and cmdk Command primitives in this repo.
 *
 * Props:
 *   title    — chip label, e.g. "Framework"
 *   options  — [{ value, label, color?, icon?: ReactNode }]
 *   selected — Set<string> of currently chosen values
 *   onChange — (Set<string>) => void
 */
export function FacetFilter({ title, options, selected, onChange }) {
  const selectedSet = selected instanceof Set ? selected : new Set(selected || []);
  const count = selectedSet.size;

  const toggle = (value) => {
    const next = new Set(selectedSet);
    next.has(value) ? next.delete(value) : next.add(value);
    onChange(next);
  };

  const clear = (e) => {
    e?.stopPropagation();
    onChange(new Set());
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 border-dashed text-[12px]">
            <Plus className="h-3.5 w-3.5" />
            <span>{title}</span>
            {count > 0 && (
              <>
                <Separator orientation="vertical" className="mx-1 h-4" />
                <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-foreground tabular-nums">
                  {count}
                </span>
                <span className="hidden lg:flex items-center gap-1 max-w-48 overflow-hidden">
                  {Array.from(selectedSet).slice(0, 2).map(value => {
                    const opt = options.find(o => o.value === value);
                    if (!opt) return null;
                    return (
                      <span
                        key={value}
                        className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-foreground truncate"
                      >
                        {opt.label}
                      </span>
                    );
                  })}
                  {count > 2 && (
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                      +{count - 2}
                    </span>
                  )}
                </span>
              </>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map(option => {
                const isSelected = selectedSet.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggle(option.value)}
                    data-checked={isSelected}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-[3px] border shrink-0',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input opacity-60 [&_svg]:invisible'
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                    {option.color && (
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: option.color }} />
                    )}
                    {option.icon}
                    <span className="text-[12.5px] truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {count > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={clear} className="justify-center text-[12.5px]">
                    Clear filter
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Convenience: render a row of facet chips + a "Clear all" button if any are
 * active. Sits inside the DataTable toolbar.
 */
export function FacetFilterBar({ filters, onClearAll }) {
  const activeCount = filters.reduce((n, f) => n + (f.selected?.size || 0), 0);
  return (
    <>
      {filters.map(f => (
        <FacetFilter
          key={f.title}
          title={f.title}
          options={f.options}
          selected={f.selected}
          onChange={f.onChange}
        />
      ))}
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-8 px-2 text-[12px] text-muted-foreground hover:text-foreground"
        >
          Clear
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </>
  );
}
