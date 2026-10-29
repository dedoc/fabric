import {forwardRef, type SVGProps} from 'react'

const CopyIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function CopyIcon(props, ref) {
  return <svg ref={ref} viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
    <rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor" />
    <path d="M12 14v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3" stroke="currentColor" />
  </svg>
})

export default CopyIcon
