This is a POC of a Sanity plugin that adds a hierarchical sitemap capabilities to Sanity (a feature that is often needed when building content sites).
The idea is to have a singleton document - a sitemap - that holds a tree of sitemap-nodes each having a reference to a document (page) and a list of child nodes.
The plugin implements a custom input that uses a rc-tree component to edit the hierarchy (drag and drop, add child page, remove page, see the screenshot).

![obraz](https://github.com/mgrzyb/sanity-sitemap/assets/2089953/bb45c906-af60-44a2-99f4-4a3b462d2337)

In addition, I tried writing some helper functions to consume the sitemap in runtime (with next 13 app router):

```ts
export default async function Page({params}: { params: { segments: string[] } }) {

  const sitemap = await useSitemap(getClient());
	
	// match url segments agains the sitemap
  const routedContext = await sitemap.matchPath(params.segments);
    
  if (routedContext.rest.length)	// not all segments were matched
      return notFound();
    
	// last page of the matched path is the current page
  const currentPage = routedContext.matchedPath[routedContext.matchedPath.length - 1];
	
  return (
      <>
          <h1>{currentPage.title}</h1>
	
          <ul class="breadcrumbs">
            {routedContext.matchedPath.map(async p => (
              <li>
                <a href={await sitemap.getUrl(p._id)}>{p.title}</a>
              </li>))}
          </ul>
        </>);
}
```
