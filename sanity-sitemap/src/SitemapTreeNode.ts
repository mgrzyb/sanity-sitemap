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
    parent.data.push(data)
  } else {
    parent.data.children = parent.data.children || [];
    parent.data.children.push(data)
  }

  // TODO: return patch
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
    /*
        dropNode.data.children = dropNode.data.children ?? [];
        dropNode.data.children.unshift(dragNode.data);
    */

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
//      dropNode.parent.data.splice(insertAt, 0, dragNode.data)

      return [removeNodePatch, insert([dragNode.data], 'before', [insertAt])];

    } else {
      /*
            dropNode.parent.data.children = dropNode.parent.data.children ?? [];
            dropNode.parent.data.children.splice(insertAt, 0, dragNode.data)
      */

      return [
        removeNodePatch,
        setIfMissing([], [...getNodePath(dropNode.parent), 'children']),
        insert([dragNode.data], 'before', [...getNodePath(dropNode.parent), 'children', insertAt])
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

export function getTreeFromNodeData(nodes: SitemapNodeData[], titleFactory: (node: SitemapTreeNode) => ReactNode) : [SitemapTreeRoot, Set<string>] {
  const refs = new Set<string>();

  const root = {
    kind: 'root',
    key: 'root',
    data: nodes,
    children: undefined,
  } as unknown as SitemapTreeRoot;

  root.children = getTreeNodesFromNodeData(root, nodes, refs, titleFactory);

  return [root, refs];
}

function getTreeNodesFromNodeData(parent: SitemapTreeRoot | SitemapTreeNode, nodes: SitemapNodeData[], refs: Set<string>, titleFactory: (node: SitemapTreeNode) => ReactNode) {
  return nodes.filter(n => n.document).map((n) => getTreeNodeFromNodeData(parent, n, refs, titleFactory));
}

function getTreeNodeFromNodeData(
  parent: SitemapTreeRoot | SitemapTreeNode,
  node: SitemapNodeData,
  refs: Set<string>,
  titleFactory: (node: SitemapTreeNode) => ReactNode): SitemapTreeNode {

  refs.add(node.document._ref);

  const treeNode = {
    kind: 'node',
    key: node._key,
    data: node,
    parent: parent,
    children: undefined
  } as unknown as SitemapTreeNode;

  treeNode.title = titleFactory;
  treeNode.children = node.children && getTreeNodesFromNodeData(treeNode, node.children, refs, titleFactory) || [];

  return treeNode
}
