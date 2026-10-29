# Fabric

Modern and fast API reference viewer for OpenAPI with custom navigation and guides support.

## Run

```sh
yarn install
yarn dev
```

## Build for CDN embedding

```sh
yarn build:lib
```

This bundles the viewer into `dist/fabric.js`, with styles in `dist/fabric.css`. The JavaScript exposes `window.Fabric`;
