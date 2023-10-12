import {definePlugin, PluginOptions, RuleDef} from 'sanity'
import { SitemapInput } from './SitemapInput';
export * from "./SitemapPane";


interface MyPluginConfig {
  pageTypes: string[]
}

export const sanitySitemap = definePlugin<MyPluginConfig>((config)  => {
  return {
    name: 'sanity-sitemap',
    schema: {
      types: [
        {
          title: 'Sitemap Node',
          name: 'sitemap-node',
          type: 'object',
          fields: [
            {
              title: 'Document',
              name: 'document',
              type: 'reference',
              validation: rule => rule.required(),
              to: config.pageTypes.map(t => ({type: t}))
            },
            {
              title: 'Children',
              name: 'children',
              type: 'array',
              of: [{type: 'sitemap-node'}],
            },
          ],
          preview: {
            select: {
              title: 'document.title',
            },
          },
        },
        {
          title: 'Sitemap',
          name: 'sitemap',
          type: 'document',

          liveEdit: false,
          fields: [
            {
              title: 'Structure',
              name: 'roots',
              type: 'array',
              of: [{type: 'sitemap-node'}],
              options: {
                pageTypes: config.pageTypes
              },
              components: {
                input: SitemapInput
              },
            },
          ],
        },
      ],
    },
  }
})
