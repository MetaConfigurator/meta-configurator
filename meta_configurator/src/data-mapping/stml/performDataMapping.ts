import _ from 'lodash';
import {dataAt} from '@/utility/resolveDataAtPath';
import {jsonPointerToPathTyped} from '@/utility/pathUtils';
import type {DataMappingConfig} from '@/data-mapping/stml/dataMappingTypes';
import {applyTransformations} from '@/data-mapping/stml/applyTransformations';
import {normalizeJsonPointer} from '@/data-mapping/stml/dataMappingUtilsStml';

function getIndexPlaceholders(path: string): string[] {
  const regex = /%INDEX_([A-Z])%/g;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(path)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

function resolvePathWithIndexMap(path: string, indexMap: Record<string, number>): string {
  return path.replace(/%INDEX_([A-Z])%/g, (_, p1) => String(indexMap[p1]));
}

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
    } catch (_error) {
      console.warn(`Error resolving path: ${resolvedSource} for input data `, inputData);
    }
    return;
  }

  const currentPlaceholder = placeholders[depth];
  let arrayPath = sourcePath.split(`%INDEX_${currentPlaceholder}%`)[0];
  if (arrayPath.endsWith('/')) {
    arrayPath = arrayPath.slice(0, -1);
  }
  const resolvedArrayPath = resolvePathWithIndexMap(arrayPath, indexMap);
  const array = dataAt(jsonPointerToPathTyped(resolvedArrayPath), inputData);

  if (!Array.isArray(array)) {
    console.warn(`Expected array at ${resolvedArrayPath}, got:`, array);
    return;
  }

  for (let i = 0; i < array.length; i++) {
    recursiveMap(inputData, outputData, sourcePath, targetPath, placeholders, {
      ...indexMap,
      [currentPlaceholder]: i,
    }, depth + 1);
  }
}

export function performSimpleDataMapping(inputData: any, mappingConfig: DataMappingConfig): any {
  const outputData: any = {};
  const transformedInput = applyTransformations(inputData, mappingConfig.transformations);

  for (const mapping of mappingConfig.mappings) {
    const {sourcePath, targetPath} = mapping;
    const placeholders = getIndexPlaceholders(sourcePath + targetPath);

    if (placeholders.length === 0) {
      const value = dataAt(jsonPointerToPathTyped(sourcePath), transformedInput);
      if (value !== undefined) {
        _.set(outputData, jsonPointerToPathTyped(targetPath), value);
      } else {
        console.warn(`Skipping mapping: no value at ${sourcePath}`);
      }
    } else {
      recursiveMap(transformedInput, outputData, sourcePath, targetPath, placeholders, {}, 0);
    }
  }

  return turnArrayLikeObjectIntoArray(outputData);
}

function turnArrayLikeObjectIntoArray(obj: any): any {
  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj)
      .map(Number)
      .sort((a, b) => a - b);
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
