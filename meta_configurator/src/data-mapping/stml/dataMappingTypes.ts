// data mapping config type definitions
export type DataMappingConfig = {
  mappings: Mapping[];
  transformations: Transformation[];
};

export type Mapping = {
  // paths are JSON pointer paths
  sourcePath: string;
  targetPath: string;
};

export type Transformation = {
  operationType: 'function' | 'valueMapping';
  sourcePath: string;
  function?: string;
  valueMapping?: Record<string, any>;
};
