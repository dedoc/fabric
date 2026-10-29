import type {HTMLAttributes, ReactNode} from 'react'

export default function SectionTitle({children, className = '', ...attrs}: {children?: ReactNode; className?: string} & HTMLAttributes<HTMLHeadingElement>) {
  return <h2 {...attrs} className={`shrink-0 text-balance text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}>{children}</h2>
}
