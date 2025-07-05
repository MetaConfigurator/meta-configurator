import _ from 'lodash';
import {dataAt} from '@/utility/resolveDataAtPath';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';
import type {DataMappingConfig} from '@/data-mapping/stml/dataMappingTypes';
import {applyTransformations} from '@/data-mapping/stml/applyTransformations';
import {normalizeJsonPointer} from '@/data-mapping/stml/dataMappingUtilsStml';

// Utility Functions
function getIndexPlaceholders(path: string): string[] {
  const regex = /%INDEX_([A-Z])%/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(path)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

function resolvePathWithIndexMap(path: string, indexMap: Record<string, number>): string {
  return path.replace(/%INDEX_([A-Z])%/g, (_, p1) => String(indexMap[p1]));
}

// Recursive Traversal for Nested Indexes
function recursiveMap(
  inputData: any,
  outputData: any,
  sourcePath: string,
  targetPath: string,
  placeholders: string[],
  indexMap: Record<string, number>,
  depth: number
) {
  if (depth === placeholders.length) {
    const resolvedSource = resolvePathWithIndexMap(sourcePath, indexMap);
    const resolvedTarget = resolvePathWithIndexMap(targetPath, indexMap);
    try {
      const value = dataAt(jsonPointerToPathTyped(resolvedSource), inputData);
      if (value !== undefined) {
        _.set(outputData, jsonPointerToPathTyped(resolvedTarget), value);
      } else {
        console.warn(`Skipping mapping: no value at ${resolvedSource}`);
      }
    } catch (TypeError) {
      console.warn(`Error resolving path: ${resolvedSource} for input data `, inputData);
    }
    return;
  }

  const currentPlaceholder = placeholders[depth];
  let arrayPath = sourcePath.split(`%INDEX_${currentPlaceholder}%`)[0];
  // if arrayPath ends with a /, remove it
  if (arrayPath.endsWith('/')) {
    arrayPath = arrayPath.slice(0, -1);
  }
  const resolvedArrayPath = resolvePathWithIndexMap(arrayPath, indexMap);
  const resolvedArrayPathTyped = jsonPointerToPathTyped(resolvedArrayPath);
  const array = dataAt(resolvedArrayPathTyped, inputData);

  if (!Array.isArray(array)) {
    console.warn(`Expected array at ${resolvedArrayPath}, got:`, array);
    return;
  }

  for (let i = 0; i < array.length; i++) {
    const newIndexMap = {...indexMap, [currentPlaceholder]: i};
    recursiveMap(
      inputData,
      outputData,
      sourcePath,
      targetPath,
      placeholders,
      newIndexMap,
      depth + 1
    );
  }
}

export function performSimpleDataMapping(inputData: any, mappingConfig: DataMappingConfig): any {
  const outputData: any = {};

  // first, apply the transformations to the complete input data
  inputData = applyTransformations(inputData, mappingConfig.transformations);

  for (const mapping of mappingConfig.mappings) {
    const {sourcePath, targetPath} = mapping;
    const placeholders = getIndexPlaceholders(sourcePath + targetPath);

    if (placeholders.length === 0) {
      const value = dataAt(jsonPointerToPathTyped(sourcePath), inputData);
      if (value !== undefined) {
        const targetPathTyped = jsonPointerToPathTyped(targetPath);
        _.set(outputData, targetPathTyped, value);
      } else {
        console.warn(`Skipping mapping: no value at ${sourcePath}`);
      }
    } else {
      recursiveMap(inputData, outputData, sourcePath, targetPath, placeholders, {}, 0);
    }
  }

  // for the rare scenario of having an array at root level, we apply this transformation
  return turnArrayLikeObjectIntoArray(outputData);
}

function turnArrayLikeObjectIntoArray(obj: any): any | any[] {
  // if the object has only keys that are numbers from 1 to n, turn it into an array, keeping the order
  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj)
      .map(Number)
      .sort((a, b) => a - b);
    // check also that there is no gap in the keys
    if (keys.length > 0 && keys[0] === 0 && keys.every((key, index) => key === index)) {
      return keys.map(key => obj[key]);
    }
  }

  return obj;
}

export function normalizeInputConfig(inputConfig: DataMappingConfig) {
  inputConfig.mappings.forEach(mapping => {
    mapping.sourcePath = normalizeJsonPointer(mapping.sourcePath, false);
    mapping.targetPath = normalizeJsonPointer(mapping.targetPath, false);
  });
  inputConfig.transformations.forEach(transformation => {
    transformation.sourcePath = normalizeJsonPointer(transformation.sourcePath, false);
  });
}
