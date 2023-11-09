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

export const useSitemap = async <TPage extends SitemapPage = SitemapPage>(client: SanityClient, options: UseSitemapOptions<TPage>) => {

    const pagesCache = options.pagesCache ?? new Map();
    const additionalProperties = options.additionalProperties ?? [];
    const fetch = (q: string, p: any) =>
        options.fetchOptions ? client.fetch(q, p, options.fetchOptions) : client.fetch(q, p);

    const sitemapRoot = await fetchSitemapRootNode(fetch);
    const homePage = await fetchPageById<TPage>(fetch, sitemapRoot.page._ref, additionalProperties, pagesCache);

    return {
        root: sitemapRoot,
        matchPath: async (pathSegments: string[]) => {
            const pages = await fetchPagesBySlugs(fetch, pathSegments, additionalProperties);
            return matchSitemapSegments(sitemapRoot, homePage, pathSegments, pages);
        },
        getPageUrl: async (pageId: string) => {
            if (pageId === homePage._id)
                return '/';

            const page = await fetchPageById(fetch, pageId, additionalProperties, pagesCache);
            if (!page) return undefined;

            const ancestors = await fetchAncestors<TPage>(fetch, sitemapRoot, page, additionalProperties, pagesCache);
            if (!ancestors) return undefined;

            if (ancestors.length > 0) ancestors.splice(0, 1); // Remove home
            return getUrlFromSegments([...ancestors, page].map((p) => p.slug));
        },
        getPageUrlMap: async (pageIds: string[]) => {
            const pages = await fetchPagesByIds(fetch, pageIds, additionalProperties, pagesCache);
            const idsToBeFetched = new Set<string>();
            const wip: { page: SitemapPage; ancestorNodes: SitemapNodeData[] }[] = [];
            for (const p of pages) {

                const ancestorNodes = getAncestorNodes(sitemapRoot, p._id, p._type);
                if (!ancestorNodes) continue;

                if (ancestorNodes.length > 0) ancestorNodes.splice(0, 1); // Remove home

                for (const node of ancestorNodes) {
                    idsToBeFetched.add(node.page._ref);
                }

                wip.push({page: p, ancestorNodes});
            }
            const ancestorsMap = new Map(
                (await fetchPagesByIds<TPage>(fetch, [...idsToBeFetched], additionalProperties, pagesCache)).map((p) => [p._id, p]),
            );

            const result: { [pageId: string]: string } = {};
            for (const e of wip) {
                if (e.page._id === homePage._id) {
                    result[e.page._id] = '/';
                } else {
                    const pathPages = e.ancestorNodes.map((n) => ancestorsMap.get(n.page._ref));
                    if (pathPages.some(p => !p))
                        result[e.page._id] = "#"; // at least one of the pages in the path was not fetched (not published?)
                    else
                        result[e.page._id] = getUrlFromSegments([...pathPages, e.page].map(p => p.slug));
                }
            }
            return result;
        },
    };
};