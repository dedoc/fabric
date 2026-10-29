import type {ReactNode} from 'react'

export default function SchemaAttribute({title, value, description, children}: {title: string, value: unknown, description?: string, children?: ReactNode}) {
  function formatValue(value: unknown): string {
    if (value === '') return "''"
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  return <div className="flex items-baseline gap-2.5 text-sm sm:text-xs">
    <div className="w-14 shrink-0 whitespace-nowrap text-gray-500 dark:text-gray-400">{title}</div>
    <div className={children ? 'min-w-0 leading-relaxed' : 'min-w-0 flex flex-wrap items-baseline gap-1'}>
      {Array.isArray(value)
        ? value.map((item, index) => <div key={`${item}-${index}`} className={`inline-block max-w-full break-words rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-gray-600 dark:text-gray-400${children ? ' mr-1' : ''}`}>{formatValue(item)}</div>)
        : <div className="inline-block max-w-full break-words rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-gray-600 dark:text-gray-400">{formatValue(value)}</div>}
      {children ?? (description ? <div className="text-gray-500 dark:text-gray-400">{description}</div> : null)}
    </div>
  </div>
}
