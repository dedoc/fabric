# Fabric API reference

A Vue API reference viewer for OpenAPI 3.0 and 3.1 documents.

## Run

```sh
yarn install
yarn dev
```

Scalar Galaxy is the active test specification, with HTTP Bearer authentication among its supported methods. Specifications are fetched at runtime; none are bundled.

## Use another specification

In `src/components/HelloWorld.vue`, comment out the active `specUrl` and uncomment another. Choices include Scalar Galaxy, SpaceTraders, Spotify, Converterer, Petstore, GitHub, Stripe, Box, and local test APIs. SpaceTraders uses external schema references, which the renderer does not yet resolve.

The URL can serve JSON or YAML. Spotify and Converterer use development proxies configured in `vite.config.ts`. Other cross-origin sources must allow browser requests through CORS. These proxies are for local testing; production source hosting remains a separate deployment concern.

When embedding the viewer, pass `specUrl` and optionally `showSchemas` to `src/components/HelloWorld.vue`. Omitting `specUrl` uses the selected test URL. Changing the prop cancels the previous load.

## Errors and description safety

The loader checks HTTP status, JSON/YAML parsing, supported versions, required document metadata, and key rendering structures. These checks are not a complete OpenAPI conformance validator. Loading has a 30-second timeout. Loading, parsing, structural, and descendant rendering failures show a small error page with a retry action.

Description Markdown and embedded HTML are sanitized with an allowlist before rendering. Formatting, safe links, images, and tables are preserved; active elements, event handlers, inline styles, and unsafe URL schemes are removed.

## Checks

```sh
node --test tests/schemaViewer.test.mjs tests/specSafety.test.mjs
yarn vite build
yarn build
```

`yarn build` also runs TypeScript checks. Existing renderer type errors and remaining launch gaps are recorded in [AUDIT.md](./AUDIT.md).
