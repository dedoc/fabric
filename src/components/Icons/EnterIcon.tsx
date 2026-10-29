import {forwardRef, type HTMLAttributes} from 'react'

const EnterIcon = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(function EnterIcon(props, ref) {
  return <span ref={ref} aria-hidden="true" {...props}>↵</span>
})

export default EnterIcon
