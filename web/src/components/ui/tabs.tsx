import { cn } from '@/lib/utils'

export interface TabItem {
  value: string
  label: string
  count?: number
}

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  items: TabItem[]
}

/** Tabs leve (sem dependências radix) — botões segmentados. */
export function Tabs({ value, onValueChange, items }: TabsProps) {
  return (
    <div className="inline-flex h-9 items-center gap-1 rounded-lg bg-[hsl(0,0%,15%)] p-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onValueChange(item.value)}
          className={cn(
            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === item.value
              ? 'bg-[hsl(0,0%,13%)] text-[hsl(0,0%,93%)] shadow-sm'
              : 'text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,93%)]',
          )}
        >
          {item.label}
          {typeof item.count === 'number' && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[11px] leading-none',
                value === item.value ? 'bg-[hsl(4,84%,56%)]/15 text-[hsl(4,84%,56%)]' : 'bg-[hsl(0,0%,25%)]',
              )}
            >
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
