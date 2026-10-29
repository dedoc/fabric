# API reference viewer release audit

Reviewed: 2026-10-08.
Verification updated: 2026-10-29.

## Current position

Fabric is a working alpha: usable with selected specifications, but not yet reliable as a general-purpose API reference viewer. Most remaining work concerns correctness and release checks rather than visual polish. Valid specifications can still lose required inputs or schema fields, and copied requests can omit information needed to call an endpoint.

This assessment combines code review, targeted rendering probes, and automated checks. It does not establish full OpenAPI compatibility, security, accessibility, or large-spec performance.

## Implemented

- JSON/YAML loading for OpenAPI 3.0/3.1, structural validation, HTTP error handling, timeout, cancellation of stale loads, and loading/error/retry states.
- Overview, endpoint, schema, and OpenAPI 3.1 webhook pages.
- Search, grouped navigation, hash deep links, browser history synchronization, and mobile navigation.
- Request/response schemas, media selection, and JSON/XML/form examples.
- Bash and Laravel request snippets with copy actions.
- Effective authentication documentation, including inheritance, optional/public access, referenced schemes, OAuth scopes, and AND/OR requirements.
- Read-only authentication information. Credential entry and storage are not part of the reference viewer.
- Sanitized Markdown/HTML descriptions and API branding with logo fallbacks.
- Stable scrollbar space in the left navigation.

The active demo is bundled at `public/specs/fabric-reference.yaml`. `HelloWorld.tsx` accepts `specUrl`; the shared playground catalog supplies the viewer's existing options. Spotify and Converterer proxies are development-only.

## Verification

Latest checks on 2026-10-29:

| Check | Result |
| --- | --- |
| `yarn test` (React behavior suites and TypeScript core suites) | 204 passed |
| `yarn build` (TypeScript checks and playground bundle) | Passed |
| `yarn build:lib` | Passed |
| Browser smoke checks | Passed: navigation/history, search, schema tabs/copying, media selection, webhooks, themes, 390px mobile navigation, and CDN embedding/retry/destroy/remount |

Response grouping is typed, response components accept string status keys such as `default` and `2XX`, and path keys are passed as strings. All build errors are resolved. Passing tests and smoke checks do not cover every compatibility gap below.

## Release task sets

Each checkbox is a separately reviewable task. Complete sets 1–5 before a scoped beta, implement or remove the unfinished feature in set 6, and complete the beta checks in sets 7–8. Deferred scope is listed separately.

### 1. Restore the production build

**Status:** The production build passes, including TypeScript checks.

- [x] B1 — Handle unresolved/optional schemas explicitly and correct property-name typing in `Schema.tsx`.
- [x] B2 — Type the parameter-property accumulator and pass parameter/reference unions consistently through request components.
- [x] B3 — Treat response status keys consistently as strings, including `default` and ranges; correct status-label lookup and response grouping types.
- [x] B4 — Resolve response-header references and handle schema-based and content-based Header Objects explicitly.
- [x] B5 — Correct operation method/key typing in `Paths.tsx`; rerun the full build after reference and request changes.

**Done when:** `yarn build` passes without disabling type checks or concealing errors with broad casts.

### 2. Make local reference resolution consistent

**Status:** R1–R6 are implemented. Supported consumers share document-root pointer resolution and version-aware sibling handling. Missing, circular, malformed, and external references produce local diagnostics; unresolved schemas no longer replace the whole viewer. External files remain unsupported and are never fetched by the resolver.

- [x] R1 — Introduce a shared local-document resolver with decoded pointer tokens, including escaped slash and tilde, and documented reference locations beyond components.
- [x] R2 — Follow reference chains with cycle detection; distinguish unresolved references from recursive schemas.
- [x] R3 — Adopt the resolver for schemas, parameters, request bodies, responses, headers, examples, security schemes, and Path Items where supported.
- [x] R4 — Apply version-appropriate reference sibling handling consistently in documentation and generated examples.
- [x] R5 — Show useful local diagnostics for unsupported/unresolved references rather than silently dropping data or replacing the whole viewer where recovery is possible.
- [x] R6 — Add fixtures for escaped names, chains, cycles, recursive schemas, missing targets, and non-component pointers; explicitly detect/report external references for the beta.

