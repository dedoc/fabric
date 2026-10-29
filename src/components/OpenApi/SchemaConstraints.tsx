import type {Schema} from '@/core/openapi/types'
import {getSchemaBounds} from '@/core/openapi/schemaBounds'
import SchemaAttribute from '@/components/OpenApi/SchemaAttribute'

export default function SchemaConstraints({schema}: {schema: Schema}) {
  const {minimum, maximum} = getSchemaBounds(schema)
  const bounds = [
    {operator: '>=', value: schema.minLength, unit: 'characters'},
    {operator: '<=', value: schema.maxLength, unit: 'characters'},
    {operator: minimum?.exclusive ? '>' : '>=', value: minimum?.value, unit: ''},
    {operator: maximum?.exclusive ? '<' : '<=', value: maximum?.value, unit: ''},
    {operator: '>=', value: schema.minItems, unit: 'items'},
    {operator: '<=', value: schema.maxItems, unit: 'items'},
  ].filter(bound => bound.value !== undefined)

  return <>
    {(bounds.length > 0 || schema.uniqueItems === true) && <div className="flex flex-wrap gap-1">
      {bounds.map((bound, index) => <div key={index} className="rounded-md bg-gray-100 dark:bg-gray-800 px-[3px] py-0.5 text-xs leading-[15px] text-gray-600 dark:text-gray-400"><span className="[font-variant-ligatures:common-ligatures]">{bound.operator}</span> {bound.value} {bound.unit}</div>)}
      {schema.uniqueItems === true && <div className="rounded-md bg-gray-100 dark:bg-gray-800 px-[3px] py-0.5 text-xs leading-[15px] text-gray-600 dark:text-gray-400">unique items</div>}
    </div>}
    {schema.pattern !== undefined && <SchemaAttribute title="Pattern" value={schema.pattern} />}
  </>
}
