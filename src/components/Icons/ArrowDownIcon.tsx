import {forwardRef, type HTMLAttributes} from 'react'

const ArrowDownIcon = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(function ArrowDownIcon(props, ref) {
  return <span ref={ref} aria-hidden="true" {...props}>↓</span>
})

export default ArrowDownIcon
