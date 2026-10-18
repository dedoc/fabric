Planned Fabric API

## Init the spec
```ts
Fabric.init(options: FabricRootOptions);

type FabricRootOptions = FabricOptions

type FabricOptions = {
	openApiDocument: string | () => Promise<string>,
	showSchemas: bool,
	referenceLabel?: boolean, // default: true; show the sidebar's Reference heading
	logo?: LogoConfig | false,
}
```

```js
Fabric.init({
	openApiDocument: string(json or yaml) | url (will be fetched) | async function that returns string (yaml json),
});
```

## More spec options
```js
Fabric.init({
	openApiDocument: string(json or yaml) | url (will be fetched) | async function that returns string (yaml json),
	showSchemas: false, // enable or disable schemas section. when disabled, references to schema objects across documentation are rendered as text, not as links to schema pages
	referenceLabel: false, // hide only the Reference heading; navigation, Webhooks, and Schemas stay unchanged
	logo?: LogoConfig | false,
});
```

## Multiple API versions or specs
```js
Fabric.init({
	specs: (FabricOptions & { name: string, slug: string, order: number })[],
	defaultSpec: string,
	logo?: LogoConfig | false,
});
```

## Navigation sections

Use `kind: nav-section` on an OpenAPI 3.2 tag to create an always-visible navigation section. Its name (or `summary`, when supplied) becomes the section heading; its operations and child groups appear beneath it without an extra level of indentation.

```yaml
openapi: 3.2.0
tags:
  - name: catalog
    summary: Catalog
    kind: nav-section
  - name: products
    summary: Products
    parent: catalog
paths:
  /products:
    get:
      tags: [products]
      responses:
        '200':
          description: Product list
```

Set `referenceLabel: false` in the Fabric config to hide the default “Reference” heading when these section headings provide the grouping. This only hides that heading; navigation order, Webhooks, and Schemas stay unchanged.

## Logo

```ts
type LogoImage = {
  src: string
  srcDark?: string
  alt: string
  height?: number // displayed pixels; default 36, aspect ratio preserved
}

type LogoConfig = {
  title?: string
  image?: LogoImage
  href?: string | false // default: selected API overview; false: no link
  target?: '_self' | '_blank' // default: _self
}
```

Branding belongs to the selected API. Omit `logo` to use `info.x-logo`, or set it to `false` to hide branding. A configured object replaces spec branding entirely. Set `title`, `image`, or both; an empty object falls back to the selected API title. A missing, invalid, or failed image uses the configured title, falling back to the selected API title when none is set. A missing `srcDark` uses `src`.

Config image and link paths resolve against the host page URL; spec branding paths resolve against the specification URL. Only HTTP(S) image and link URLs are accepted. Use `alt: ''` for an image beside text that already names the brand. Image-only branding uses `alt`, with the API title supplying an accessible name if `alt` is empty.

## Guides
```js
Fabric.init({
	openApiDocument: spec,
	guides: {
		auth: string (md with frontmatter),
		'rate-limits': string,
	},
})
```

Guide itself is a markdown with frontmatter:

Frontmatter include

```
title: Authentication
order: 1
```

When you want to use guide in some docs group, just:
```
title: Events
group: events
```








