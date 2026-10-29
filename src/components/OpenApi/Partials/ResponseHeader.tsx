import type {ReactNode} from 'react'
import {responseStatusDescription} from '@/core/openapi/responseStatus'

export default function ResponseHeader({statusCode, children, className = ''}: {statusCode: string; children?: ReactNode; className?: string}) {
  const color = statusCode[0] === '2' ? 'border border-green-300 dark:border-green-800 bg-green-50 dark:bg-gray-900 text-green-600 dark:text-green-400 px-1.5 py-[3px]'
    : statusCode[0] === '4' ? 'text-orange-600 dark:text-orange-400' : statusCode[0] === '5' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
  const description = responseStatusDescription(statusCode)
  return <div className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 text-base sm:text-sm ${className}`}>
    <div className={`font-jetbrains-mono rounded-lg leading-[18px] font-medium uppercase shrink-0 ${color}`}>{statusCode}</div>
    {description && <><div className="text-gray-300 dark:text-gray-600 shrink-0">·</div><div className="min-w-0 text-gray-500 dark:text-gray-400">{description}</div></>}{children}
  </div>
}
