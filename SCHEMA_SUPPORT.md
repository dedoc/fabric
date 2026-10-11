# Schema support

Fabric displays a subset of OpenAPI 3.0 and 3.1 schemas. It is a reference viewer, not a JSON Schema validator. This document describes Fabric; third-party renderers in the comparison canvas have their own support.

## Supported display

| Construct | Behavior |
| --- | --- |
| Primitive types, arrays, objects, `{}` | Types appear inline; `{}` displays as `any`. Object properties can be expanded and collapsed. |
| `required`, descriptions, titles, `format` | Required properties and descriptions are displayed. Format names are shown; their validation rules are not enforced. |
| `nullable` (3.0), type arrays and null alternatives (3.1) | Nullability appears in the type or composition choices. Required and nullable remain separate concepts. |
| `enum`, `const`, `default`, `example`, `examples` | Values are displayed, including zero, false, empty strings and null. |
| `minLength`, `maxLength`, `pattern` | Length badges and literal pattern text are displayed. Patterns are never executed. An unanchored pattern is not implicitly anchored. |
| `minimum`, `maximum` | Inclusive numeric bounds are displayed. |
| `exclusiveMinimum`, `exclusiveMaximum` | Boolean flags modify the corresponding bound in 3.0. Numeric bounds apply in 3.1. If inclusive and numeric exclusive bounds coexist, the stricter bound is displayed. Type ranges use parentheses for excluded endpoints and brackets for included endpoints. |
| `minItems`, `maxItems`, `uniqueItems` | Item-count badges retain zero values. `uniqueItems: true` displays “unique items”; false adds no restriction badge. |
| `properties`, `additionalProperties` | Named properties and typed map values are rendered recursively. `true` permits any value. `false` is preserved but adds no message in the schema view. |
| `allOf` | Inherited and sibling fields appear in one root property list. Required names combine; repeated fields retain all member constraints. References, nested alternatives and recursive fields remain inspectable. This display merge does not alter TypeScript or JSON schema output. Examples combine object members. |
| `oneOf`, `anyOf` | Compact tabs inspect one branch at a time and update request/response examples. Open/closed properties state persists across tab switches. These tabs do not validate exclusive matching or enumerate every combination allowed by `anyOf`. |
| `items`, `prefixItems` | Item schemas and tuple type previews are supported. Tuple position schemas are used by example generation; there is no dedicated positional tuple editor. |
| `readOnly`, `writeOnly`, `deprecated` | Annotations appear beside the type and required marker. Requests omit read-only fields; responses omit write-only fields, including structured examples. Standalone schema pages show both directions. |
| Local `$ref` | Document-root JSON Pointers, escaped tokens and alias chains are resolved. 3.0 reference siblings are ignored; 3.1 schema siblings remain conjunctions. Recursive schemas stop expanding at a recursion marker. |
| `xml` | Supported XML naming, namespaces, attributes and wrapped arrays are used when formatting examples. Authored serialized XML remains literal. |

## Unsupported and partial constructs

> **Warning:** Unsupported keywords can be present in a loaded document without being displayed or enforced. A successfully rendered schema or generated example does not establish validity. These limitations are documented here, without adding schema-keyword warnings to the UI.

| Construct | Limitation |
| --- | --- |
| `discriminator`, including `propertyName` and `mapping` | Not implemented. Tab selection is manual; discriminator mappings do not choose, label or validate alternatives. |
| `not`, `if`, `then`, `else`, dependent schemas/requirements | No conditional or negated schema display or evaluation. |
| `patternProperties`, `propertyNames`, `minProperties`, `maxProperties`, `unevaluatedProperties` | No specialized property-matching or object-size display/evaluation. |
| `contains`, `minContains`, `maxContains`, `unevaluatedItems`, legacy tuple `additionalItems` | No matching-item counts or unevaluated-item handling. |
| `multipleOf`, content encodings/media schemas, custom vocabularies | No specialized constraint display or evaluation. |
| Boolean schemas, `$anchor`, `$dynamicRef`, `$dynamicAnchor`, resource scopes via `$id`, external references | Outside the resolver subset. Bundle external files into document-root pointers. Existing reference diagnostics still report unsupported or unresolved references; no new keyword warnings are added. |
| Arbitrary `format` validation and general schema validation | Formats are labels and may inform sample values, not validation guarantees. Generated primitive bounds are checked; general unsatisfiable compositions are not diagnosed. |

## Examples and validation

Example schemas use a document-scoped graph: repeated references share nodes and recursive references remain edges to their original targets. The source document is treated as immutable for each load; replacing it creates a separate graph. Generation omits optional recursive fields when no finite value can be generated, retains null only when the schema permits it, and reports an unavailable sample for required recursion without a finite supported value. Generated traversal is limited to 10,000 schema visits and 100 nested levels, in addition to the per-array and string limits below. Authored examples remain available for recursive schemas.

Authored examples take precedence until a composition selection requires regenerating the affected branch. Request/response direction is applied to structured values. Generated samples respect inclusive/exclusive numeric bounds, string lengths, array sizes and uniqueness. Common patterns generate deterministic samples: literals, positive character classes/ranges, `\d`/`\w`/`\s`, groups, alternatives, anchors and bounded quantifiers. The generator parses this subset without executing document-provided regular expressions. Lookarounds, backreferences, negated classes and other unsupported pattern constructs require supplied values for required fields. Optional properties whose values cannot be generated are omitted rather than blocking the entire example.

Impossible required bounds, exhausted required unique values, binary response bytes and unsupported required patterns disable the sample and explain why. Generation is bounded to 100 array items and 4096 string characters; patterns are limited to 1024 characters and 16 nested groups. Conflicting pattern/length constraints can require an authored example. Formats use fixed samples and require supplied examples when combined constraints cannot be satisfied. Authored values are preserved rather than validated; general composition validity remains outside this viewer's subset. Raw schema views preserve the source keywords.

