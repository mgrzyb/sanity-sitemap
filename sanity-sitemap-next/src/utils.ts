import {SitemapNodeData} from "./SitemapNodeData.js";
import {Page} from "./Page.js";
import {Any, QueryParams} from "@sanity/client";

// TODO: Better name - technically this returns [...ancestors, page]
export async function fetchAncestors(fetch: FetchFunction, sitemapRoot: SitemapNodeData, pageId : string) {
    const ancestorNodes = getAncestorNodes(sitemapRoot, pageId)
    if (!ancestorNodes)
        return undefined;

    const pages = await fetchPagesByIds(fetch, ancestorNodes.map(n => n.document._ref));
    return ancestorNodes.map(n => pages.find(p => p._id === n.document._ref)!)
}

export function matchSitemapSegments(sitemapRoot: SitemapNodeData, homePage : Page, segments: readonly string[], pages: readonly Page[]) {
    const matchedPath : Page[] = [homePage];
    const remainingSegments = [...segments];

    let nodes = sitemapRoot.children ?? [];
    for (const segment of segments) {
        const page = pages.find(p => p.slug.toLowerCase() === segment.toLowerCase());
        if (!page)
            break;

        const node = nodes.find(n => n.document._ref === page._id);
        if (!node)
            break;

        matchedPath.push(page)
        remainingSegments.splice(0, 1);
        nodes = node.children ?? [];
    }

    return {
        matchedPath: matchedPath,
        unmatchedSegments: remainingSegments
    }
}

export function getAncestorNodes(sitemapRoot: SitemapNodeData, pageId: string) {

    function findNode(nodes: SitemapNodeData[], predicate: (node: SitemapNodeData) => boolean, path: SitemapNodeData[] = []) : SitemapNodeData[] | undefined {
        for (const n of nodes) {
            if (predicate(n))
                return [...path, n];
            const r = n.children && findNode(n.children, predicate, [...path, n]);
            if (r)
                return r;
        }
        return undefined;
    }

    if (sitemapRoot.document._ref === pageId)
        return [];
    
    const path = findNode(sitemapRoot.children ?? [], n => n.document._ref === pageId)

    return path ? [sitemapRoot, ...path] : undefined;
}

type FetchFunction = <R = Any, Q = QueryParams>(
    query: string,
    params?: Q
) => Promise<R>

export async function fetchPagesByIds(fetch: FetchFunction, ids: string[]) {
    const pages : Page[] = await fetch(
        '*[_id in $ids]{ _id, "slug": slug.current, title }',
        { ids: ids });
    
    return pages;
}

export async function fetchPagesBySlugs(fetch: FetchFunction, pageTypes: string[], slugs: string[]) {
    const pages : Page[] = await fetch(
        '*[_type in $pageTypes && slug.current in $slugs]{ _id, "slug": slug.current, title }',
        {pageTypes: pageTypes, slugs: slugs});
    
    return pages;
}

export function getUrlFromSegments(segments: string[]) {
    return '/'+segments.map(s => encodeURIComponent(s)).join('/');
}

export async function fetchSitemapRootNode(fetch: FetchFunction) {
    const [document] = await fetch('*[_type=="sitemap"] { roots }');
    return document.roots[0] as SitemapNodeData;
}