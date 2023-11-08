import {BasicDataNode} from "rc-tree";
import React, {ReactNode} from "react";
import {insert, set, setIfMissing, unset} from "sanity";
import {SitemapNodeData} from "./SitemapNodeData";
import {nanoid} from "nanoid/non-secure";
import {SitemapPage} from "./SitemapPage";

export type SitemapTreeRoot = BasicDataNode & {
  kind: 'root',
  key: 'root',
  data: SitemapNodeData[],
  children: SitemapTreeNode[]
}

export type SitemapTreeNode = SitemapTreePageNode | SitemapTreeCollectionNode;

export type SitemapTreePageNode = BasicDataNode & {
  kind: 'page',
  key: string | number
  title?: React.ReactNode | ((data: SitemapTreeNode) => React.ReactNode)
  page: SitemapPage | undefined,
  data: SitemapNodeData,
  parent: SitemapTreeRoot | SitemapTreePageNode,
  children: (SitemapTreeNode | SitemapTreeCollectionNode)[]
}

export type SitemapTreeCollectionNode = BasicDataNode & {
  kind: 'collection'
  key: string | number
  title?: React.ReactNode | ((data: SitemapTreeNode) => React.ReactNode)
  collectionType: string
  parent: SitemapTreePageNode
}

export function getPageNodeByKey(rootOrNodes : SitemapTreeRoot | SitemapTreeNode[], key: string | number) {
  const n = getNodeByKey(rootOrNodes, key);
  if (n?.kind !== 'page')
    return undefined;
  return n;
}

export function getNodeByKey(rootOrNodes: SitemapTreeRoot | SitemapTreeNode[], key: string | number) {
  if (Array.isArray(rootOrNodes))
    return findNodeRecursively(rootOrNodes, key);
  return findNodeRecursively(rootOrNodes.children, key);
}

function findNodeRecursively(nodes: SitemapTreeNode[], key: string | number): SitemapTreeNode | undefined {
  for (const n of nodes) {
    if (n.key === key)
      return n;

    if (n.kind === "page" && n.children) {
      const m = findNodeRecursively(n.children, key)
      if (m)
        return m;
    }
  }
  return undefined;
}

function getAncestors(node: SitemapTreeNode): SitemapTreePageNode[] {
  if (node.parent.kind === 'root')
    return [];
  return [...getAncestors(node.parent), node.parent]
}

function getNodePath(node: SitemapTreePageNode) {
  const ancestors = getAncestors(node);
  return [...ancestors.flatMap(n => [{_key: n.data._key}, 'children', 'nodes']), {_key: node.data._key}]
}

export function addChildPageNode(parent: SitemapTreePageNode | SitemapTreeRoot, page: SitemapPage) {
  const data: SitemapNodeData = {
    _key: nanoid(10).toString(),
    page: {
      _ref: page.id,
      _type: 'reference'
    }
  };

  if (parent.kind === 'root') {
    return [
      setIfMissing([], []),
      insert([data], 'after', [-1])
    ];
  } else {
    return [
      setIfMissing({ }, [...getNodePath(parent), 'children']),
      set('nodes', [...getNodePath(parent), 'children', 'type']),
      setIfMissing([], [...getNodePath(parent), 'children', 'nodes']),
      insert([data], 'after', [...getNodePath(parent), 'children', 'nodes', -1])
    ];
  }
}

export function removeNode(node: SitemapTreePageNode) {
  if (node.parent.kind === 'root') {
    return unset([{_key: node.data._key}]);
  } else {
    return unset(getNodePath(node));
  }
}

