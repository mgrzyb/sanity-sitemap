export interface SitemapNodeData {
  _key: string
  document: {
    _type: string;
    _ref: string
  }
  children: SitemapNodeData[] | undefined
}