**Done when:** Supported local references resolve consistently across documentation and examples, with visible diagnostics for unsupported references.

**Dependency:** R1–R2 establish behavior needed by sets 3–5. External-document fetching is deferred.

Implementation: `localReferences.ts` exposes document-root pointer lookup and chain diagnostics. `references.ts` applies OpenAPI 3.0/3.1 sibling rules; `useReferences.ts` supplies the original document to component consumers. OpenAPI 3.0 ignores reference siblings; 3.1 schema siblings retain conjunctions, while other Reference Objects accept summary/description overrides. Path Item conflicts warn and prefer referenced fields because the specification leaves conflicts undefined. Recursive property/item/composition rendering terminates with a recursive-schema label. Affected example panels suppress incomplete generated copies while retaining raw schema views.

`tests/fixtures/local-references.json` covers escaped names, aliases, recursion, missing/external targets, and references through paths/webhooks and array entries. Pure, SSR, and mounted-viewer tests cover resolution, version differences, diagnostics, and continued navigation. JSON Schema anchors, `$id` resource scopes, and boolean schema targets remain outside the supported subset and produce resolver diagnostics. Constraint-valid example generation and advanced schema semantics remain in sets 4–5.

### 3. Preserve complete request information

**Status:** Q1–Q6 are implemented. Normal endpoints and webhooks share `effectiveParameters`, which resolves references before comparing the case-sensitive name/location pair and replaces inherited definitions with operation definitions. Request-body descriptions and required/optional status are visible. Parameter metadata stays on Parameter Objects rather than being reduced to schema properties.

- [x] Q1 — Merge path-level and operation-level parameters by name/location, resolving references before comparison and respecting operation overrides.
- [x] Q2 — Reuse effective-parameter handling for webhooks so inheritance rules do not diverge.
- [x] Q3 — Resolve request-body references before rendering and example generation.
- [x] Q4 — Display request-body descriptions and whether the body is required.
- [x] Q5 — Preserve parameter-level examples, schema/content alternatives, and serialization settings such as `style`, `explode`, and `allowReserved`.
- [x] Q6 — Add fixtures for inherited required parameters, overrides, referenced bodies, and parameter metadata.

**Done when:** Every required input in supported specifications appears with enough information to encode it correctly.

`public/specs/fabric-reference.yaml` is the growing Reference Lab fixture, selectable with `?spec=/specs/fabric-reference.yaml`. Its operation, parameter, body, response, header, schema, and example descriptions explain each case. GET/PATCH project endpoints demonstrate inheritance, alias chains, replacement semantics, and same-name parameters in different locations. Search demonstrates schema/content parameters, explicit serialization settings, and named/referenced examples. Preview has an optional inline body; the webhook shares normal inheritance behavior. Parameter examples override root schema examples without mutating the specification, including falsy values, and reuse the schema-property example display. Serialization settings remain preserved in the source/model and are hidden from parameter rows; content-based parameters display their media type and examples.

Regression tests cover both override directions (inline/reference), required inputs, immutable merging, unresolved diagnostics, webhook parity, referenced/inline bodies, metadata, and example precedence. Browser checks verified endpoint/body/webhook behavior at normal width and the parameter layout at phone width. Effective parameter values now feed generated request snippets through E1.

### 4. Preserve schema meaning

**Finding:** R4 preserves `allOf` and sibling constraints without flattening them by overwriting fields. Nullable values, maps, read/write-only fields, discriminators, deprecation, patterns, exclusive bounds, and array constraints are not fully represented. Constraint-aware example generation remains incomplete.

