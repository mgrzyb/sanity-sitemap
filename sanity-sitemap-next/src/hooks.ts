import {type SanityClient} from "next-sanity";
import {
    fetchAncestors, fetchPageById,
    fetchPagesByIds,
    fetchPagesBySlugs,
    fetchSitemapRootNode, getAncestorNodes, getUrlFromSegments,
    matchSitemapSegments
} from "./utils.js";
import {ResponseQueryOptions} from "@sanity/client";
import {SitemapNodeData} from "./SitemapNodeData.js";
import {SitemapPage} from "./SitemapPage.js";

export type TUseSitemapReturn<TPage extends SitemapPage> = {
    root: SitemapNodeData;
    matchPath: (
        pathSegments: string[],
    ) => Promise<{ matchedPath: TPage[]; unmatchedSegments: string[] }>;
    getPageUrl: (pageId: string) => Promise<string | undefined>;
    getPageUrlMap: (pageIds: string[]) => Promise<{ [pageId: string]: string }>;
};

type UseSitemapOptions<TPage> = {
    pageTypes: readonly string[],
    additionalProperties?: readonly (keyof TPage)[],
    pagesCache?: Map<string, TPage>
    fetchOptions?: ResponseQueryOptions 
}

export const useSitemap = async <TPage extends SitemapPage = SitemapPage>(client : SanityClient, options : UseSitemapOptions<TPage>) => {
    
    const pagesCache = options.pagesCache ?? new Map();
    const additionalProperties = options.additionalProperties ?? [];
    const fetch = (q: string, p: any) =>
        options.fetchOptions ? client.fetch(q, p, options.fetchOptions) : client.fetch(q, p);
    
    const sitemapRoot = await fetchSitemapRootNode(fetch);
    const homePage = await fetchPageById<TPage>(fetch, sitemapRoot.page._ref, additionalProperties, pagesCache);

    return {
        root: sitemapRoot,
        matchPath: async (pathSegments: string[]) => {
            const pages = await fetchPagesBySlugs(fetch, options.pageTypes, pathSegments, additionalProperties);
            return matchSitemapSegments(sitemapRoot, homePage, pathSegments, pages);
        },
        getPageUrl: async (pageId: string) => {
            const ancestors = await fetchAncestors<TPage>(fetch, sitemapRoot, pageId, additionalProperties, pagesCache);
            if (!ancestors) return undefined;
            if (ancestors.length > 0) ancestors.splice(0, 1); // Remove home
            return getUrlFromSegments(ancestors.map((p) => p.slug));
        },
        getPageUrlMap: async (pageIds: string[]) => {
            const toBeFetched = new Set<string>();
            const wip: { pageId: string; ancestorNodes: SitemapNodeData[] }[] = [];
            for (const pageId of pageIds) {
                const ancestorNodes = getAncestorNodes(sitemapRoot, pageId);
                if (!ancestorNodes) continue;
                if (ancestorNodes.length > 0) ancestorNodes.splice(0, 1); // Remove home

                wip.push({pageId, ancestorNodes});

                for (const node of ancestorNodes) {
                    toBeFetched.add(node.page._ref);
                }
            }
            const pages = new Map(
                (await fetchPagesByIds<TPage>(fetch, [...toBeFetched], additionalProperties, pagesCache)).map((p) => [p._id, p]),
            );

            const result: { [pageId: string]: string } = {};
            for (const e of wip) {
                const pathPages = e.ancestorNodes.map((n) => pages.get(n.page._ref));
                if (pathPages.some(p => !p))
                    result[e.pageId] = "#"; // at least one of the pages in the path was not fetched (not published?)
                else
                    result[e.pageId] = getUrlFromSegments(pathPages.map(p => p.slug));
            }
            return result;
        },
    };
};