Request snippets share effective parameters. Authentication information is read-only; Basic, Bearer, OAuth 2.0, and OpenID Connect snippets show an Authorization header placeholder for a supported single-scheme alternative, without storing user credentials. Supported parameter styles are path `simple`/`label`/`matrix`, header `simple`, cookie `form`, query `form`, flat `deepObject`, and non-exploded array `spaceDelimited`/`pipeDelimited`. Nested objects require JSON `content`. Data tokens are percent-encoded before punctuation is added. `allowReserved` preserves slash, colon, question mark, at sign, dollar, comma and semicolon; query delimiters remain encoded. JSON, XML, plain text and form bodies use their media representations. Unsupported/binary formats and external example values are disclosed instead of inventing request bytes.

Binary requests use placeholder filenames such as `example.bin` or `example.pdf`. Bash uses `--data-binary` for a raw file and `--form` for multipart file properties. Laravel uses `withBody(file_get_contents(...))` or `attach(..., fopen(...))`, following its [HTTP client API](https://laravel.com/framework/docs/http-client). Multipart text fields remain literal and read-only file fields are omitted. Referenced file schemas and arrays of file fields are supported; nested file objects are outside the snippet subset. Replace the placeholder filename with a real local file.

Named request/response media examples have selectors with summaries and descriptions; supplied values are preserved rather than regenerated. The [copyable example lab](http://localhost:5173/?spec=/specs/fabric-reference.yaml#operations/exampleLab) demonstrates encoded parameters, constraints, direction, text selection and placeholder file uploads.

## TypeScript output

Referenced schemas appear as named types, with their declarations included after the main schema. Only reachable dependencies are included, each resolved schema is emitted once, and colliding sanitized names gain numeric suffixes. Inline schemas remain inline.

Index signatures are emitted only for explicit `additionalProperties: true` or an additional-property schema. When `additionalProperties` is unspecified, TypeScript output shows only declared properties for readability and excess-property checking. This intentionally omits OpenAPI's implicit permission for extra properties; the output is not an exact translation of that default. Explicit `false` also omits the index signature. Objects without declared properties or an explicit additional-property schema use `object`.

Nullable enum unions are flattened and deduplicated. A bare object restriction intersected with an object-or-null composition uses `NonNullable<…>` to retain the restriction with less clutter. Mixed primitive/object or unconstrained compositions keep the meaningful intersection. Validation walks unique graph nodes rather than expanding every reference path; named dependency chains do not count as deep inline nesting. Structural recursion remains supported, while composition-only cycles remain unavailable.

Standalone schema pages provide self-contained `export type` declarations. Names use the component name without a prefix, replacing invalid identifier characters with underscores. Names beginning with a digit gain a leading underscore; reserved type names gain a trailing underscore. Recursive helper aliases add numeric suffixes. Property names are unquoted when they are valid identifiers and quoted otherwise. Local references follow the same OpenAPI version rules as schema display. All composition branches are included regardless of the selected example branch: inline `allOf` objects combine their properties into one object, while named references and other constraints remain intersections; `oneOf`/`anyOf` become unions. Repeated properties retain the intersection of their constraints. Required properties remain required, other properties are optional, `integer` becomes `number`, and unconstrained schemas become `unknown`. JSON `const`/`enum` values become literal types. Maps use string index signatures; schemas with both named properties and map values use intersections. Standalone types retain both read-only and write-only fields without imposing TypeScript mutation restrictions.

These declarations describe structural types, not runtime validation. TypeScript does not enforce integer-only numbers, formats, numeric/string bounds, patterns, uniqueness, exclusive `oneOf` matching, or exact objects for `additionalProperties: false`. Typed map intersections are an approximation: TypeScript index signatures also constrain declared properties, whereas JSON Schema applies `additionalProperties` only to undeclared names. Tuple prefixes are optional unless required by `minItems` and allow remaining items using `items` or `unknown`; other array-length restrictions are not enforced. Unsupported schema keywords remain subject to the limitations above. Unresolved references, recursive compositions without an object/array boundary, and traversals exceeding 10,000 visits or 100 nested levels produce unavailable output with copying disabled.

- [TypeScript output regression tests](./tests/schemaTypescript.test.mjs): compiled declarations, required fields, literals, maps, compositions, version-aware references, recursion, unavailable output and tab/copy actions.

## Regression fixtures

- [OpenAPI 3.1 Schema Lab](http://localhost:5173/?spec=/specs/fabric-reference.yaml#operations/schemaLab): patterns, string lengths, referenced numeric exclusive bounds, array limits/uniqueness, zero-item arrays, maps, compositions and directional annotations. Source: [fabric-reference.yaml](./public/specs/fabric-reference.yaml).
- [OpenAPI 3.0 compatibility lab](http://localhost:5173/?spec=/specs/fabric-reference-3.0.yaml#operations/nullableLab): nullable types and true/false boolean exclusivity. Source: [fabric-reference-3.0.yaml](./public/specs/fabric-reference-3.0.yaml).
- [Schema viewer regression tests](./tests/schemaViewer.test.mjs): literal/escaped patterns, strict and inclusive bounds, zero values, nested/referenced constraints, composition selection and the absence of discriminator UI warnings.

Semantics follow the [OpenAPI 3.0 Schema Object](https://spec.openapis.org/oas/v3.0.3.html#schema-object) and the [JSON Schema 2020-12 validation vocabulary used by OpenAPI 3.1](https://json-schema.org/draft/2020-12/json-schema-validation).
