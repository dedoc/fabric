import {forwardRef, type SVGProps} from 'react'

export type ChevronDownIconProps = SVGProps<SVGSVGElement> & {
  variant?: 'outline' | 'solid'
}

const ChevronDownIcon = forwardRef<SVGSVGElement, ChevronDownIconProps>(function ChevronDownIcon({variant = 'outline', ...props}, ref) {
  return <svg ref={ref} viewBox="0 0 16 16" fill={variant === 'solid' ? 'currentColor' : 'none'} aria-hidden="true" {...props}>
    {variant === 'solid'
      ? <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
      : <path d="m4 6 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
})

export default ChevronDownIcon
