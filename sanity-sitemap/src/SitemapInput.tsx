import {ArrayOfObjectsInputProps, ArraySchemaType, SchemaType, useSchema} from "sanity";
import React, {useMemo, useState} from "react";
import {useRouter} from "sanity/router";
import {SelectPageDialog} from "./SelectPageDialog";
import {
  addChildPageNode,
  moveNode,
  removeNode,
  setChildrenCollectionType,
  SitemapTreePageNode
} from "./SitemapTreeNode";
import {SitemapNodeData} from "./SitemapNodeData";
import "rc-tree/assets/index.css"
import {SelectCollectionTypeDialog} from "./SelectCollectionTypeDialog";
import {SitemapTree, useSitemapTree} from "./SitemapTree";
import {useDialog, useDialogWithArg} from "./hooks";

type Props = ArrayOfObjectsInputProps<SitemapNodeData, ArraySchemaType & {
  options?: { pageTypes: string[] }
}>;

export const SitemapInput = ({ value, onChange, schemaType }: Props) => {

  const [addHomePageDialog, showAddHomePageDialog] = useDialog();
  const [addChildNodeDialog, showAddChildNodeDialog] = useDialogWithArg<SitemapTreePageNode>();
  const [addChildrenCollectionDialog, showAddChildrenCollectionDialog] = useDialogWithArg<SitemapTreePageNode>();

  const schema = useSchema();
  const pageTypes = schemaType.options?.pageTypes ?? ['page'];
  const collectionTypes = useMemo(() => schema.getTypeNames().filter(t => isValidCollectionSchemaType(schema.get(t))), [])

  const router = useRouter();

  const [tree, nodes] = useSitemapTree(value, {
    onAddChildNode: (node: SitemapTreePageNode) => {
      showAddChildNodeDialog(node);
    },
    onRemoveNode: (node: SitemapTreePageNode) => {
      onChange(removeNode(node));
    },
    onAddChildrenCollection: (node: SitemapTreePageNode) => {
      if (node.data.children?.type === "nodes" && node.data.children.nodes?.length) {
        if (!confirm("Remove existing children?"))
          return;
      }
      showAddChildrenCollectionDialog(node);
    }
  });

  return (
    <>
      <SitemapTree
        nodes={nodes}
        onAddRoot={showAddHomePageDialog}
        onDoubleClick={node => {
          if (node.kind === 'page') {
            const url = router.resolvePathFromState(router.state);
            const data = node.data;
            router.navigateUrl({path: url + ';' + data?.page._ref})
          }
        }}
        onDrop={(dragNode, dropNode, dropPosition, dropToGap) => {
          onChange(moveNode(dragNode, dropNode, dropPosition, dropToGap));
        }}/>

      {addHomePageDialog &&
        <SelectPageDialog
          pageTypes={pageTypes}
          onSelect={page => {
            onChange(addChildPageNode(tree, page));
          }}
          onClose={addHomePageDialog.hide}
        />}

      {addChildNodeDialog &&
        <SelectPageDialog
          pageTypes={pageTypes}
          onSelect={doc => {
            onChange(addChildPageNode(addChildNodeDialog.arg, doc));
          }}
          onClose={addChildNodeDialog.hide}
        />}

      {addChildrenCollectionDialog &&
        <SelectCollectionTypeDialog
          availableTypes={collectionTypes}
          onSelect={type => {
            onChange(setChildrenCollectionType(addChildrenCollectionDialog.arg, type));
          }}
          onClose={addChildrenCollectionDialog.hide}
        />
      }
    </>)
}

function isValidCollectionSchemaType(type : SchemaType | undefined) {
  if (!type) return undefined;
  if (type.name === "sitemap") return false;
  if (type.type?.name !== "document") return false;
  return true;
}
