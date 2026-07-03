import type {Path} from '@/utility/path';
import {
  normalizeJsonPointer,
  pathToNormalizedJsonPointer,
} from '@/data-mapping/stml/dataMappingUtilsStml';
import type {DataMappingConfig} from '@/data-mapping/stml/dataMappingTypes';

export function extractSuitableSourcePaths(inputData: any): string[] {
  const allLeafs = determineAllLeafs(inputData, []);
  const allLeafsNormalized = allLeafs.map(leaf => {
    return pathToNormalizedJsonPointer(leaf, true);
  });

  return Array.from(new Set(allLeafsNormalized));
}

export function extractSourcePaths(config: DataMappingConfig): string[] {
  const usedSourcePathsMapping = config.mappings.map(mapping => mapping.sourcePath);
  const usedSourcePathsTransformations = config.transformations.map(
    transformation => transformation.sourcePath
  );

  const uniqueSourcePaths = Array.from(
    new Set(usedSourcePathsMapping.concat(usedSourcePathsTransformations))
  );

  return uniqueSourcePaths.map(jsonPointer => normalizeJsonPointer(jsonPointer, true));
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
    return data.flatMap((item, index) => determineAllLeafs(item, [...currentPath, index]));
  }
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).flatMap(([key, value]) =>
      determineAllLeafs(value, [...currentPath, key])
    );
  }

  return [currentPath];
}
