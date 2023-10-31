import {BasicDataNode} from "rc-tree";
import React, {ReactNode} from "react";
import {insert, setIfMissing, unset} from "sanity";
import {SitemapNodeData} from "./SitemapNodeData";
import {nanoid} from "nanoid/non-secure";
import {SitemapPage} from "./SitemapPage";

export type SitemapTreeRoot = BasicDataNode & {
  kind: 'root',
  key: 'root',
  data: SitemapNodeData[],
  children: SitemapTreeNode[]
}

export type SitemapTreeNode = BasicDataNode & {
  kind: 'node',
  key: string | number
  title?: React.ReactNode | ((data: SitemapTreeNode) => React.ReactNode)
  page: SitemapPage | undefined,
  data: SitemapNodeData,
  parent: SitemapTreeRoot | SitemapTreeNode,
  children: SitemapTreeNode[]
}

export function getNodeByKey(root: SitemapTreeRoot, key: string | number) {
  return findNodeRecursively(root.children, key);
}

function findNodeRecursively(nodes: SitemapTreeNode[], key: string | number): SitemapTreeNode | undefined {
  for (const n of nodes) {
    if (n.key === key)
      return n;

    if (n.children) {
      const m = findNodeRecursively(n.children, key)
      if (m)
        return m;
    }
  }
  return undefined;
}

function getAncestors(node: SitemapTreeNode): SitemapTreeNode[] {
  if (node.parent.kind === 'root')
    return [];
  return [...getAncestors(node.parent), node.parent]
}

function getNodePath(node: SitemapTreeNode) {
  const ancestors = getAncestors(node);
  return [...ancestors.flatMap(n => [{_key: n.data._key}, 'children']), {_key: node.data._key}]
}

export function addNode(parent: SitemapTreeNode | SitemapTreeRoot, page: SitemapPage, titleFactory: (node: SitemapTreeNode) => ReactNode) {
  const data: SitemapNodeData = {
    _key: nanoid(10).toString(),
    document: {
      _ref: page.id,
      _type: 'reference'
    },
    children: undefined
  };

  const childNode: SitemapTreeNode = {
    kind: 'node',
    key: data._key,
    data: data,
    page: page,
    parent: parent,
    children: []
  };

  childNode.title = titleFactory;

  parent.children.push(childNode)
  if (parent.kind === 'root') {
//    parent.data.push(data)
    return [
      setIfMissing([], ['children']),
      insert([data], 'after', ['children', -1])
    ];
  } else {
//    parent.data.children = parent.data.children || [];
//    parent.data.children.push(data)

    return [
      setIfMissing([], [...getNodePath(parent), 'children']),
      insert([data], 'after', [...getNodePath(parent), 'children', -1])
    ];
  }
}

export function removeNode(node: SitemapTreeNode) {
  node.parent.children = node.parent.children.filter(n => n.key !== node.key);
  if (node.parent.kind === 'root') {
//    node.parent.data = node.parent.data.filter(n => n._key !== node.data._key);
    return unset([{_key: node.data._key}]);
  } else {
//    node.parent.data.children = node.parent.data.children?.filter(n => n._key !== node.data._key);
    return unset(getNodePath(node));
  }
}

export function moveNode(dragNode: SitemapTreeNode, dropNode: SitemapTreeNode, info: {
  dropToGap: boolean;
  dropPosition: number
}) {

  // Remove from parent
  const removeNodePatch = removeNode(dragNode);

  // Add under new Parent
  if (!info.dropToGap) {
    dragNode.parent = dropNode
    dropNode.children.unshift(dragNode)
//    dropNode.data.children = dropNode.data.children ?? [];
//    dropNode.data.children.unshift(dragNode.data);

    return [
      removeNodePatch,
      setIfMissing([], [...getNodePath(dropNode), 'children']),
      insert([dragNode.data], 'before', [...getNodePath(dropNode), 'children', 0])
    ];
  } else {
    dragNode.parent = dropNode.parent

    const i = dropNode.parent.children.indexOf(dropNode)!;
    const insertAt = info.dropPosition < 0 ? i : i + 1

    dropNode.parent.children.splice(insertAt, 0, dragNode)
    if (dropNode.parent.kind === 'root') {
      if (insertAt === 0)
        return [removeNodePatch, insert([dragNode.data], 'before', [0])];
      else
        return [removeNodePatch, insert([dragNode.data], 'after', [insertAt-1])];

    } else {
      if (insertAt === 0)
        return [
          removeNodePatch,
          setIfMissing([], [...getNodePath(dropNode.parent), 'children']),
          insert([dragNode.data], 'before', [...getNodePath(dropNode.parent), 'children', 0])
        ];
      else
        return [
          removeNodePatch,
          setIfMissing([], [...getNodePath(dropNode.parent), 'children']),
          insert([dragNode.data], 'after', [...getNodePath(dropNode.parent), 'children', insertAt-1])
        ];
    }
  }
}

export function updateTree(tree: SitemapTreeRoot, loadedPages: Map<string, SitemapPage>) {
  updateTreeNodes(tree.children, loadedPages)
}

function updateNode(node: SitemapTreeNode, loadedPages: Map<string, SitemapPage>) {
  node.page = loadedPages.get(node.data.document._ref);
  node.children && updateTreeNodes(node.children, loadedPages);
}

function updateTreeNodes(nodes: SitemapTreeNode[], loadedPages: Map<string, SitemapPage>) {
  for (const node of nodes) {
    updateNode(node, loadedPages)
  }
}

export function getTreeFromNodeData(nodes: SitemapNodeData[], titleFactory: (node: SitemapTreeNode) => ReactNode, pages : Map<string, SitemapPage>) : [SitemapTreeRoot, Set<string>] {
  const pendingRefs = new Set<string>();

  const root = {
    kind: 'root',
    key: 'root',
    data: nodes,
    children: undefined,
  } as unknown as SitemapTreeRoot;

  root.children = getTreeNodesFromNodeData(root, nodes, titleFactory, pendingRefs, pages);

  return [root, pendingRefs];
}

function getTreeNodesFromNodeData(parent: SitemapTreeRoot | SitemapTreeNode, nodes: SitemapNodeData[], titleFactory: (node: SitemapTreeNode) => React.ReactNode, pendingRefs: Set<string>, pages : Map<string, SitemapPage>) {
  return nodes.filter(n => n.document).map((n) => getTreeNodeFromNodeData(parent, n, titleFactory, pendingRefs, pages));
}

function getTreeNodeFromNodeData(
  parent: SitemapTreeRoot | SitemapTreeNode,
  node: SitemapNodeData,
  titleFactory: (node: SitemapTreeNode) => ReactNode,
  pendingRefs: Set<string>,
  pages : Map<string, SitemapPage>): SitemapTreeNode {

  const page = pages.get(node.document._ref);
  if (!page)
    pendingRefs.add(node.document._ref);

  const treeNode = {
    kind: 'node',
    key: node._key,
    data: node,
    parent: parent,
    children: undefined,
    page: page
  } as unknown as SitemapTreeNode;

  treeNode.title = titleFactory;
  treeNode.children = node.children && getTreeNodesFromNodeData(treeNode, node.children, titleFactory, pendingRefs, pages) || [];

  return treeNode
}
