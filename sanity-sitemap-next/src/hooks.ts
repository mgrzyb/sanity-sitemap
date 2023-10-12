import {type SanityClient} from "next-sanity";
import {
    fetchAncestors,
    fetchPagesByIds,
    fetchPagesBySlugs,
    fetchSitemapRootNode, getUrlFromSegments,
    matchSitemapSegments
} from "./utils.js";
import {ResponseQueryOptions} from "@sanity/client";

export async function useSitemap(client: SanityClient, pageTypes: string[], fetchOptions: ResponseQueryOptions) {
    
    const fetch = (q, p) => client.fetch(q, p, fetchOptions);
    
    const sitemapRoot = await fetchSitemapRootNode(fetch);
    const [homePage] = await fetchPagesByIds(fetch, [sitemapRoot.document._ref])
    
    return {
        resolvePath: async (segments: string[]) => {
            const pages = await fetchPagesBySlugs(fetch, pageTypes, segments);
            const [homePage] = await fetchPagesByIds(fetch, [sitemapRoot.document._ref]);
            
            return matchSitemapSegments(sitemapRoot, homePage, segments, pages)
        },
        getUrl: async (pageId: string)=> {
            const ancestors = await fetchAncestors(fetch, sitemapRoot, pageId);
            if (!ancestors)
                return undefined;
            if (ancestors.length > 0)
                ancestors.splice(0, 1); // Remove home             
            return getUrlFromSegments(ancestors.map(p => p.slug));
        }
    }
}