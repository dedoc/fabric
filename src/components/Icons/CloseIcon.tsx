import {forwardRef, type SVGProps} from 'react'

const CloseIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function CloseIcon(props, ref) {
  return <svg ref={ref} viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
    <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
})

export default CloseIcon
