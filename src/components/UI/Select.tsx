import {Select as BaseSelect} from '@base-ui/react/select'
import type {ButtonHTMLAttributes} from 'react'
import clsx from 'clsx'
import {ChevronDownIcon} from '@/components/Icons'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> & {
  value?: string
  onValueChange?: (value: string) => void
  options: {value: string, label: string}[]
}

export default function Select({value, onValueChange, options, className = '', name, disabled, ...attrs}: Props) {
  const selected = options.find(option => option.value === value) ?? options[0]
  const classes = clsx('relative inline-flex min-h-8 min-w-0 items-center gap-1.5 rounded-[--radius] text-left', className)
  if (options.length <= 1) return <span className={classes} title={attrs.title} style={attrs.style}>{selected?.label ?? ''}</span>
  return <BaseSelect.Root items={options} value={selected?.value ?? null} onValueChange={next => { if (next !== null) onValueChange?.(next) }} name={name ?? attrs['aria-label'] ?? 'selection'} disabled={disabled}>
    <BaseSelect.Trigger {...attrs} className={`${classes} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500`}>
      <BaseSelect.Value className="min-w-0 truncate" />
      <BaseSelect.Icon><ChevronDownIcon variant="outline" className="size-3 shrink-0" /></BaseSelect.Icon>
    </BaseSelect.Trigger>
    <BaseSelect.Portal><BaseSelect.Positioner sideOffset={4} className="z-50 outline-none">
      <BaseSelect.Popup className="max-h-[var(--available-height)] min-w-[var(--anchor-width)] overflow-auto rounded-[--radius] border border-gray-200 bg-white p-1 text-sm text-gray-900 shadow-lg outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
        <BaseSelect.List>{options.map(option => <BaseSelect.Item key={option.value} value={option.value} className="cursor-pointer rounded px-3 py-2 outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-white/5"><BaseSelect.ItemText>{option.label}</BaseSelect.ItemText></BaseSelect.Item>)}</BaseSelect.List>
      </BaseSelect.Popup>
    </BaseSelect.Positioner></BaseSelect.Portal>
  </BaseSelect.Root>
}
