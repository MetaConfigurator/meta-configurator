import type {
  DataMappingResult,
  DataMappingService,
  DataMappingValidationResult,
} from '@/data-mapping/dataMappingService';
import jsonata from 'jsonata';
import {cloneDeep} from 'lodash';
import {trimDataToMaxSize} from '@/utility/trimData';
import {getErrorMessage} from '@/utility/getErrorMessage';

export class DataMappingServiceJsonata implements DataMappingService {
  async performDataMapping(
    inputData: unknown,
    mappingConfiguration: string
  ): Promise<DataMappingResult> {
    try {
      const mappingResultData = await this.executeMapping(inputData, mappingConfiguration);
      return {
        resultData: mappingResultData,
        success: true,
        message: 'Data mapping performed successfully.',
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      return {
        resultData: {},
        success: false,
        message: `Data mapping failed. Please check the mapping configuration. Use https://try.jsonata.org/ to validate and fix your JSONata expression. Reason: ${errorMessage}.`,
      };
    }
  }

  sanitizeInputDocument(inputData: unknown): unknown {
    const sanitizedInputData = cloneDeep(inputData);
    this.removeSpecialCharactersFromPropertyNames(sanitizedInputData);
    return sanitizedInputData;
  }

  private removeSpecialCharactersFromPropertyNames(data: unknown): void {
    if (Array.isArray(data)) {
      data.forEach(arrayItem => this.removeSpecialCharactersFromPropertyNames(arrayItem));
    } else if (data !== null && typeof data === 'object') {
      const dataRecord = data as Record<string, unknown>;
      for (const propertyName of Object.keys(dataRecord)) {
        const sanitizedPropertyName = propertyName.replace(/[^a-zA-Z0-9_]/g, '_');
        if (sanitizedPropertyName !== propertyName) {
          dataRecord[sanitizedPropertyName] = dataRecord[propertyName];
          delete dataRecord[propertyName];
        }
        this.removeSpecialCharactersFromPropertyNames(dataRecord[sanitizedPropertyName]);
      }
    }
  }

  async validateMappingConfig(
    mappingConfiguration: string,
    inputData: unknown
  ): Promise<DataMappingValidationResult> {
    const inputDataSubset = trimDataToMaxSize(inputData);
    try {
      await this.executeMapping(inputDataSubset, mappingConfiguration);
      return {success: true, message: 'Mapping configuration is valid.'};
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'position' in error &&
        'code' in error &&
        'message' in error
      ) {
        const cursorPosition = this.convertTextPositionToCursorPosition(
          mappingConfiguration,
          error.position as number
        );
        return {
          success: false,
          message: 'Error reason: ' + error.message + ' (row ' + (cursorPosition.row + 1) + ').',
        };
      } else {
        return {success: false, message: 'Unknown error'};
      }
    }
  }

  private executeMapping(inputData: unknown, mappingConfiguration: string): Promise<unknown> {
    return jsonata(mappingConfiguration).evaluate(inputData);
  }

  private convertTextPositionToCursorPosition(
    text: string,
    position: number
  ): {row: number; column: number} {
    const lines = text.split('\n');
    let row = 0;
    let column = position;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (column < line.length) {
        row = i;
        break;
      }
      column -= line.length + 1; // +1 for the newline character
    }

    return {row, column};
  }
}
