# sanity-sitemap

> This is a **Sanity Studio v3** plugin.

## Installation

```sh
npm install sanity-sitemap
```

## Usage

Add it as a plugin in `sanity.config.ts` (or .js):

```ts
import {defineConfig} from 'sanity'
import {sanitySitemap} from 'sanity-sitemap'

export default defineConfig({
  //...
  plugins: [sanitySitemap({ pageTypes: ["page", /*...*/]})],
})
```

## License

[MIT](LICENSE) © Maciej Grzyb

## Develop & test

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit)
with default configuration for build & watch scripts.

See [Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugin-kit#testing-a-plugin-in-sanity-studio)
on how to run this plugin with hotreload in the studio.
