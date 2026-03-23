import * as Popover from '@radix-ui/react-popover'
import { useMemo, useState } from 'react'
import { cn } from '@renderer/lib/utils'

export type ComboboxOption = { value: string; label?: string }

export function Combobox({
  options,
  placeholder = 'Select…',
  onSelect,
  className,
  disabled
}: {
  options: ComboboxOption[]
  placeholder?: string
  onSelect: (option: ComboboxOption) => void
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter((option) => {
      const label = option.label ?? option.value
      return label.toLowerCase().includes(q)
    })
  }, [options, query])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'inline-flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground transition hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60',
            className
          )}
        >
          <span>{placeholder}</span>
          <span aria-hidden>⌄</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-50 mt-2 w-[520px] max-w-[90vw] rounded-lg border border-border/70 bg-card p-2 shadow-lg"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search…"
            className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">No matches</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted/40"
                  onClick={() => {
                    onSelect(option)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <span className="block w-full truncate">{option.label ?? option.value}</span>
                </button>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
