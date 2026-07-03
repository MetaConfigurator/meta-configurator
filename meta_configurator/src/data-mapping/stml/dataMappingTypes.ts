export type DataMappingConfig = {
  mappings: Mapping[];
  transformations: Transformation[];
};

export type Mapping = {
  sourcePath: string;
  targetPath: string;
};

export type Transformation = {
  operationType: 'function' | 'valueMapping';
  sourcePath: string;
  function?: string;
  valueMapping?: Record<string, any>;
};
