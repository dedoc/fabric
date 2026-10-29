import {forwardRef, type HTMLAttributes} from 'react'

const ArrowUpIcon = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(function ArrowUpIcon(props, ref) {
  return <span ref={ref} aria-hidden="true" {...props}>↑</span>
})

export default ArrowUpIcon
