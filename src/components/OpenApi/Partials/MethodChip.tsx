import type {HTMLAttributes, ReactNode} from 'react'

export default function MethodChip({method, children, className = '', ...attrs}: {method: string; children?: ReactNode; className?: string} & HTMLAttributes<HTMLDivElement>) {
  const colors: Record<string, string> = {
    get: 'text-green-700 dark:text-green-400', post: 'text-blue-700 dark:text-blue-400', put: 'text-violet-700 dark:text-violet-400',
    delete: 'text-red-700 dark:text-red-400', options: 'text-purple-700 dark:text-purple-400', head: 'text-gray-700 dark:text-gray-300',
    patch: 'text-yellow-700 dark:text-yellow-400', trace: 'text-gray-700 dark:text-gray-300',
  }
  return <div {...attrs} className={`font-jetbrains-mono uppercase ${colors[method] ?? 'text-gray-600 dark:text-gray-400'} ${className}`}>{children}{method}</div>
}
