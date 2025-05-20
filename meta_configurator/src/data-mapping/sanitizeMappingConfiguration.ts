import type {DataMappingConfig} from '@/data-mapping/dataMappingTypes';
import {ValidationService} from '@/schema/validationService';
import {DATA_MAPPING_SCHEMA} from '@/packaged-schemas/dataMappingSchema';
import {normalizeInputConfig} from '@/data-mapping/performDataMapping';
import {extractInvalidSourcePathsFromConfig} from '@/data-mapping/extractPathsFromDocument';

export function sanitizeMappingConfiguration(config: any, inputFile: any): string {
  normalizeInputConfig(config);

  const configSchemaValidator = new ValidationService(DATA_MAPPING_SCHEMA);
  const configValidationResult = configSchemaValidator.validate(config);
  if (configValidationResult.errors.length > 0) {
    const formattedErrors = configValidationResult.errors
      .map(error => {
        return '' + error.message + ' at ' + error.instancePath + ' in ' + error.schemaPath;
      })
      .join('\n ');
    return `The data mapping configuration is invalid: ${formattedErrors}`; // TODO: automated error recovery
  }

  const configValidated: DataMappingConfig = config as DataMappingConfig;

  const invalidUsedSourcePaths = extractInvalidSourcePathsFromConfig(configValidated, inputFile);
  if (invalidUsedSourcePaths.length > 0) {
    console.log(
      `The following source paths are not valid in the input file: ${invalidUsedSourcePaths.join(
        ', '
      )}. They will be removed from the configuration.`
    );
  }

  // edit config to remove entries with invalid paths
  configValidated.mappings = configValidated.mappings.filter(mapping => {
    return !invalidUsedSourcePaths.includes(mapping.sourcePath);
  });

  return '';
}
