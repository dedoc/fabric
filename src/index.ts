import {createApp} from 'vue'
import './style.css'
import FabricViewer from './components/FabricViewer.vue'
import type {FabricOptions} from './types'

export type {FabricOptions} from './types'

export function init(target: string | HTMLElement, options: FabricOptions) {
  const app = createApp(FabricViewer, options)
  app.mount(target)
  return {destroy: () => app.unmount()}
}

export const Fabric = {init}
export default Fabric
