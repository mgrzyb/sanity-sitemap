import {definePlugin, PluginOptions, RuleDef} from 'sanity'
import {SitemapInput} from './SitemapInput';

//export * from "./SitemapPane";


interface MyPluginConfig {
  pageTypes: string[]
}

export const sanitySitemap = definePlugin<MyPluginConfig>((config) => {
  return {
    name: 'sanity-sitemap',
    schema: {
      types: [
        {
          name: 'sitemap-node',
          type: 'object',
          title: 'Sitemap Node',
          fields: [
            {
              name: 'target',
              type: "object",
              title: "Target",
              fields: [
                {
                  name: 'type',
                  title: 'Node type',
                  type: 'string',
                  options: { list: ['document', 'url'] }
                },
                {
                  name: 'document',
                  type: 'reference',
                  title: 'Document',
                  to: config.pageTypes.map(t => ({type: t}))
                },
                {
                  name: 'url',
                  type: 'url',
                  title: 'Url'
                },
                {
                  name: 'title',
                  title: 'Title',
                  type: 'string'
                }
              ]
            },
            {
              name: 'children',
              type: 'object',
              fields: [
                {
                  name: 'type',
                  type: "string",
                  title: 'Children type',
                  options: { list: ['nodes', 'collection'] }
                },
                {
                  name: 'nodes',
                  type: 'array',
                  title: 'Child nodes',
                  of: [{type: 'sitemap-node'}],
                },
                {
                  name: 'collection',
                  type: 'string',
                  title: 'Collection'
                }
              ]
            }
          ],
          preview: {
            select: {
              title: 'target.document.title',
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
              title: 'Roots',
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
