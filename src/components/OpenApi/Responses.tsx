import type {Components, Operation, Responses as ResponseMap} from '@/core/openapi/types'
import Response from '@/components/OpenApi/Response'
import SectionTitle from '@/components/OpenApi/Partials/SectionTitle'

export default function Responses({responses, components}: {responses: Operation['responses']; components: Components}) {
  const [primary, secondary] = Object.entries(responses ?? {}).reduce<[ResponseMap, ResponseMap]>(([first, rest], entry, index) => { (index === 0 ? first : rest)[entry[0]] = entry[1]; return [first, rest] }, [{}, {}])
  const secondaryEntries = Object.entries(secondary)
  return <div><div className="flex gap-2 items-baseline"><SectionTitle>Response</SectionTitle></div><div className="mt-4">
    {Object.entries(primary).map(([statusCode, response]) => <Response key={statusCode} components={components} statusCode={statusCode} response={response} />)}
    {!!secondaryEntries.length && <div className="h-px bg-[color:var(--schema-border-color)] my-5" />}
    {!!secondaryEntries.length && <div>{secondaryEntries.map(([statusCode, response], index) => <div key={statusCode}><Response components={components} statusCode={statusCode} response={response} secondary />{index !== secondaryEntries.length - 1 && <div className="h-px bg-[color:var(--schema-border-color)] my-5" />}</div>)}</div>}
  </div></div>
}
