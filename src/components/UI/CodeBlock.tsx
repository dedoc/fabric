import {forwardRef, type ComponentPropsWithoutRef} from 'react'
import {mergeClassName} from './classNames'

const codeBlockClasses = 'm-0 min-h-0 overflow-auto overscroll-contain [scrollbar-width:thin] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gray-500 p-4 font-jetbrains-mono text-sm leading-6 text-[#435a78] dark:text-gray-300 sm:text-xs sm:leading-5 [tab-size:2]'

const CodeBlock = forwardRef<HTMLPreElement, ComponentPropsWithoutRef<'pre'>>(function CodeBlock({className, ...props}, ref) {
  return <pre {...props} ref={ref} className={mergeClassName(className, codeBlockClasses)} />
})

export default CodeBlock