- [x] S1 — Preserve sibling properties and required fields alongside `allOf`; retain composition meaning rather than overwriting incompatible constraints.
- [x] S2 — Render OpenAPI 3.0 `nullable` and supported OpenAPI 3.1 null unions consistently.
- [x] S3 — Render maps through `additionalProperties`, including typed values and restrictions on extra properties.
- [x] S4 — Display `readOnly`, `writeOnly`, and deprecation; carry request/response direction into schema usage and examples.
- [x] S5 — Display patterns, exclusive numeric bounds, and array size/uniqueness constraints for the supported subset.
- [x] S6 — Document supported schema constructs and warn in Markdown for unsupported constructs, including discriminators until implemented; add regression fixtures for supported cases. No new UI warnings, per requested scope.

**Done when:** Supported schema information is preserved, unsupported semantics are disclosed, and rendering/examples agree on composition and direction.

S5–S6: shared numeric-bound handling renders 3.0 boolean and 3.1 numeric exclusivity consistently in badges and inline type ranges. Patterns are shown literally; array item limits retain zero and uniqueness is shown when enabled. Both Reference Lab specifications contain browsable regression cases with authored examples. [SCHEMA_SUPPORT.md](./SCHEMA_SUPPORT.md) records the supported subset and unsupported constructs, including discriminator behavior and the remaining E2 sample-generation limitations. Unsupported-keyword warnings are documentation-only; existing reference diagnostics remain in place.

S2–S4: type previews support 3.0 nullable types and 3.1 type-array/anyOf/oneOf null unions, including nullable array items. Explicit null examples are retained; generated unions prefer a non-null branch. Maps display `[key: string]` value schemas and explicit extra-property permissions; typed maps generate a sample key. Request usage omits read-only properties; response usage omits write-only properties, including nested fields, referenced properties, and structured authored/generated examples. Standalone schema pages retain both annotations. Serialized XML strings remain authored literals. `/schema-lab` in the Reference Lab covers both usage directions, maps, null unions, deprecation, and JSON/form switching. The linked `fabric-reference-3.0.yaml` fixture covers nullable compatibility. Regression checks cover documentation, JSON, form, XML, composed annotations, and authored examples without mutating source data.

### 5. Make copied examples trustworthy

**Resolved finding:** Request snippets now include effective parameters, use media-specific serialization, respect supported generated constraints and allow named media-example selection. Complete Basic/Bearer authentication alternatives remain shared by both senders. Unsupported generation is disclosed; the supported subset is documented below.

- [x] E1 — Pass effective parameters into the shared request model; substitute encoded path values and include query/header/cookie values using supported serialization rules.
- [x] E2 — Respect supported numeric, string, and array constraints when generating values; disclose cases where a valid sample cannot be generated.
- [x] E3 — Apply request/response direction: omit read-only fields from generated requests and write-only fields from responses.
- [x] E4 — Serialize by media type, preserving plain text without JSON quoting and explicitly handling unsupported/binary formats.
- [x] E5 — Add named media-example selection, preserving values/descriptions and retaining supplied values instead of regenerating them.
- [x] E6 — Keep Bash and Laravel aligned with the shared request model; add fixtures for parameters, encoding, constraints, direction, and media types.

E1–E6: both senders consume one parameter-aware request model. The browsable `/example-lab/{name}` fixture covers encoded paths, queries, headers/cookies, generated constraints, direction, named text/JSON values and placeholder binary uploads. Binary request snippets use local file placeholders, including referenced multipart file properties and file arrays; binary response bytes remain unavailable. Regression tests verify read-only authentication information and matching displayed/copied request examples. [SCHEMA_SUPPORT.md](./SCHEMA_SUPPORT.md) documents serialization and bounded generation limits; unsupported generation produces an explanation and disables copying.

**Done when:** Copies include supported required inputs and match the displayed examples, and generated samples do not silently contradict the contract.

**Dependency:** Effective parameters from set 3 and schema semantics from set 4.

### 6. Remove unfinished visible features

