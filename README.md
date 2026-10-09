# Fabric API reference

A Vue API reference viewer for OpenAPI 3.0 and 3.1 documents.

## Run

```sh
yarn install
yarn dev
```

Redocly's Petstore demo is the active test specification, loaded from `public/specs/redocly-petstore.yaml`. This copy uses the compatible `v2.0.0-rc.1` demo with its retired logo URL replaced by the working upstream repository asset. The main-branch demo has a malformed array schema. Both upstream URLs remain commented alternatives; other remote specifications are fetched at runtime.

## Use another specification

Open the [comparison canvas](http://localhost:5173/?view=compare) to switch between Fabric, Stoplight Elements, Redoc 2.5.2, Redoc 3.0.0-rc.0, Swagger UI, Scalar, RapiDoc, and OpenAPI Explorer. The specification selector includes the bundled fixtures and every commented alternative in `HelloWorld.vue`, including upstream demos, public APIs, development proxies, and local test servers. The two selects stay above an isolated renderer frame, and selections are retained in the URL. Stoplight Elements is a single renderer (Elements is Stoplight's component library). Third-party renderer scripts/styles load from jsDelivr or Redocly's CDN and require an internet connection. Remote documents need CORS permission; local URLs need their corresponding development server. A custom HTTP(S) document can also be supplied with the `spec` query parameter.

Open the growing [Fabric Reference Lab](http://localhost:5173/?spec=/specs/fabric-reference.yaml#overview) while the development server is running. The fixture lives in `public/specs/fabric-reference.yaml`; its descriptions explain what to inspect for inheritance, overrides, schema/content parameters, serialization, examples, request bodies, responses, and webhooks. Extend this specification with new supported cases as fixes land, retaining existing cases as regression coverage. The example server is illustrative and has no live endpoints.

The standalone app accepts a `spec` query parameter, for example `/?spec=/specs/fabric-reference.yaml#operations/updateProject`. Query selection overrides the default demo for that page load and works with static deployments too.

In `src/components/HelloWorld.vue`, comment out the active `specUrl` and uncomment another. Keep added specifications as commented alternatives when switching. Choices include Redocly Petstore, SavvyCal, Scalar Galaxy, SpaceTraders, Spotify, Converterer, Petstore, GitHub, Stripe, Box, and local test APIs. SpaceTraders uses external schema references, which the renderer does not yet resolve.

The URL can serve JSON or YAML. Spotify and Converterer use development proxies configured in `vite.config.ts`. Other cross-origin sources must allow browser requests through CORS. These proxies are for local testing; production source hosting remains a separate deployment concern.

When embedding the viewer, pass `specUrl` and optionally `showSchemas` to `src/components/HelloWorld.vue`. Omitting `specUrl` uses the selected test URL. Changing the prop cancels the previous load.

`info.x-logo` displays a logo above navigation, with support for `url`, `altText`, hexadecimal `backgroundColor`, and `href` (defaulting to `info.contact.url`). Relative URLs resolve against the specification URL. Images and links accept HTTP(S) URLs; missing, invalid, or failed images fall back to the API title.

## Errors and description safety

The loader checks HTTP status, JSON/YAML parsing, supported versions, required document metadata, and key rendering structures. These checks are not a complete OpenAPI conformance validator. Loading has a 30-second timeout. Loading, parsing, structural, and descendant rendering failures show a small error page with a retry action.

Description Markdown and embedded HTML are sanitized with an allowlist before rendering. Formatting, safe links, images, and tables are preserved; active elements, event handlers, inline styles, and unsafe URL schemes are removed.

## Reference support

The shared resolver accepts the complete source document and resolves local URI-fragment JSON Pointers, including percent encoding, escaped slash/tilde tokens, array entries, reference chains, and locations outside components. Schemas, parameters, request bodies, responses, headers, examples, security schemes, and Path Items use this resolver. Recursive schemas remain navigable and terminate with a recursive-schema label rather than expanding indefinitely.

Reference siblings follow the document version: OpenAPI 3.0 ignores Reference Object siblings; OpenAPI 3.1 applies schema siblings as additional constraints and permits summary/description overrides on other Reference Objects. Schema conjunctions are displayed as “Must match all schemas” rather than flattened by overwriting fields. Path Item siblings keep non-conflicting fields; overlapping fields produce a warning and use the referenced field, since the specification leaves conflicts undefined. See the [OpenAPI 3.0 reference rules](https://spec.openapis.org/oas/v3.0.3.html#reference-object) and [OpenAPI 3.1 reference rules](https://spec.openapis.org/oas/v3.1.0.html#reference-object).

Missing targets, circular alias chains, malformed/unsupported pointers, and external references show warnings in the affected section. Incomplete request/response examples cannot be copied as generated samples; raw schema views remain available. External files are never fetched by the reference resolver: bundle them before loading. JSON Schema anchors, resource scopes using `$id`, and boolean schema targets are outside the current supported subset and produce diagnostics when encountered by the resolver. Advanced schema validation and constraint-aware sample generation remain release tasks in `AUDIT.md`.

For programmatic use, `resolveReference(document, entry, kind)` in `src/components/OpenApi/references.ts` returns a value plus diagnostics; `kind` is `schema`, `reference`, or `pathItem`. Pure example helpers accept an optional complete document for full pointer and version support. Their components-only fallback treats references with the OpenAPI 3.0 sibling policy.

## Checks

See [Schema support](./SCHEMA_SUPPORT.md) for the supported display subset, regression fixtures, and limitations such as unimplemented discriminators and constraint-aware example generation. Unsupported schema keywords are documented there without new UI warnings.

```sh
node --test tests/localReferences.test.mjs tests/schemaGraph.test.mjs tests/schemaViewer.test.mjs tests/specSafety.test.mjs
yarn vite build
yarn build
```

`yarn build` also runs TypeScript checks. Existing renderer type errors and remaining launch gaps are recorded in [AUDIT.md](./AUDIT.md).
