import {Tabs} from '@base-ui/react/tabs'
import type {Schema} from '@/core/openapi/types'
import {getSchemaTypeParts} from '@/core/openapi/schemaTypePreview'

export default function CompositionTabs({members, kind, selected, panelId, onSelect, className}: {members: Schema[], kind: 'anyOf' | 'oneOf', selected: number, panelId: string, onSelect(index: number): void, className?: string}) {
  const label = kind === 'anyOf' ? 'any of' : 'one of'
  return <Tabs.Root value={String(selected)} onValueChange={value => onSelect(Number(value))} className={className}>
    <Tabs.List activateOnFocus className="inline-flex max-w-full flex-wrap items-baseline gap-y-1 text-gray-500 dark:text-gray-400" aria-label={label}>
      <span className="mr-1">{label}</span>
      {members.map((member, index) => <Tabs.Tab key={index} id={`${panelId}-tab-${index}`} value={String(index)} aria-controls={panelId} className={`inline-flex h-[1lh] max-w-full items-center rounded-[--radius] px-2 py-0 align-baseline leading-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 ${selected === index ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:dark:bg-gray-900 hover:text-gray-900 hover:dark:text-gray-100'}`}>
        {member.title || getSchemaTypeParts(member).map(part => part.text).join('')}
      </Tabs.Tab>)}
    </Tabs.List>
  </Tabs.Root>
}
