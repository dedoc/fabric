import {forwardRef, type HTMLAttributes} from 'react'

const CheckIcon = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(function CheckIcon(props, ref) {
  return <span ref={ref} aria-hidden="true" {...props}>✓</span>
})

export default CheckIcon
