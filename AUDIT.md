# API reference renderer launch audit

Reviewed: 2026-10-08.

The visual foundation is solid, but the renderer is not ready for a general-purpose OpenAPI launch. The main risks are missing or misleading API information, unsafe description rendering, and production failure handling.

This is a code review with targeted rendering probes and automated checks, not a complete security, accessibility, or performance certification. No fixes were made as part of the audit.

## Remediation update — 2026-10-08

P0 HTML safety and failure handling have been addressed. Production source hosting remains deferred: this app currently uses switchable test URLs, with no bundled specifications.

- Descriptions now pass through an HTML allowlist sanitizer. Regression checks cover active HTML, event handlers, unsafe URL schemes, and preservation of useful formatting.
- Test sources can be switched using the commented URLs in `HelloWorld.vue` or the viewer's `specUrl` prop. The loader checks HTTP responses, parsing, document version/metadata, and key rendering structures, with a 30-second timeout and cancellation of stale loads.
- Loading and descendant rendering failures show a compact error page with a retry action. Checks exercise failure-to-success recovery and unresolved schema rendering failures.
- Endpoint authentication now resolves the effective security requirements and referenced schemes. Overview and endpoint pages share scheme-specific instructions, including Basic authentication, API key locations, token authentication, OAuth scopes, optional/public access, and AND/OR combinations. Converterer's API-key username and empty-password instructions are shown from the specification.
- Endpoints expose authentication through a compact lock label and dialog. Basic credentials can be entered, edited, or cleared in memory for the current specification; Bash and Laravel request examples include them for a complete Basic authentication option. Other authentication types in generated examples remain open.
- Request examples display a clickable lock chip instead of credentials, including before credentials are set. Copy generates an actual `Authorization: Basic` header from Base64-encoded UTF-8 `username:password`; credentials and encoded values are excluded from displayed code.
- HTTP Bearer authentication now supports masked token entry, editing, clearing, green configured locks, and raw `Authorization: Bearer` headers in Bash/Laravel copies. Basic and Bearer share selection of a complete authentication alternative. The active unbundled test specification is Scalar Galaxy. SpaceTraders remains a commented source for testing the external-reference limitation.

Structural validation is deliberately not a full OpenAPI conformance validator. The other P1 correctness and compatibility findings below remain open, including authentication in generated request examples. The original findings and verification results are retained as the audit baseline.

## Verification

- All 27 schema/viewer tests passed.
- All 31 example-generation tests passed, loaded through Vite's SSR module loader.
- `yarn vite build` passed.
- `yarn build` failed with 13 TypeScript errors across schema rendering, parameters, responses, paths, operations, and the spec loader.
- Passing tests do not cover all the failures listed below. Targeted probes confirmed several gaps independently.

## Launch priorities

| Priority | Finding | Impact |
| --- | --- | --- |
| P0 — addressed | Unsanitized description HTML | HTML is now sanitized before rendering. |
| P0 — partially addressed | Production loading and failure handling | Checks, timeout, and an error page are implemented. Production source hosting is deferred; development test URLs remain active. |
| P1 — addressed | Incorrect authentication rendering | Endpoint and Overview pages share scheme-specific authentication documentation and effective security semantics. |
| P1 | Incomplete reference and schema resolution | Valid specs can lose fields, show empty sections, or fail rendering. |
| P1 | Missing request information | Shared parameters and important request-body metadata disappear. |
| P1 | Inaccurate copied examples | Examples can omit required information or contradict the schema. |
| P1 | Broken release checks | The normal production build cannot pass. |

### 1. Sanitize description HTML — P0

**Evidence:** `src/components/OpenApi/Description.vue` enables `html: true` in Markdown-it and inserts the result using `v-html`. A targeted SSR probe confirmed that an image's `onerror` attribute survives unchanged. The probe checked rendered markup; it did not execute the payload in a browser.

**Impact:** This is a launch blocker when specifications can come from customers or other external sources.

**Recommended fix:** Sanitize rendered HTML with an allowlist that preserves useful formatting and safe links. Cover raw HTML, event attributes, and unsafe URL schemes with regression tests.

### 2. Replace the development-only loading path and add failure states — P0

**Evidence:** `src/components/HelloWorld.vue` loads `/spotify/open-api-schema.yaml`. That route is supplied by `server.proxy` in `vite.config.ts`; it is not a bundled static asset. Loading has no HTTP-status check, document validation, visible loading state, error message, or retry.

**Impact:** A standalone static deployment needs an equivalent route or a bundled specification. Network and parsing failures can otherwise leave the page empty.

**Recommended fix:** Define the production spec-loading contract. Validate responses and supported document versions, and render actionable loading/error/retry states. Isolate rendering failures so one unsupported schema does not blank the documentation.

### 3. Render effective authentication correctly — P1

**Evidence:** `src/components/OpenApi/Partials/OperationDatums.vue` hardcodes `Auth: Bearer token` for every security requirement. It inherits root security but does not describe the referenced scheme, OAuth scopes, AND/OR combinations, or optional authentication accurately. The Overview describes schemes more accurately than endpoint pages.

**Impact:** Basic authentication, API keys, and other security configurations receive incorrect instructions.

