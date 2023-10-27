import {type SanityClient} from "next-sanity";
import {
    fetchAncestors,
    fetchPagesByIds,
    fetchPagesBySlugs,
    fetchSitemapRootNode, getAncestorNodes, getUrlFromSegments,
    matchSitemapSegments
} from "./utils.js";
import {ResponseQueryOptions} from "@sanity/client";
import {SitemapNodeData} from "./SitemapNodeData.js";

export async function useSitemap(client: SanityClient, pageTypes: string[], fetchOptions: ResponseQueryOptions) {
    
    const fetch = (q, p) => client.fetch(q, p, fetchOptions);
    
    const sitemapRoot = await fetchSitemapRootNode(fetch);
    const [homePage] = await fetchPagesByIds(fetch, [sitemapRoot.document._ref])
    
    return {
        matchPath: async (pathSegments: string[]) => {
            const pages = await fetchPagesBySlugs(fetch, pageTypes, pathSegments);
            const [homePage] = await fetchPagesByIds(fetch, [sitemapRoot.document._ref]);
            
            return matchSitemapSegments(sitemapRoot, homePage, pathSegments, pages)
        },
        getPageUrl: async (pageId: string)=> {
            const ancestors = await fetchAncestors(fetch, sitemapRoot, pageId);
            if (!ancestors)
                return undefined;
            if (ancestors.length > 0)
                ancestors.splice(0, 1); // Remove home             
            return getUrlFromSegments(ancestors.map(p => p.slug));
        },
        getPageUrlMap: async (pageIds : string[]) => {
            const toBeFetched = new Set<string>();
            const wip : { pageId: string, ancestorNodes: SitemapNodeData[] }[] = [];
            for (const pageId of pageIds) {
                const ancestorNodes = getAncestorNodes(sitemapRoot, pageId);
                if (!ancestorNodes)
                    continue;
                
                wip.push({ pageId, ancestorNodes });
                
                for (const node of ancestorNodes) {
                    toBeFetched.add(node.document._ref)
                }
            }
            const pages = new Map((await fetchPagesByIds(fetch, [...toBeFetched])).map(p => [p._id, p]));
            
            const result : { [pageId: string] : string } = {};
            for (const e of wip) {
                result[e.pageId] = getUrlFromSegments(e.ancestorNodes.map(n => pages.get(n.document._ref).slug))
            }
            return result;
        }
    }
}