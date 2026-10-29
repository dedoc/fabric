import {forwardRef, type SVGProps} from 'react'

const SearchIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function SearchIcon(props, ref) {
  return <svg ref={ref} viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" />
    <path d="m13 13 4 4" stroke="currentColor" />
  </svg>
})

export default SearchIcon
