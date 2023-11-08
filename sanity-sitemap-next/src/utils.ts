import {SitemapNodeData} from "./SitemapNodeData.js";
import {SitemapPage} from "./SitemapPage.js";
import {Any, QueryParams} from "@sanity/client";

// TODO: Better name - technically this returns [...ancestors, page]
export async function fetchAncestors(
    fetch: FetchFunction,
    sitemapRoot: SitemapNodeData,
    pageId: string,
    pagesCache: Map<string, SitemapPage>,
) {
    const ancestorNodes = getAncestorNodes(sitemapRoot, pageId);
    if (!ancestorNodes) return undefined;

    const pages = await fetchPagesByIds(
        fetch,
        ancestorNodes.map((n) => n.page._ref),
        pagesCache,
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

    let nodes = sitemapRoot.children.type === "nodes" ? sitemapRoot.children.nodes : [];
    for (const segment of segments) {
        const pageCandidates = pages.filter((p) => p.slug.toLowerCase() === segment.toLowerCase());
        if (!pageCandidates.length) break;

        let matched = false;
        for (const page of pageCandidates) {
            const node = nodes.find((n) => n.page._ref === page._id);
            if (!node) continue;

            matched = true;
            matchedPath.push(page);
            remainingSegments.splice(0, 1);
            nodes = node.children.type === "nodes" ? node.children.nodes : [];
            break;
        }
        
        if (!matched)
            break;
    }

    return {
        matchedPath: matchedPath,
        unmatchedSegments: remainingSegments,
    };
}

export function getAncestorNodes(sitemapRoot: SitemapNodeData, pageId: string) {
    function findNode(
        nodes: SitemapNodeData[],
        predicate: (node: SitemapNodeData) => boolean,
        path: SitemapNodeData[] = [],
    ): SitemapNodeData[] | undefined {
        for (const n of nodes) {
            if (predicate(n)) return [...path, n];
            const r = n.children.type === "nodes" && findNode(n.children.nodes, predicate, [...path, n]);
            if (r) return r;
        }
        return undefined;
    }

    if (sitemapRoot.page._ref === pageId) return [];

    const path = findNode(sitemapRoot.children.type === "nodes" ? sitemapRoot.children.nodes : [], (n) => n.page._ref === pageId);

    return path ? [sitemapRoot, ...path] : undefined;
}

type FetchFunction = <R = Any, Q = QueryParams>(query: string, params?: Q) => Promise<R>;

export async function fetchPagesByIds(
    fetch: FetchFunction,
    ids: string[],
    cache: Map<string, SitemapPage>,
) {
    const idsToFetch = ids.filter((id) => cache.has(id) === false);
    if (idsToFetch.length) {
        const pages: SitemapPage[] = await fetch('*[_id in $ids]{ _id, "slug": slug.current, title }', {
            ids: idsToFetch,
        });
        for (const page of pages) {
            cache.set(page._id, page);
        }
    }
    return ids.map((id) => cache.get(id)!);
}

export async function fetchPagesBySlugs(
    fetch: FetchFunction,
    pageTypes: string[],
    slugs: string[],
) {
    const pages: SitemapPage[] = await fetch(
        '*[_type in $pageTypes && slug.current in $slugs]{ _id, "slug": slug.current, title }',
        {pageTypes: pageTypes, slugs: slugs},
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