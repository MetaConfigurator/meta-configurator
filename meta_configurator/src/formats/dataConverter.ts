import YAML from 'yaml';

/**
 * Abstract super class for converters that can parse and stringify data.
 */
export abstract class DataConverter {
  /**
   * Parses the given data and returns the result.
   *
   * @param data the string to parse.
   * @throws Error if the data could not be parsed.
   */
  abstract parse(data: string): any;

  /**
   * Generates a string representation of the given data.
   * This method should be the inverse of parse.
   * Implementations should not throw an error.
   *
   * @param data the data to stringify.
   * @returns the string representation of the data. This should be a valid input for parse.
   * If the data is undefined, an empty string should be returned.
   */
  abstract stringify(data: any): string;

  /**
   * Returns true if the given data is valid for this converter.
   * Uses the parse method to check if the data can be parsed.
   *
   * This should only be used if the actual parsed data is not needed,
   * as otherwise the data is parsed twice.
   *
   * Do not: if (isValidSyntax(data)) { parse(data); }
   * Do: parseIfValid(data, (parsedData) => { ... });
   *
   * @param data the data to check
   */
  isValidSyntax(data: string): boolean {
    try {
      this.parse(data);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Parses the given data and calls the callback with the result.
   * If the data is not valid, the callback is not called, no error is thrown.
   *
   * @param data the data to parse
   * @param callback the callback to call with the parsed data
   */
  parseIfValid(data: string, callback: (data: any) => void): void {
    try {
      callback(this.parse(data));
    } catch (e) {
      // ignore
    }
  }
}

/**
 * DataConverter implementation for JSON.
 */
export class DataConverterJson extends DataConverter {
  override parse(data: string): any {
    return JSON.parse(data);
  }

  override stringify(data: any): string {
    if (data === undefined) {
      return '';
    }
    return JSON.stringify(data, null, 2);
  }
}

/**
 * DataConverter implementation for YAML.
 */
export class DataConverterYaml extends DataConverter {
  override parse(data: string): any {
    return YAML.parse(data);
  }

  override stringify(data: any): string {
    return YAML.stringify(data);
  }
}
