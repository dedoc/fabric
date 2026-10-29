import {Dialog as BaseDialog} from '@base-ui/react/dialog'
import type {ComponentProps} from 'react'
import {mergeClassName} from './classNames'

function Root(props: ComponentProps<typeof BaseDialog.Root>) { return <BaseDialog.Root {...props} /> }
function Trigger({className, ...props}: ComponentProps<typeof BaseDialog.Trigger>) { return <BaseDialog.Trigger {...props} className={mergeClassName(className)} /> }
function Portal(props: ComponentProps<typeof BaseDialog.Portal>) { return <BaseDialog.Portal {...props} /> }
function Backdrop({className, ...props}: ComponentProps<typeof BaseDialog.Backdrop>) { return <BaseDialog.Backdrop {...props} className={mergeClassName(className, 'fixed inset-0 bg-gray-950/50 dark:bg-black/60')} /> }
function Popup({className, ...props}: ComponentProps<typeof BaseDialog.Popup>) { return <BaseDialog.Popup {...props} className={mergeClassName(className, 'rounded-2xl border border-transparent bg-white shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:shadow-none')} /> }
function Title({className, ...props}: ComponentProps<typeof BaseDialog.Title>) { return <BaseDialog.Title {...props} className={mergeClassName(className)} /> }
function Close({className, ...props}: ComponentProps<typeof BaseDialog.Close>) { return <BaseDialog.Close {...props} className={mergeClassName(className)} /> }

export const Dialog = {Root, Trigger, Portal, Backdrop, Popup, Title, Close}
