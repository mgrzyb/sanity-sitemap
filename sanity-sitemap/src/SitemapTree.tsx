import {
  getNodeByKey,
  getPageNodeByKey,
  getTreeFromNodeData,
  SitemapTreeNode,
  SitemapTreePageNode,
  SitemapTreeRoot, updateTree
} from "./SitemapTreeNode";
import Tree from "rc-tree";
import {Button, Menu, MenuButton, MenuItem} from "@sanity/ui";
import React, {useEffect, useRef, useState} from "react";
import {SitemapNodeData} from "./SitemapNodeData";
import {SanityClient, useClient} from "sanity";
import {SitemapPage} from "./SitemapPage";

type Props = {
  nodes: SitemapTreeNode[],
  onAddRoot: () => void,
  onDoubleClick: (node: SitemapTreeNode) => void,
  onDrop: (dragNode: SitemapTreePageNode, dropNode: SitemapTreePageNode, dropPosition: number, dropToGap: boolean) => void,

};

interface SitemapTreeNodeCallbacks {
  onAddChildNode?: (node: SitemapTreePageNode) => void,
  onRemoveNode?: (treeNode: SitemapTreePageNode) => void,
  onAddChildrenCollection?: (treeNode: SitemapTreePageNode) => void;
}

export const SitemapTree = ({nodes, onAddRoot, onDoubleClick, onDrop}: Props) => {

  return (<>
    {nodes.length > 0 &&
      <Tree
        treeData={nodes}
        defaultExpandAll={true}
        selectable={false}
        onDoubleClick={(e, n) => onDoubleClick(getPageNodeByKey(nodes, n.key)!)}
        draggable={n => getPageNodeByKey(nodes, n.key)?.kind === "page"}
        onDrop={(info) => onDrop(getPageNodeByKey(nodes, info.dragNode.key)!, getPageNodeByKey(nodes, info.node.key)!, info.dropPosition, info.dropToGap )}
      />}

    {nodes.length === 0 &&
      <Button onClick={onAddRoot}>Add home page</Button>
    }
  </>);
}

export function useSitemapTree(value: SitemapNodeData[] | undefined, callbacks: SitemapTreeNodeCallbacks) : [SitemapTreeRoot, SitemapTreeNode[]] {
  const client = useClient({apiVersion: "2021-06-07"});
  const loadedPages = useRef(new Map<string, SitemapPage>());
  const [state, setState] = useState<{ tree: SitemapTreeRoot, nodes: SitemapTreeNode[], pendingRefs: Set<string> }>({
    tree: {
      key: "root",
      kind: "root",
      data: [],
      children: []
    },
    nodes: [],
    pendingRefs: new Set<string>()
  });

  const titleFactory = (root: SitemapTreeRoot, nodeKey: string | number) => {
    const n = getNodeByKey(root, nodeKey)!
    if (n.kind === "page")
      return <span>{n.page?.title ?? '???'} {createMenuButton(n, callbacks)}</span>
    else
      return <span>Collection: {n.collectionType}</span>
  }

  useEffect(() => {
    const [tree, pendingRefs] = getTreeFromNodeData(value ?? [], titleFactory, loadedPages.current);
    setState({
      tree: tree,
      nodes: [...tree.children],
      pendingRefs: pendingRefs
    })
  }, [value]);

  useEffect(() => {
    if (state.pendingRefs.size === 0)
      return;
    const refsToLoad = [...state.pendingRefs].filter(r => !loadedPages.current.has(r));
    if (refsToLoad.length === 0)
      return;

    loadPages(refsToLoad, client)
      .then(pages => {
        for (const d of pages) {
          loadedPages.current.set(d[0], d[1])
        }

        updateTree(state.tree, loadedPages.current);
        setState({...state, nodes: [...state.tree.children]});
      })
  }, [state]);

  return [state.tree, state.nodes];
}

function createMenuButton(treeNode: SitemapTreePageNode, callbacks?: SitemapTreeNodeCallbacks) {
  const menu = (
    <Menu padding={3}>
      <MenuItem onClick={() => callbacks?.onRemoveNode?.(treeNode)}>Remove</MenuItem>
      <MenuItem onClick={() => callbacks?.onAddChildNode?.(treeNode)}>Add child</MenuItem>
      <MenuItem onClick={() => callbacks?.onAddChildrenCollection?.(treeNode)}>Add children collection</MenuItem>
    </Menu>);

  return <MenuButton
    id={`menu-${treeNode.key}`}
    button={<span>...</span>}
    menu={menu}/>;
}

async function loadPages(refs: Iterable<string>, client: SanityClient) {
  const pages = await client.fetch(`*[_id in $refs]{ _id, _type, title, "slug": slug.current }`, {
    refs: [...refs],
  })

  const m = new Map<string, SitemapPage>()
  for (const d of pages) {
    m.set(d._id, {id: d._id, type: d._type, slug: d.slug, title: d.title})
  }

  return m
}
