// import {SitemapInput} from "./SitemapInput";
// import React, {useCallback, useEffect, useState} from "react";
// import {
//   FormPatch,
//   KeyedSegment,
//   PatchEvent,
//   PatchOperations,
//   PathSegment,
//   toMutationPatches,
//   useClient,
//   useSchema
// } from "sanity";
// import {SitemapNodeData} from "./SitemapNodeData";

// interface SitemapData {
//   _id: string,
//   roots: SitemapNodeData[]
// }

// function toPathString(pathSegments : PathSegment[]) : string {
//   return pathSegments.reduce<string>((previousValue, currentValue) => {
//     switch(typeof currentValue) {
//       case "string":
//         return `${previousValue}.${currentValue}`;
//       case "number":
//         return `${previousValue}[${currentValue}]`;
//       case "object":
//         const keyedSegment = currentValue as KeyedSegment;
//         return `${previousValue}[_key=="${keyedSegment._key}"]`;
//       default:
//         throw Error("Unexpected path segment type")
//     }
//   }, "roots")
// }

// export const SitemapPane = React.forwardRef((props, ref) => {
//   console.log("Sitemap pane props: ", props)
//   const [document, setDocument] = useState<SitemapData | undefined>(undefined);
//   const client = useClient({apiVersion: '2021-09-01', })

//   useEffect(() => {
//     client.fetch(`*[_type=="sitemap"] { _id, roots }`, { }, { perspective: "raw"}).then(documents => setDocument(documents[0]));
//   }, []);

//   const onChange = useCallback((change : FormPatch | FormPatch[] | PatchEvent) => {
//     if (!document)
//       return;

//     const changes = Array.isArray(change) ? change as FormPatch[] : [change as FormPatch];

//     const transaction = client.transaction();

//     for (const p of changes) {
//       switch (p.type) {
//         case "unset":
//           transaction.patch(document._id, { unset: [toPathString(p.path)] })
//           break;
//         case "set":
//           transaction.patch(document._id, { set: { [toPathString(p.path)]: p.value } })
//           break;
//         case "setIfMissing":
//           transaction.patch(document._id, { setIfMissing: { [toPathString(p.path)]: p.value } })
//           break;
//         case "insert":
//           transaction.patch(document._id, { insert: { [p.position] : toPathString(p.path), items: p.items } } as any)
//           break;
//         default:
//           throw Error("Unsupported patch type"+p.type)
//       }
//     }

//     transaction.commit().then(result => console.log(result))
//   }, [document]);

//   const schema = useSchema();
//   const sitemapSchema = schema.get("sitemap");
//   console.log("SitemapSchema: ", sitemapSchema);

//   return (
//     <>
//     { document &&
//       <SitemapInput
//         // @ts-ignore
//         schemaType={sitemapSchema.fields.find(f => f.name==="roots").type}
//         value={document.roots}
//         onChange={onChange} /> }
//       { !document && <h1>Loading...</h1>}
//     </>
//   );

// });
