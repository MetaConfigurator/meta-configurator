import {dataAt} from '@/utility/resolveDataAtPath';
import _ from 'lodash';
import {findMatchingPaths} from '@/data-mapping/stml/findMatchingPaths';
import type {Transformation} from '@/data-mapping/stml/dataMappingTypes';

export function applyTransformations(inputData: any, transformations: Transformation[]): any {
  const outputData = JSON.parse(JSON.stringify(inputData));

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

function applyTransformationsOnValue(value: any, transformations: Transformation[]): any {
  for (const transformation of transformations) {
    switch (transformation.operationType) {
      case 'function':
        if (typeof transformation.function === 'string') {
          try {
            // eslint-disable-next-line no-new-func
            const func = new Function('x', `return ${transformation.function}`);
            value = func(value);
          } catch (e) {
            console.warn(`Failed to evaluate function "${transformation.function}":`, e);
          }
        }
        break;
      case 'valueMapping':
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