**Status:** The schema TypeScript tab produces copyable, self-contained type declarations. Remaining visible actions still need the U2 review.

- [x] U1 — Implement TypeScript output or remove the tab for the beta.
- [ ] U2 — Check remaining visible actions/tabs for placeholder output, including empty and missing-example states.

**Done when:** Every visible action produces a useful result or an explicit supported empty state.

U1: schema output preserves required/optional fields, primitives, arrays, literals, nullability, typed maps, unions and intersections. Local references use named types with their reachable declarations included once, backed by the shared version-aware schema graph; recursive objects and arrays retain named aliases. Output includes all composition branches independently of example selection. Missing/unsupported references and generation limits disable copying and show an explanation. Regression tests compile declarations with TypeScript, check accepted/rejected assignments, and exercise tab switching and copying. Structural typing limits are documented in [SCHEMA_SUPPORT.md](./SCHEMA_SUPPORT.md).

### 7. Finish navigation and description behavior

**Finding:** Unknown hashes show empty main content. Page titles and keyboard focus do not follow navigation. Relative description links/images resolve against the viewer rather than the specification URL.

- [ ] N1 — Add an unknown-page state with a route to Overview, including unavailable schema links when schemas are hidden.
- [ ] N2 — Update the browser title from API metadata and the selected page.
- [ ] N3 — Add skip-to-content and deliberate content focus after navigation; preserve usable back/forward behavior.
- [ ] N4 — Resolve relative description links/images against the original source URL, retaining sanitizer protections and mirrored/proxied source URLs.
- [ ] N5 — Run browser and accessibility checks for deep links, history, disclosures, dialogs, copying, media selection, keyboard operation, and mobile layouts; fix discovered blockers.

**Done when:** Navigation has no blank destinations, works by keyboard, and relative resources resolve correctly. Browser checks cover desktop and mobile.

### 8. Establish a reproducible release

**Finding:** There is no unified test script or CI workflow. Production configuration/CORS needs a documented contract. Large-spec performance has not been established.

- [ ] L1 — Add one test command for all seven existing suites, including TypeScript suites through a supported runner.
- [ ] L2 — Add CI for dependency installation, all tests, and `yarn build`.
- [ ] L3 — Document deployment/embedding: `specUrl`, `showSchemas`, same-origin hosting, remote-source CORS, and development proxy limitations.
- [ ] L4 — Smoke-test built assets with the bundled demo and a configured production source, including reloads/deep links.
- [ ] L5 — Publish the supported OpenAPI subset and limitations; keep curated regression specifications for correctness fixes.
- [ ] L6 — Measure initial load, search, and nested-schema expansion on representative large specifications; record results and acceptable limits before claiming large-spec support.
- [ ] L7 — Run release checks against the curated beta specifications and update this audit with results and remaining limitations.

**Done when:** A clean checkout reproduces tests/build, deployment loads the intended specification, and compatibility claims match verified fixtures.

## Deferred scope

These features are not required for a scoped reference-viewer beta if limitations are explicit:

- External-document references: relative/absolute file fetching, per-file source URLs, caching, cycles, CORS, and fetch failures. Required before claiming support for specifications such as SpaceTraders.
- Credential entry for API keys, OAuth authorization flows, OpenID Connect, and combined authentication requirements. Scheme documentation exists; credential entry and storage are outside the reference viewer’s scope.
- Interactive “Try it” requests.
- Additional request-example languages beyond Bash and Laravel.
- Full OpenAPI/JSON Schema coverage beyond the documented subset, including discriminator behavior and advanced schema constructs.

## Recommended launch boundary

Release a scoped beta for self-contained OpenAPI 3.0/3.1 documents and curated, verified specifications after the correctness and release tasks above are complete. Disclose unsupported constructs and reference types. Expand compatibility when regression fixtures and browser checks demonstrate it.

Fix dropped or misleading information before adding features. OAuth login, more snippet languages, and an interactive request console are not prerequisites for this launch boundary.
