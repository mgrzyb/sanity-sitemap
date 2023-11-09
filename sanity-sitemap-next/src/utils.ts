import {SitemapNodeData} from "./SitemapNodeData.js";
import {SitemapPage} from "./SitemapPage.js";
import {Any, QueryParams} from "@sanity/client";

export async function fetchAncestors<TPage extends SitemapPage>(
    fetch: FetchFunction,
    sitemapRoot: SitemapNodeData,
    page: SitemapPage,
    additionalProperties: readonly (keyof TPage)[],
    pagesCache: Map<string, TPage>,
) {
    const ancestorNodes = getAncestorNodes(sitemapRoot, page._id, page._type);
    if (!ancestorNodes) return undefined;

    const pages = await fetchPagesByIds(
        fetch,
        ancestorNodes.map((n) => n.page._ref),
        additionalProperties,
        pagesCache
    );
    return ancestorNodes.map((n) => pages.find((p) => p._id === n.page._ref)!);
}

export function matchSitemapSegments(
    sitemapRoot: SitemapNodeData,
    homePage: SitemapPage,
    segments: readonly string[],
    pages: readonly SitemapPage[],
) {
    const matchedPath: SitemapPage[] = [homePage];
    const remainingSegments = [...segments];

    let parent = sitemapRoot;
    for (const segment of segments) {
        const pageCandidates = pages.filter((p) => p.slug.toLowerCase() === segment.toLowerCase());
        if (!pageCandidates.length) break;

        let matched = false;
        if (parent.children.type === "nodes") {
            for (const page of pageCandidates) {
                const node = parent.children.nodes.find((n) => n.page._ref === page._id);
                if (!node) continue;

                matched = true;
                matchedPath.push(page);
                remainingSegments.splice(0, 1);
                parent = node;
                break;
            }
        } else {
            for (const page of pageCandidates) {
                if (parent.children.collection === page._type) {
                    matchedPath.push(page);
                    remainingSegments.splice(0, 1);
                    break;                    
                }
            }
        }
        
        if (!matched)
            break;
    }

    return {
        matchedPath: matchedPath,
        unmatchedSegments: remainingSegments,
    };
}

export function getAncestorNodes(sitemapRoot: SitemapNodeData, pageId: string, pageType: string) {
    function findPathToPage(
        node: SitemapNodeData,
        pageId: string, pageType: string,
        pathSoFar: SitemapNodeData[] = [],
    ): SitemapNodeData[] | undefined {
        if (node.page._ref === pageId) return pathSoFar;
        if (node.children.type === "collection") {
            if (node.children.collection === pageType) return [...pathSoFar, node];
        } else {
            for (const n of node.children.nodes) {
                const r = findPathToPage(n, pageId, pageType, [...pathSoFar, node]);
                if (r) return r;
            }
        }
        return undefined;
    }

    if (sitemapRoot.page._ref === pageId) return [];

    const path = findPathToPage(sitemapRoot, pageId, pageType, []);

    return path ? [sitemapRoot, ...path] : undefined;
}

type FetchFunction = <R = Any, Q = QueryParams>(query: string, params?: Q) => Promise<R>;

export async function fetchPageById<TPage extends SitemapPage>(fetch: FetchFunction, id: string, additionalProperties: readonly (keyof TPage)[], cache: Map<string, TPage>){
    const pages = await fetchPagesByIds(fetch, [id], additionalProperties, cache);
    if (pages.length)
        return pages[0];
    return undefined;
}

export async function fetchPagesByIds<TPage extends SitemapPage>(
    fetch: FetchFunction,
    ids: readonly string[],
    additionalProperties: readonly (keyof TPage)[],
    cache: Map<string, TPage>,
) {
    const idsToFetch = new Set(ids.filter((id) => cache.has(id) === false));
    if (idsToFetch.size) {
        const properties = [
            `_id`,
            `_type`,
            `"slug": slug.current`,
            `title`,
            ...additionalProperties
        ]
        const pages: TPage[] = await fetch(`*[_id in $ids]{ ${properties.join(", ")} }`, {
            ids: [...idsToFetch],
        });
        for (const page of pages) {
            cache.set(page._id, page);
        }
    }
    return ids.map((id) => cache.get(id)!);
}

export async function fetchPagesBySlugs<TPage extends SitemapPage>(
    fetch: FetchFunction,
    slugs: readonly string[],
    additionalProperties: readonly (keyof TPage)[]
) {
    const properties = [
        `_id`,
        `_type`,
        `"slug": slug.current`,
        `title`,
        ...additionalProperties
    ]

    const pages: SitemapPage[] = await fetch(
        `*[slug.current in $slugs]{ ${properties.join(", ")} }`,
        {slugs: slugs},
    );

    return pages;
}

export function getUrlFromSegments(segments: string[]) {
    return '/' + segments.map((s) => encodeURIComponent(s)).join('/');
}

export async function fetchSitemapRootNode(fetch: FetchFunction) {
    const [document] = await fetch('*[_type=="sitemap"] { roots }');
    return document.roots[0] as SitemapNodeData;
}