import type {JsonSchemaType, TopLevelSchema} from '@/schema/jsonSchemaType';
import Ajv2020 from 'ajv/dist/2020';
import Ajv2019 from 'ajv/dist/2019';
import Ajv, {type ErrorObject} from 'ajv';
import type {Path} from '@/utility/path';
import {pathToJsonPointer} from '@/utility/pathUtils';

const TOP_LEVEL_SCHEMA_KEY = 'topLevelSchema';

export function getMatchingAjvVersion(schema: JsonSchemaType): Ajv2020 | Ajv2019 | Ajv {
  const options = {
    strict: false,
    allErrors: true,
  };
  if (typeof schema !== 'object') {
    return new Ajv(options);
  }
  switch (schema.$schema) {
    case 'https://json-schema.org/draft/2020-12/schema':
    case 'https://json-schema.org/draft/2020-12/schema#':
      return new Ajv2020(options);
    case 'https://json-schema.org/draft/2019-09/schema':
    case 'https://json-schema.org/draft/2019-09/schema#':
      return new Ajv2019(options);
    default:
      return new Ajv(options);
  }
}

export function getTopLevelSchemaId(schema: TopLevelSchema): string {
  return schema.$id ?? TOP_LEVEL_SCHEMA_KEY;
}

/**
 * The result of a validation.
 */
export class ValidationResult {
  valid: boolean;
  errors: Array<ErrorObject>;

  constructor(errors: Array<ErrorObject>) {
    this.valid = errors.length == 0;
    this.errors = errors;
  }

  /**
   * Filters for errors that are at or below the given path.
   * @param path the path
   * @returns the filtered errors
   */
  public filterForPath(path: Path): ValidationResult {
    const jsonPointer = pathToJsonPointer(path);
    const filteredErrors = this.errors.filter(error => {
      const instancePath = error.instancePath;
      return instancePath === jsonPointer || instancePath.startsWith(jsonPointer + '/');
    });
    return new ValidationResult(filteredErrors);
  }

  /**
   * Filters for errors that are exactly at the given path.
   * @param  path the path
   * @returns the filtered errors
   */
  public filterForExactPath(path: Path): ValidationResult {
    const jsonPointer = pathToJsonPointer(path);
    const filteredErrors = this.errors.filter(error => error.instancePath == jsonPointer);
    return new ValidationResult(filteredErrors);
  }

  public isValidAtPath(path: Path): boolean {
    return this.filterForPath(path).valid;
  }
}