**Recommended fix:** Resolve effective security requirements and schemes in one shared model. Render scheme-specific instructions, scopes, alternatives, combined requirements, and public access consistently.

### 4. Preserve reference and composition semantics — P1

**Evidence:** Targeted probes confirmed:

- `#/components/schemas/A~1B` does not resolve to a schema named `A/B`.
- A schema with its own properties alongside `allOf` loses those properties in the rendered documentation.

`src/components/OpenApi/utils.ts` resolves references by splitting paths and indexing into components. It does not provide general document-pointer or external-document resolution. `src/components/OpenApi/Schema.vue` has separate composition logic and throws when a schema reference cannot resolve. Referenced request bodies and response headers are also incomplete.

**Impact:** Valid documents can silently lose information, display empty sections, or fail rendering. Documentation and generated examples can disagree because their resolution paths differ.

**Recommended fix:** Introduce shared, cycle-aware reference and composition handling. Decode JSON Pointer tokens, handle reference chains and supported reference locations, preserve composition siblings, and show explicit diagnostics for unsupported or unresolved references. Decide and document the external-reference support boundary.

### 5. Include inherited parameters and request-body metadata — P1

**Evidence:** `getInlineOperations` in `src/components/OpenApi/utils.ts` passes operation objects without merging path-level parameters. A probe confirmed that a required path-level `id` parameter is absent from the resulting operation. `src/components/OpenApi/RequestBody.vue` renders media content but omits the request body's description and `required` flag. Parameter transformation also omits parameter-level examples and serialization settings.

**Impact:** Users can miss required inputs or receive insufficient instructions for encoding them.

**Recommended fix:** Merge path-level and operation-level parameters using their name and location, respecting operation overrides. Resolve request-body references, render body descriptions and required state, and preserve parameter examples and serialization metadata.

Reference: [OpenAPI 3.0.3 Path Item Object](https://spec.openapis.org/oas/v3.0.3.html#path-item-object).

### 6. Make examples accurate and explicit about their origin — P1

**Evidence:** `src/components/OpenApi/requestExamples/index.ts` receives no authentication or parameter information. Generated requests omit required auth headers and query/header/cookie parameter values, and leave URL placeholders such as `/files/{id}` intact.

Targeted probes also confirmed:

- `createSchemaExample({type: 'integer', minimum: 5})` returns `0`.
- A `text/plain` media example of `hello` is serialized as `"hello"`.

`src/components/OpenApi/schemaExamples.ts` generates all object properties without request/response filtering. `src/components/OpenApi/mediaExamples.ts` serializes non-XML media through JSON. Only the first named media example is selected.

**Impact:** Copied requests may not work, and generated payloads may contradict the documented contract.

**Recommended fix:** Include effective parameters and security in request generation, use appropriate placeholders, respect constraints and request/response direction, and serialize media according to its type. Distinguish supplied examples from generated examples. Support selection among named examples or clearly disclose the limitation.

### 7. Restore a passing production build — P1

**Evidence:** `yarn build` fails with 13 TypeScript errors. Affected files include `Schema.vue`, `Parameters.vue`, `Partials/ResponseHeader.vue`, `Partials/ResponseContent.vue`, `Responses.vue`, `Operation.vue`, `Paths.vue`, and `HelloWorld.vue`.

**Impact:** Vite can bundle the application, but the project's normal release command fails. Several errors reflect real gaps around reference unions and response/header types.

**Recommended fix:** Correct the types and their underlying handling rather than bypassing the typecheck. Require the full build and tests to pass in CI.

## Additional gaps before a wider launch

### Schema coverage

The renderer does not fully represent important constructs such as OpenAPI 3.0 `nullable`, maps and `additionalProperties`, `readOnly`/`writeOnly`, discriminators, deprecation, patterns, exclusive numeric bounds, and array constraints. Declare a supported OpenAPI subset and show warnings for unsupported constructs instead of silently hiding them.

### Navigation and accessibility

Unknown hashes currently yield empty main content. Page titles and keyboard focus do not follow navigation. Add a not-found state, page-title updates, deliberate focus handling, and a keyboard path to main content. Run browser and accessibility checks; this audit does not establish accessibility conformance.

### Description links

Relative description links resolve against the viewer URL rather than the original spec URL. Resolve them against the original source consistently, including when the specification is fetched through a proxy.

### Automated release coverage

`package.json` has no unified test command, and the repository has no CI workflow. Add one reproducible command for all suites and CI for tests and the full build. Add browser coverage for deep links, navigation, disclosures, media selection, copying, and mobile behavior. Keep regression fixtures for the failures above.

### Large-spec performance

The current tests do not establish performance limits. Benchmark initial rendering, search, and deeply nested schemas against large fixtures such as GitHub, Stripe, and Box. Set acceptable limits before claiming broad compatibility; optimize based on measurements.

## Recommended launch boundary

Start with a documented subset of OpenAPI and curated specifications after fixing the P0 findings, incorrect authentication, dropped request/schema information, and the production build. Unsupported constructs should produce explicit warnings. Expand compatibility only when fixtures and browser checks demonstrate it.
