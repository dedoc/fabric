import {forwardRef, type SVGProps} from 'react'
import {calloutIconPaths, type CalloutType} from './calloutMarkup'

export type CalloutIconProps = SVGProps<SVGSVGElement> & {
  type: CalloutType
}

const CalloutIcon = forwardRef<SVGSVGElement, CalloutIconProps>(function CalloutIcon({type, ...props}, ref) {
  return <svg ref={ref} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} dangerouslySetInnerHTML={{__html: calloutIconPaths[type]}} />
})

export default CalloutIcon
