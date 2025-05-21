import type {DataMappingService} from "@/data-mapping/dataMappingService";
import type {TopLevelSchema} from "@/schema/jsonSchemaType";
import {inferJsonSchema} from "@/schema/inferJsonSchema";
import {fixAndParseGeneratedJson, getApiKey} from "@/components/panels/ai-prompts/aiPromptUtils";
import {queryDataMappingConfig} from "@/utility/openai";
import type {Ref} from "vue";
import {cutDataToNEntriesPerArray} from "@/data-mapping/dataMappingUtils";
import {extractSuitableSourcePaths} from "@/data-mapping/simple/extractPathsFromDocument";
import {DATA_MAPPING_EXAMPLE_CONFIG, DATA_MAPPING_SCHEMA} from "@/data-mapping/simple/dataMappingSchema";
import {sanitizeMappingConfiguration} from "@/data-mapping/simple/sanitizeMappingConfiguration";
import type {DataMappingConfig} from "@/data-mapping/simple/dataMappingTypes";
import {performSimpleDataMapping} from "@/data-mapping/simple/performDataMapping";

export class DataMappingServiceSimple implements DataMappingService {


    async generateMappingSuggestion(input: any, targetSchema: TopLevelSchema, statusRef: Ref<string>,  errorRef: Ref<string>, userComments: string): Promise<string> {

        statusRef.value = 'Reducing input data for efficiency...';
        errorRef.value = ''
        console.log("input is: ", input)
        const cuttingN = ((JSON.stringify(input).length / 1024) > 50) ? 2 : 3;
        const inputDataSubset = cutDataToNEntriesPerArray(input, cuttingN);
        console.log(
            'Reduced input data from ' +
            JSON.stringify(input).length / 1024 +
            ' KB to ' +
            JSON.stringify(inputDataSubset).length / 1024 +
            ' KB'
        );

        // infer schema for input data
        statusRef.value = 'Inferring schema for input data...';
        const inputFileSchema = inferJsonSchema(inputDataSubset);

        const apiKey = getApiKey();
        statusRef.value = 'Generating data mapping suggestion...';

        const possibleSourcePaths = extractSuitableSourcePaths(input);

        const dataMappingSchemaStr = JSON.stringify(DATA_MAPPING_SCHEMA);
        const dataMappingExampleStr = JSON.stringify(DATA_MAPPING_EXAMPLE_CONFIG);
        const inputFileSchemaStr = JSON.stringify(inputFileSchema);
        const targetSchemaStr = JSON.stringify(targetSchema);
        const inputDataSubsetStr = JSON.stringify(inputDataSubset);
        console.log(
            'Sizes of the different input files in KB:' +
            ' dataMappingSchema: ' +
            (dataMappingSchemaStr.length / 1024).toFixed(2) +
            ' inputFileSchema: ' +
            (inputFileSchemaStr.length / 1024).toFixed(2) +
            ' targetSchema: ' +
            (targetSchemaStr.length / 1024).toFixed(2) +
            ' inputDataSubset: ' +
            (inputDataSubsetStr.length / 1024).toFixed(2)
        );
        const resultPromise = queryDataMappingConfig(
            apiKey,
            dataMappingSchemaStr,
            dataMappingExampleStr,
            inputFileSchemaStr,
            targetSchemaStr,
            inputDataSubsetStr,
            possibleSourcePaths,
            userComments
        );

        const responseStr = await resultPromise;

        const sanitizationResponse = this.sanitizeMappingConfig(responseStr, input)
        const validationError = sanitizationResponse.error;
        if (validationError.length == 0) {
            statusRef.value = 'Data mapping suggestion generated successfully.';
            return sanitizationResponse.result;
        } else {
            statusRef.value = '';
            errorRef.value = validationError;
            return '';
        }

    }

    performDataMapping(input: any, config: string, statusRef: Ref<string>, errorRef: Ref<string>): Promise<any> {
        statusRef.value = 'Performing data mapping...';

        const mapping =  JSON.parse(config) as DataMappingConfig;
        console.log("parsed mapping is: ", mapping)
        const result = performSimpleDataMapping(input, mapping);
        statusRef.value = 'Data mapping performed successfully.';
        return result;
    }

    sanitizeInputDocument(input: any): any {
        return input;
    }

    sanitizeMappingConfig(config: string, input: any): { result: string, error: string} {
        const configObj = fixAndParseGeneratedJson(config);
        const validationError = sanitizeMappingConfiguration(configObj, input)
        return {result: JSON.stringify(configObj, null, 2), error: validationError};
    }



}