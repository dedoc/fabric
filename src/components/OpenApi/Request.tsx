import type {Components, Parameter, Reference, RequestBody as RequestBodyType} from '@/core/openapi/types'
import Parameters from '@/components/OpenApi/Parameters'
import RequestBody from '@/components/OpenApi/RequestBody'

export default function Request({components, parameters, requestBody}: {components: Components; parameters?: (Parameter | Reference)[]; requestBody?: RequestBodyType | Reference}) {
  return <div className="space-y-[--sections-gap]">{parameters?.length ? <Parameters components={components} parameters={parameters} /> : null}{requestBody && <RequestBody components={components} requestBody={requestBody} />}</div>
}
