import {Input as BaseInput} from '@base-ui/react/input'
import type {ComponentProps} from 'react'
import {mergeClassName} from './classNames'

export default function Input({className, ...props}: ComponentProps<typeof BaseInput>) {
  return <BaseInput {...props} className={mergeClassName(className)} />
}
