import {Tabs as BaseTabs} from '@base-ui/react/tabs'
import type {ComponentProps} from 'react'
import {mergeClassName} from './classNames'

function Root({className, ...props}: ComponentProps<typeof BaseTabs.Root>) { return <BaseTabs.Root {...props} className={mergeClassName(className)} /> }
function List({className, ...props}: ComponentProps<typeof BaseTabs.List>) { return <BaseTabs.List {...props} className={mergeClassName(className)} /> }
function Indicator({className, ...props}: ComponentProps<typeof BaseTabs.Indicator>) { return <BaseTabs.Indicator {...props} className={mergeClassName(className)} /> }
function Tab({className, ...props}: ComponentProps<typeof BaseTabs.Tab>) { return <BaseTabs.Tab {...props} className={mergeClassName(className)} /> }
function Panel({className, ...props}: ComponentProps<typeof BaseTabs.Panel>) { return <BaseTabs.Panel {...props} className={mergeClassName(className)} /> }

export const Tabs = {Root, List, Indicator, Tab, Panel}
