import {createApp} from 'vue'
import './style.css'
import FabricViewer from './components/FabricViewer.vue'
import type {FabricOptions} from './types'
import {initializeTheme} from './utils/theme'

export type {FabricOptions, LogoConfig, LogoImage} from './types'

export function init(target: string | HTMLElement, options: FabricOptions) {
  initializeTheme()
  const app = createApp(FabricViewer, options)
  app.mount(target)
  return {destroy: () => app.unmount()}
}

export const Fabric = {init}
export default Fabric
