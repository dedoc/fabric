import {forwardRef, type SVGProps} from 'react'

const SunIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function SunIcon(props, ref) {
  return <svg ref={ref} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
    <circle cx="10" cy="10" r="3" />
    <path d="M10 1v2m0 14v2M1 10h2m14 0h2M3.6 3.6 5 5m10 10 1.4 1.4M3.6 16.4 5 15M15 5l1.4-1.4" />
  </svg>
})

export default SunIcon
