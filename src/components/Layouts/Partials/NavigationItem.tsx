import {forwardRef, type AnchorHTMLAttributes, type HTMLAttributes, type MouseEvent, type ReactNode, type Ref} from 'react'

type Props = {
  label: string
  href?: string
  active?: boolean
  alignment?: 'center' | 'baseline'
  children?: ReactNode
  trailing?: ReactNode
  className?: string
  onClick?: (event: MouseEvent<HTMLElement>) => void
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'className' | 'onClick'> & Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'download'>

const NavigationItem = forwardRef<HTMLElement, Props>(function NavigationItem({label, href, active = false, alignment = 'center', children, trailing, className = '', onClick, ...attrs}, ref) {
  const classes = `relative isolate flex min-h-12 w-full cursor-pointer gap-2.5 rounded-[--navigation-item-radius] px-2 py-2 text-left text-base md:min-h-8 md:py-[--navigation-item-padding-y] md:text-sm after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:bottom-px after:-z-10 after:rounded-[--navigation-item-radius] after:content-[''] hover:after:bg-[--navigation-item-highlight] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 ${alignment === 'baseline' ? 'items-baseline' : 'items-center'} ${active ? 'after:bg-[--navigation-item-highlight] text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'} ${className}`
  const content = <><span className="min-w-0 flex-1 truncate">{label}</span>{trailing ?? children}</>
  if (href) return <a {...attrs} ref={ref as Ref<HTMLAnchorElement>} href={href} className={classes} onClick={onClick}>{content}</a>
  return <button {...attrs} ref={ref as Ref<HTMLButtonElement>} type="button" className={classes} onClick={onClick}>{content}</button>
})

NavigationItem.displayName = 'NavigationItem'
export default NavigationItem
