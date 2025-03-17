import {dataAt} from "@/utility/resolveDataAtPath";
import {pathToJsonPointer} from "@/utility/pathUtils";
import type {Path} from "@/utility/path";
import {findAvailableSchemaId, isSubSchemaDefinedInDefinitions} from "@/schema/schemaReadingUtils";
import type {ManagedData} from "@/data/managedData";
import {constructSchemaGraph} from "@/schema/graph-representation/schemaGraphConstructor";
import type {SchemaNodeData} from "@/schema/graph-representation/schemaGraphTypes";
import type {ManagedJsonSchema} from "@/data/managedJsonSchema";



export function extractAllInlinedSchemaElements(schemaData: ManagedData, schema: ManagedJsonSchema, extractRootElement: boolean, extractEnums: boolean): number {
    const graph = constructSchemaGraph(schema.schemaPreprocessed.value)
    // filter by nodes which are inlined and an object node
    const nodedFiltered = graph.nodes.filter(
        node => !isSubSchemaDefinedInDefinitions(node.absolutePath) && (extractRootElement || node.absolutePath.length > 1) && (extractEnums && node.getNodeType() == "schemaenum" || node.getNodeType() == "schemaobject")
    );

    // sort nodes by path depth, so that we can extract the deepest nodes first, to avoid a node being moved before its children and then not being able to find the children anymore
    const nodesSorted = sortNodesByPathDepthDescending(nodedFiltered);

    let nodesExtracted = 0;

    nodesSorted.forEach(node => {

            extractInlinedSchemaElement(node.absolutePath, schemaData, node.name);
            nodesExtracted++;

    })

    return nodesExtracted;
}

function sortNodesByPathDepthDescending(nodes: SchemaNodeData[]): SchemaNodeData[] {
    return nodes.sort((a, b) => b.absolutePath.length - a.absolutePath.length);
}

export function extractInlinedSchemaElement(absoluteElementPath: Path, schemaData: ManagedData, elementName: string): Path {
    const dataAtPath = dataAt(absoluteElementPath, schemaData.data.value);
    const newElementId = findAvailableSchemaId(schemaData, ['$defs'], elementName, true);
    schemaData.setDataAt(newElementId, dataAtPath);
    const referenceToNewElement = '#' + pathToJsonPointer(newElementId);
    schemaData.setDataAt(absoluteElementPath, {
        $ref: referenceToNewElement,
    });
    return newElementId;
}


export function addSchemaObject(schemaData: ManagedData) {
    const rawData = schemaData.data.value;

    // set type of root element to object if not done yet
    if (rawData.type !== 'object') {
        rawData.type = 'object';
    }

    const objectPath = findAvailableSchemaId(schemaData, ['$defs'], 'object');
    schemaData.setDataAt(objectPath, {
        type: 'object',
        properties: {
            property1: {
                type: 'string',
            },
        },
    });

        // make connection from root element to new object if root has no properties yet
        if (rawData.properties === undefined) {
            const objectName = objectPath[objectPath.length - 1];
            const referenceToNewObject = '#' + pathToJsonPointer(objectPath);
            schemaData.setDataAt(['properties', objectName], {
                $ref: referenceToNewObject,
            });
    }

    return objectPath;
}

export function addSchemaEnum(schemaData: ManagedData) {
    const enumPath = findAvailableSchemaId(schemaData, ['$defs'], 'enum');
    schemaData.setDataAt(enumPath, {
        type: 'string',
        enum: ['VAL_1', 'VAL_2'],
    });
    return enumPath;
}