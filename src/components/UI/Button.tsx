import {Button as BaseButton} from '@base-ui/react/button'
import type {ComponentProps} from 'react'
import {mergeClassName} from './classNames'

type Props = ComponentProps<typeof BaseButton> & {variant?: 'default' | 'copy'}

export default function Button({className, type = 'button', variant = 'default', ...props}: Props) {
  return <BaseButton {...props} type={type} className={mergeClassName(className, `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 ${variant === 'copy' ? 'copy-button disabled:cursor-default disabled:opacity-40' : ''}`)} />
}

