import {
  ArrayOfObjectsInputProps,
  ArraySchemaType,
  ArraySchemaTypeOf,
  FormPatch,
  PatchEvent,
  SanityClient,
  set,
  useClient
} from "sanity";
import Tree from "rc-tree";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {EventDataNode} from "rc-tree/es/interface";
import {Button, Menu, MenuButton, MenuItem} from "@sanity/ui";
import {useRouter} from "sanity/router";
import {NodeDragEventParams} from "rc-tree/es/contextTypes";
import {SelectPageDialog} from "./SelectPageDialog";
import {
  addNode, getNodeByKey,
  getTreeFromNodeData,
  moveNode,
  removeNode,
  SitemapTreeRoot,
  SitemapTreeNode,
  updateTree
} from "./SitemapTreeNode";
import {SitemapNodeData} from "./SitemapNodeData";
import {SitemapPage} from "./SitemapPage";
import "rc-tree/assets/index.css"

interface SitemapTreeNodeCallbacks {
  onAddChildNode?: (node: SitemapTreeNode) => void,
  onRemoveNode?: (treeNode: SitemapTreeNode) => void
}

export const SitemapInput = ({value, onChange, schemaType}: ArrayOfObjectsInputProps<SitemapNodeData, ArraySchemaType & { options?: { pageTypes: string[] }}>) => {
  const client = useClient({apiVersion: "2021-06-07"});
  const router = useRouter();
  const loadedPages = useRef(new Map<string, SitemapPage>());

  const [addingChildNode, setAddingChildNode] = useState<SitemapTreeNode | undefined>(undefined);
  const [addingHomePage, setAddingHomePage] = useState(false);
  const [replacingNodePage, setReplacingNodePage] = useState<SitemapTreeNode | undefined>(undefined);

  const contextMenuCallbacks = {
    onAddChildNode(node: SitemapTreeNode) {
      setAddingChildNode(getNodeByKey(state.tree, node.key));
    },
    onRemoveNode(node : SitemapTreeNode) {
      const patch = removeNode(getNodeByKey(state.tree, node.key)!)

      setState({...state, nodes: [...state.tree.children] });
      onChange(patch);
    }
  };

  const [state, setState] = useState<{ tree: SitemapTreeRoot, nodes: SitemapTreeNode[], refs: Set<string> }>(() => {

    const [tree, refs] = getTreeFromNodeData(value ?? [], getNodeTitleFactory(contextMenuCallbacks));

    return {
      tree: tree,
      nodes: tree.children,
      refs: refs
    }
  });

  useEffect(() => {
    if (state.refs.size === 0)
      return;
    const refs = [...state.refs].filter(r => !loadedPages.current.has(r));
    if (refs.length === 0)
      return;

    loadPages(refs, client)
      .then(pages => {
        for (const d of pages) {
          loadedPages.current.set(d[0], d[1])
        }

        updateTree(state.tree, loadedPages.current);
        setState({...state, nodes: [...state.tree.children]});
      })
  }, [state]);

  const onDrop = useCallback(function onDrop(info : NodeDragEventParams<SitemapTreeNode> & { dragNode: EventDataNode<SitemapTreeNode>, dropPosition: number, dropToGap: boolean }) {
    const dropNode = getNodeByKey(state.tree, info.node.key)!;
    const dragNode = getNodeByKey(state.tree, info.dragNode.key)!;

    const patch = moveNode(dragNode, dropNode, info);

    setState({
      ...state,
      nodes: [...state.tree.children],
    });

    onChange(patch);
  }, [state])

  const pageTypes = schemaType.options?.pageTypes ?? ['page'];

  return (
    <>
      { state.nodes.length > 0 &&
        <Tree
          treeData={state.nodes}
          defaultExpandAll={true}
          selectable={false}
          onDoubleClick={(e, node) => {
            const url = router.resolvePathFromState(router.state);
            router.navigateUrl({ path: url + ';' + getNodeByKey(state.tree, node.key)?.data?.document?._ref })
          }}
          draggable={true}
          onDrop={onDrop}
        />}

      { state.nodes.length === 0 &&
        <Button onClick={() => setAddingHomePage(true)}>Add home page</Button>
      }

      { addingHomePage &&
        <SelectPageDialog
          pageTypes={pageTypes}
          onSelect={doc => {
            addNode(state.tree, doc, getNodeTitleFactory(contextMenuCallbacks));
            setState({
              ...state,
              nodes: [...state.tree.children],
            });
            onChange(set(state.tree.data));
          }}
          onClose={() => setAddingHomePage(false)}
        />}

      { addingChildNode &&
        <SelectPageDialog
          pageTypes={pageTypes}
          onSelect={doc => {
            addNode(addingChildNode, doc, getNodeTitleFactory(contextMenuCallbacks));
            setState({
              ...state,
              nodes: [...state.tree.children],
            });
            onChange(set(state.tree.data));
          }}
          onClose={() => setAddingChildNode(undefined)}
        />}
    </>
  )

}

function getNodeTitleFactory(callbacks: SitemapTreeNodeCallbacks) {
  return function (node : SitemapTreeNode) {
    return <span>{node.page?.title ?? '???'} {createMenuButton(node, callbacks)}</span>
  }
}

function createMenuButton(treeNode: SitemapTreeNode, callbacks?: {
  onAddChildNode?: ((node: SitemapTreeNode) => void) | undefined;
  onRemoveNode?: ((treeNode: SitemapTreeNode) => void) | undefined
}) {
  const menu = (
    <Menu padding={3}>
      <MenuItem onClick={() => callbacks?.onRemoveNode?.(treeNode)}>Remove</MenuItem>
      <MenuItem onClick={() => callbacks?.onAddChildNode?.(treeNode)}>Add child</MenuItem>
    </Menu>);

  return <MenuButton
    id={`menu-${treeNode.key}`}
    button={<span>...</span>}
    menu={menu}/>;
}

async function loadPages(refs: Iterable<string>, client: SanityClient) {
  const pages = await client.fetch("*[_id in $refs]{ _id, title }", {
    refs: [...refs],
  })

  const m = new Map<string, SitemapPage>()
  for (const d of pages) {
    m.set(d._id, {id: d._id, title: d.title})
  }

  return m
}

