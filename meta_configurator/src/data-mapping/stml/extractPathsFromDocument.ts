import type {Path} from '@/utility/path';

import {
  normalizeJsonPointer,
  pathToNormalizedJsonPointer,
} from '@/data-mapping/stml/dataMappingUtilsStml';
import type {DataMappingConfig} from '@/data-mapping/stml/dataMappingTypes';

export function extractSuitableSourcePaths(inputData: any): string[] {
  // finds all leafs in the input json document
  const allLeafs = determineAllLeafs(inputData, []);
  const allLeafsNormalized = allLeafs.map(leaf => {
    return pathToNormalizedJsonPointer(leaf, true);
  });

  // remove duplicates
  return Array.from(new Set(allLeafsNormalized));
}

export function extractSourcePaths(config: DataMappingConfig): string[] {
  const usedSourcePathsMapping = config.mappings.map(mapping => {
    return mapping.sourcePath;
  });
  const usedSourcePathsTransformations = config.transformations.map(transformation => {
    return transformation.sourcePath;
  });

  const uniqueSourcePaths = Array.from(
    new Set(usedSourcePathsMapping.concat(usedSourcePathsTransformations))
  );

  return uniqueSourcePaths.map(jsonPointer => {
    return normalizeJsonPointer(jsonPointer, true);
  });
}

export function extractInvalidSourcePathsFromConfig(
  config: DataMappingConfig,
  inputData: any
): string[] {
  const suitableSourcePaths = extractSuitableSourcePaths(inputData);
  const actualSourcePathsInMapping = extractSourcePaths(config);
  return actualSourcePathsInMapping.filter(path => !suitableSourcePaths.includes(path));
}

function determineAllLeafs(data: any, currentPath: Path): Path[] {
  if (Array.isArray(data)) {
    return data.flatMap((item, index) => {
      const newPath = [...currentPath, index];
      return determineAllLeafs(item, newPath);
    });
  }
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).flatMap(([key, value]) => {
      const newPath = [...currentPath, key];
      return determineAllLeafs(value, newPath);
    });
  }

  return [currentPath]; // Leaf node
}
