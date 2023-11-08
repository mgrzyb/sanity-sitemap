export interface SitemapNodeData {
    _key: string
    page: {
        _type: string;
        _ref: string
    },
    children?: {
        type: 'collection',
        collection: string
    } | {
        type: 'nodes',
        nodes: SitemapNodeData[] | undefined
    }
}