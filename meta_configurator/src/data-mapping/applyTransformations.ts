import type {Transformation} from "@/data-mapping/dataMappingTypes";
import {dataAt} from "@/utility/resolveDataAtPath";
import _ from "lodash";
import {findMatchingPaths} from "@/data-mapping/findMatchingPaths";


export function applyTransformations(inputData: any, transformations: Transformation[]): any {
    const outputData = JSON.parse(JSON.stringify(inputData)); // Deep clone input data

    for (const transformation of transformations) {
        const sourcePathDef = transformation.sourcePath;
        const sourcePathsWhichMatchDef = findMatchingPaths(inputData, sourcePathDef);

        for (const sourcePath of sourcePathsWhichMatchDef) {
            const value = dataAt(sourcePath, outputData);
            if (value !== undefined) {
                const transformedValue = applyTransformationsOnValue(value, [transformation]);
                _.set(outputData, sourcePath, transformedValue);
            }
        }

    }

    return outputData;
}


function applyTransformationsOnValue(
    value: any,
    transformations: Transformation[]
): any {
    // Find all transformations for the given sourcePath

    for (const transformation of transformations) {
        switch (transformation.operationType) {
            case "mathFormula":
                if (typeof transformation.formula === "string") {
                    try {
                        // Simple formula evaluator using Function (make sure input is trusted or sandboxed!)
                        const func = new Function("x", `return ${transformation.formula}`);
                        value = func(Number(value));
                    } catch (e) {
                        console.warn(`Failed to evaluate math formula "${transformation.formula}":`, e);
                    }
                }
                break;

            case "stringOperation":
                if (typeof transformation.string === "string") {
                    switch (transformation.string) {
                        case "uppercase":
                            value = String(value).toUpperCase();
                            break;
                        case "lowercase":
                            value = String(value).toLowerCase();
                            break;
                        case "trim":
                            value = String(value).trim();
                            break;
                        default:
                            console.warn(`Unknown string operation: ${transformation.string}`);
                    }
                }
                break;

            case "valueMapping":
                if (transformation.valueMapping) {
                    const mapped = transformation.valueMapping[value];
                    if (mapped !== undefined) {
                        value = mapped;
                    }
                }
                break;

            default:
                console.warn(`Unknown transformation type: ${transformation.operationType}`);
        }
    }

    return value;
}