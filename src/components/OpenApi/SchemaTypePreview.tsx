import {useContext} from 'react'
import type {Components, Schema} from '@/core/openapi/types'
import {ShowSchemasContext} from '@/react/context'
import {getSchemaTypeParts} from '@/core/openapi/schemaTypePreview'

export default function SchemaTypePreview({schema, original, components}: {schema?: Schema, original?: Schema, components: Components}) {
  const showSchemas = useContext(ShowSchemasContext)
  const parts = getSchemaTypeParts(schema, original)
  return <span>{parts.map((part, index) => showSchemas && part.schemaName && Object.hasOwn(components.schemas ?? {}, part.schemaName)
    ? <a key={index} href={`#schemas/${encodeURIComponent(part.schemaName)}`} className="text-inherit no-underline hover:cursor-pointer hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500">{part.text}</a>
    : <span key={index}>{part.text}</span>)}</span>
}
