import {forwardRef, type SVGProps} from 'react'

const MoonIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function MoonIcon(props, ref) {
  return <svg ref={ref} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
    <path d="M17 11.5A7.5 7.5 0 0 1 8.5 3a7.5 7.5 0 1 0 8.5 8.5Z" />
  </svg>
})

export default MoonIcon
