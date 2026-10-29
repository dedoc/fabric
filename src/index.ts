import {createElement} from 'react'
import {createRoot} from 'react-dom/client'
import {flushSync} from 'react-dom'
import '@/style.css'
import FabricViewer from '@/components/FabricViewer'
import type {FabricOptions} from '@/types'
import {initializeTheme} from '@/utils/theme'

export type {FabricOptions, LogoConfig, LogoImage} from '@/types'

export function init(target: string | HTMLElement, options: FabricOptions) {
  initializeTheme()
  const container = typeof target === 'string' ? document.querySelector(target) : target
  if (!container) throw new Error(`Fabric target was not found: ${target}`)
  const root = createRoot(container)
  flushSync(() => root.render(createElement(FabricViewer, options)))
  return {destroy: () => root.unmount()}
}

export const Fabric = {init}
export default Fabric
