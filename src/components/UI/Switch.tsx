import {Switch as BaseSwitch} from '@base-ui/react/switch'
import type {ComponentProps} from 'react'
import {mergeClassName} from './classNames'

function Root({className, ...props}: ComponentProps<typeof BaseSwitch.Root>) {
  return <BaseSwitch.Root {...props} className={mergeClassName(className)} />
}

function Thumb({className, ...props}: ComponentProps<typeof BaseSwitch.Thumb>) {
  return <BaseSwitch.Thumb {...props} className={mergeClassName(className)} />
}

export const Switch = {...BaseSwitch, Root, Thumb}
