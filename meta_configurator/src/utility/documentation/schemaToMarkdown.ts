import {constructSchemaGraph} from "@/schema/graph-representation/schemaGraphConstructor";
import type {SchemaObjectNodeData} from "@/schema/graph-representation/schemaGraphTypes";

export function schemaToMarkdown(schemaData: any) {

    const graph = constructSchemaGraph(schemaData, true);

    graph.nodes.forEach(node => {
         if (node.getNodeType() === 'schemaobject') {
             const objectNode = node as SchemaObjectNodeData
             objectNode.attributes[0].
         }
        }

    )

    return JSON.stringify(schemaData, null, 2);
}