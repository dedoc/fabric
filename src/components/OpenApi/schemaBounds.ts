import type {Schema} from './types'

type Bound = {value: number, exclusive: boolean}

/** OpenAPI 3.0 uses boolean exclusivity; 3.1 uses a separate numeric bound. */
function bound(inclusive: number | undefined, exclusive: boolean | number | undefined, lower: boolean): Bound | undefined {
  if (typeof exclusive === 'number' && (inclusive === undefined || (lower ? exclusive >= inclusive : exclusive <= inclusive))) {
    return {value: exclusive, exclusive: true}
  }
  return inclusive === undefined ? undefined : {value: inclusive, exclusive: exclusive === true}
}

export function getSchemaBounds(schema: Schema) {
  return {
    minimum: bound(schema.minimum, schema.exclusiveMinimum, true),
    maximum: bound(schema.maximum, schema.exclusiveMaximum, false),
  }
}
