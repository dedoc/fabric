import {forwardRef, type ComponentPropsWithoutRef} from 'react'
import {mergeClassName} from './classNames'

const panelClasses = 'flex min-h-0 flex-col overflow-hidden rounded-xl border border-[color:var(--schema-border-color)] dark:bg-[#111111] text-sm sm:text-xs'
const headerClasses = 'flex min-h-12 shrink-0 items-center border-b border-[color:var(--schema-border-color)] px-4 py-2'

const CodePanel = forwardRef<HTMLElement, ComponentPropsWithoutRef<'section'>>(function CodePanel({className, ...props}, ref) {
  return <section {...props} ref={ref} className={mergeClassName(className, panelClasses)} />
})

export const CodePanelHeader = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function CodePanelHeader({className, ...props}, ref) {
  return <div {...props} ref={ref} className={mergeClassName(className, headerClasses)} />
})

export default CodePanel
