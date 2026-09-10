import type {
  DataMappingResult,
  DataMappingService,
  DataMappingValidationResult,
} from '@/data-mapping/dataMappingService';
import {trimDataToMaxSize} from '@/utility/trimData';
import {cloneDeep} from 'lodash';
import {executeSandboxedJavascriptTransform} from '@/utility/sandboxedJavascript';
import {fixGeneratedJavascript} from '@/components/panels/ai-prompts/aiPromptUtils';
import {getErrorMessage} from '@/utility/getErrorMessage';

export class DataMappingServiceJavascript implements DataMappingService {
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
      return {
        resultData: {},
        success: false,
        message: `Data mapping failed. Reason: ${getErrorMessage(error)}.`,
      };
    }
  }

  sanitizeInputDocument(inputData: unknown): unknown {
    return cloneDeep(inputData);
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
      return {success: false, message: `Error: ${getErrorMessage(error)}`};
    }
  }

  private executeMapping(inputData: unknown, mappingConfiguration: string): Promise<unknown> {
    return executeSandboxedJavascriptTransform(
      fixGeneratedJavascript(mappingConfiguration),
      inputData
    );
  }
}
