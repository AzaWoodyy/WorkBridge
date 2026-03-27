import * as Popover from '@radix-ui/react-popover'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@renderer/lib/utils'

export type UserOption = { value: string; label?: string }

export function UserMultiCombobox({
  options,
  selected,
  onChange,
  placeholder = 'Select users…',
  disabled,
  className
}: {
  options: UserOption[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement | null>(null)

  const normalizedSelected = selected.filter(Boolean)

  const selectedLabels = normalizedSelected
    .map((value) => {
      const match = options.find((option) => option.value === value)
      return match?.label ?? value
    })
    .join(', ')

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.toLowerCase()
    return options.filter((option) => {
      const label = option.label ?? option.value
      return label.toLowerCase().includes(q)
    })
  }, [options, query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  const toggleUser = (value: string) => {
    const exists = normalizedSelected.includes(value)
    const next = exists ? normalizedSelected.filter((entry) => entry !== value) : [...normalizedSelected, value]
    onChange(next)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const current = filtered[activeIndex]
      if (current) toggleUser(current.value)
    }
  }

  useEffect(() => {
    const node = listRef.current
    if (!node) return
    const active = node.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null
    if (active) {
      active.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, open, filtered.length])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60',
            className
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'min-w-0 flex-1 break-words',
                normalizedSelected.length === 0 ? 'text-muted-foreground' : 'text-foreground'
              )}
              title={selectedLabels || placeholder}
            >
              {normalizedSelected.length ? selectedLabels : placeholder}
            </span>
            <span className="text-muted-foreground">⌄</span>
          </div>
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
            placeholder="Search users…"
            className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                listRef.current?.focus()
              }
            }}
          />
          <div ref={listRef} className="max-h-56 overflow-auto" onKeyDown={handleListKeyDown} tabIndex={0}>
            {filtered.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">No matches</div>
            ) : (
              filtered.map((option, index) => {
                const label = option.label ?? option.value
                const isSelected = normalizedSelected.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    data-index={index}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs transition hover:bg-muted/40',
                      index === activeIndex && 'bg-muted/40',
                      isSelected && 'text-foreground'
                    )}
                    onClick={() => toggleUser(option.value)}
                  >
                    <span className="block min-w-0 truncate" title={label}>
                      {label}
                    </span>
                    <span className={cn('text-xs', isSelected ? 'text-emerald-500' : 'text-muted-foreground')}>
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
