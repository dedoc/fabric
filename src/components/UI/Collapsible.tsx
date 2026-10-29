import {Collapsible as BaseCollapsible} from '@base-ui/react/collapsible'
import type {ComponentProps} from 'react'
import {mergeClassName} from './classNames'

function Root({className, ...props}: ComponentProps<typeof BaseCollapsible.Root>) { return <BaseCollapsible.Root {...props} className={mergeClassName(className)} /> }
function Trigger({className, ...props}: ComponentProps<typeof BaseCollapsible.Trigger>) { return <BaseCollapsible.Trigger {...props} className={mergeClassName(className)} /> }
function Panel({className, ...props}: ComponentProps<typeof BaseCollapsible.Panel>) { return <BaseCollapsible.Panel {...props} className={mergeClassName(className)} /> }

export const Collapsible = {Root, Trigger, Panel}
