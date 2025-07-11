import type {TopLevelSchema} from "@/schema/jsonSchemaType";
import {dataAt} from "@/utility/resolveDataAtPath";
import {jsonPointerToPath, jsonPointerToPathTyped} from "@/utility/pathUtils";
import {cloneDeep} from "lodash";
import {mergeAllOfs} from "@/schema/mergeAllOfs";
import type {Path} from "@/utility/path";

export function resolveReferences(subSchema: any, rootSchema: TopLevelSchema): any {
    if (subSchema.$ref) {
        const refJsonPointer = subSchema.$ref;
        const refPath = jsonPointerToPathTyped(refJsonPointer);
        const schemaAtRef = dataAt(refPath, rootSchema)
        // copy subSchema
        const subSchemaWithoutRef = cloneDeep(subSchema);
        delete subSchemaWithoutRef.$ref
        return mergeAllOfs([
            subSchemaWithoutRef,
            resolveReferences(schemaAtRef, rootSchema),
        ])
    }
    return subSchema;
}

// collects all the references in the sub schema and possibly referred schemas
export function collectReferences(subSchema: any, rootSchema: TopLevelSchema): Set<string> {
    if (subSchema.$ref) {

        const refJsonPointer = subSchema.$ref;
        const refPath = jsonPointerToPathTyped(refJsonPointer);
        const schemaAtRef = dataAt(refPath, rootSchema)
        const result = collectReferences(schemaAtRef, rootSchema)
        result.add(refJsonPointer)
        return result;


    }
    return new Set();
}

// recursively go down the refs until a path without ref is found, return that path
export function findTargetPath(path: Path, rootSchema: TopLevelSchema): Path {
    const schemaAtPath = dataAt(path, rootSchema)
    if (schemaAtPath && schemaAtPath.$ref) {
        const newPath = jsonPointerToPathTyped(schemaAtPath.$ref);
        return findTargetPath(newPath, rootSchema);
    } else {
        return path;
    }
}
