import {forwardRef, type HTMLAttributes} from 'react'

const ArrowRightIcon = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(function ArrowRightIcon(props, ref) {
  return <span ref={ref} aria-hidden="true" {...props}>→</span>
})

export default ArrowRightIcon
