import {Collapsible} from '@/components/UI/Collapsible'

export default function ToggleButton({expanded, onExpandedChange, label, className = ''}: {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  label: string
  className?: string
}) {
  return <Collapsible.Root open={expanded} onOpenChange={onExpandedChange}>
    <Collapsible.Trigger className={`min-h-8 self-start rounded-full border border-gray-950/10 dark:border-gray-700 px-2.5 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 hover:dark:bg-gray-900 hover:text-gray-900 hover:dark:text-gray-100 ${className}`}>
      {expanded ? '- Hide' : '+ Show'} {label}
    </Collapsible.Trigger>
  </Collapsible.Root>
}
