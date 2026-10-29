import {forwardRef, type SVGProps} from 'react'

const LockIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function LockIcon(props, ref) {
  return <svg ref={ref} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
    <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
  </svg>
})

export default LockIcon
