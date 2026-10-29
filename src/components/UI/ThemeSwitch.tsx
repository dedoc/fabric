import {Switch} from './Switch'
import {setTheme, useTheme} from '@/utils/theme'
import {MoonIcon, SunIcon} from '@/components/Icons'
import {mergeClassName} from './classNames'

export default function ThemeSwitch({className}: {className?: string}) {
  const theme = useTheme()
  return <Switch.Root nativeButton render={<button type="button" />} checked={theme === 'dark'} onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')} aria-label="Dark theme" title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} className={mergeClassName(className, 'flex min-h-9 shrink-0 items-center rounded-[--radius] px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500')}>
    <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors dark:bg-gray-700">
      <Switch.Thumb className="grid size-5 translate-x-0.5 place-items-center rounded-full bg-white text-gray-600 transition-transform dark:translate-x-[22px] dark:bg-gray-200 dark:text-gray-800">
        {theme === 'light' ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
      </Switch.Thumb>
    </span>
  </Switch.Root>
}
