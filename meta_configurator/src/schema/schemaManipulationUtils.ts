import {dataAt} from "@/utility/resolveDataAtPath";
import {pathToJsonPointer} from "@/utility/pathUtils";
import type {Path} from "@/utility/path";
import {findAvailableSchemaId} from "@/schema/schemaReadingUtils";
import type {ManagedData} from "@/data/managedData";


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