export function moveNode(dragNode: SitemapTreePageNode, dropNode: SitemapTreePageNode, dropPosition: number, dropToGap: boolean) {

  // Remove from parent
  const removeNodePatch = removeNode(dragNode);

  // Add under new Parent
  if (!dropToGap) {
    return [
      removeNodePatch,
      setIfMissing({ type: 'nodes', nodes: []}, [...getNodePath(dropNode), 'children']),
      setIfMissing([], [...getNodePath(dropNode), 'children', 'nodes']),
      insert([dragNode.data], 'before', [...getNodePath(dropNode), 'children', 'nodes', 0])
    ];
  } else {
    const i = dropNode.parent.children.indexOf(dropNode)!;
    const insertAt = dropPosition < 0 ? i : i + 1

    if (dropNode.parent.kind === 'root') {
      if (insertAt === 0)
        return [removeNodePatch, insert([dragNode.data], 'before', [0])];
      else
        return [removeNodePatch, insert([dragNode.data], 'after', [insertAt-1])];

    } else {
      if (insertAt === 0)
        return [
          removeNodePatch,
          setIfMissing({ type: 'nodes', nodes: [] }, [...getNodePath(dropNode.parent), 'children']),
          setIfMissing([], [...getNodePath(dropNode.parent), 'children', 'nodes']),
          insert([dragNode.data], 'before', [...getNodePath(dropNode.parent), 'children', 'nodes', 0])
        ];
      else
        return [
          removeNodePatch,
          setIfMissing({ type: 'nodes', nodes: [] }, [...getNodePath(dropNode.parent), 'children']),
          setIfMissing([], [...getNodePath(dropNode.parent), 'children', 'nodes']),
          insert([dragNode.data], 'after', [...getNodePath(dropNode.parent), 'children', 'nodes', insertAt-1])
        ];
    }
  }
}

export function setChildrenCollectionType(node: SitemapTreePageNode, type: string) {
  return set({ type: 'collection', collection: type }, [...getNodePath(node), 'children'])
}

export function updateTree(tree: SitemapTreeRoot, loadedPages: Map<string, SitemapPage>) {
  updateTreeNodes(tree.children, loadedPages)
}

function updateNode(node: SitemapTreePageNode, loadedPages: Map<string, SitemapPage>) {
  if (node.data.page) {
    node.page = loadedPages.get(node.data.page._ref);
    node.children && updateTreeNodes(node.children, loadedPages);
  }
}

function updateTreeNodes(nodes: SitemapTreeNode[], loadedPages: Map<string, SitemapPage>) {
  for (const node of nodes) {
    if (node.kind !== "collection")
      updateNode(node, loadedPages)
  }
}

export function getTreeFromNodeData(nodes: SitemapNodeData[], titleFactory: (root: SitemapTreeRoot, nodeKey: string | number) => ReactNode, pages : Map<string, SitemapPage>) : [SitemapTreeRoot, Set<string>] {
  const pendingRefs = new Set<string>();

  const root = {
    kind: 'root',
    key: 'root',
    data: nodes,
    children: undefined,
  } as unknown as SitemapTreeRoot;

  root.children = getTreeNodesFromNodeData(root, nodes, node => titleFactory(root, node.key), pendingRefs, pages);

  return [root, pendingRefs];
}

function getTreeNodesFromNodeData(parent: SitemapTreeRoot | SitemapTreePageNode, nodes: SitemapNodeData[], titleFactory: (node: SitemapTreeNode) => React.ReactNode, pendingRefs: Set<string>, pages : Map<string, SitemapPage>) {
  return nodes.filter(n => n.page).map((n) => getTreeNodeFromNodeData(parent, n, titleFactory, pendingRefs, pages));
}

function getTreeNodeFromNodeData(
  parent: SitemapTreeRoot | SitemapTreeNode,
  nodeData: SitemapNodeData,
  titleFactory: (node: SitemapTreeNode) => ReactNode,
  pendingRefs: Set<string>,
  pages : Map<string, SitemapPage>): SitemapTreeNode {

  const page = nodeData.page && pages.get(nodeData.page._ref);
  if (!page)
    pendingRefs.add(nodeData.page._ref);

  const treeNode = {
    kind: 'page',
    key: nodeData._key,
    data: nodeData,
    parent: parent,
    children: undefined,
    page: page
  } as unknown as SitemapTreePageNode;

  treeNode.title = titleFactory;
  if (nodeData.children?.type === "collection") {
    treeNode.children = [
      {
        key: nanoid(10).toString(),
        kind: 'collection',
        collectionType: nodeData.children.collection,
        parent: treeNode,
        title: `Collection: ${nodeData.children.collection}`
      }
    ];
  } else {
    treeNode.children = nodeData.children && getTreeNodesFromNodeData(treeNode, nodeData.children.type === "nodes" ? nodeData.children.nodes ?? [] : [], titleFactory, pendingRefs, pages) || [];
  }
  return treeNode
}
