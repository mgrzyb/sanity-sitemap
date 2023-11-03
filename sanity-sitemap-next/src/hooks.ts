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
import {SitemapPage} from "./SitemapPage.js";

export type TUseSitemapReturn = {
    root: SitemapNodeData;
    matchPath: (
        pathSegments: string[],
    ) => Promise<{ matchedPath: SitemapPage[]; unmatchedSegments: string[] }>;
    getPageUrl: (pageId: string) => Promise<string | undefined>;
    getPageUrlMap: (pageIds: string[]) => Promise<{ [pageId: string]: string }>;
};

interface IUseSitemap {
    (
        client: SanityClient,
        pageTypes: string[],
        options: { fetchOptions?: ResponseQueryOptions; pagesCache?: Map<string, SitemapPage> },
    ): Promise<TUseSitemapReturn>;
}

export const useSitemap: IUseSitemap = async (client, pageTypes, options = {}) => {
    const fetch = (q: string, p: any) =>
        options.fetchOptions ? client.fetch(q, p, options.fetchOptions) : client.fetch(q, p);
    const pagesCache = options.pagesCache ?? new Map();
    const sitemapRoot = await fetchSitemapRootNode(fetch);
    const [homePage] = await fetchPagesByIds(fetch, [sitemapRoot.document._ref], pagesCache);

    return {
        root: sitemapRoot,
        matchPath: async (pathSegments: string[]) => {
            const pages = await fetchPagesBySlugs(fetch, pageTypes, pathSegments);
            const [homePage] = await fetchPagesByIds(fetch, [sitemapRoot.document._ref], pagesCache);

            return matchSitemapSegments(sitemapRoot, homePage, pathSegments, pages);
        },
        getPageUrl: async (pageId: string) => {
            const ancestors = await fetchAncestors(fetch, sitemapRoot, pageId, pagesCache);
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
                    toBeFetched.add(node.document._ref);
                }
            }
            const pages = new Map(
                (await fetchPagesByIds(fetch, [...toBeFetched], pagesCache)).map((p) => [p._id, p]),
            );

            const result: { [pageId: string]: string } = {};
            for (const e of wip) {
                result[e.pageId] = getUrlFromSegments(
                    e.ancestorNodes.map((n) => pages.get(n.document._ref)!.slug),
                );
            }
            return result;
        },
    };
};