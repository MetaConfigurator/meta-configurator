import type {DataMappingService} from "@/data-mapping/dataMappingService";
import type {TopLevelSchema} from "@/schema/jsonSchemaType";
import {inferJsonSchema} from "@/schema/inferJsonSchema";
import { fixGeneratedExpression, getApiKey} from "@/components/panels/ai-prompts/aiPromptUtils";
import { queryJsonataExpression} from "@/utility/openai";
import type {Ref} from "vue";
import {cutDataToNEntriesPerArray} from "@/data-mapping/dataMappingUtils";
import {
    JSONATA_EXPRESSION,
    JSONATA_INPUT_EXAMPLE,
    JSONATA_INPUT_EXAMPLE_SCHEMA, JSONATA_OUTPUT_EXAMPLE, JSONATA_OUTPUT_EXAMPLE_SCHEMA,
    JSONATA_REFERENCE_GUIDE
} from "@/data-mapping/jsonata/jsonataExamples";
import jsonata from "jsonata";
import {cloneDeep} from "lodash";

export class DataMappingServiceJSONata implements DataMappingService {


    async generateMappingSuggestion(input: any, targetSchema: TopLevelSchema, statusRef: Ref<string>, errorRef: Ref<string>, userComments: string): Promise<string> {

        statusRef.value = 'Reducing input data for efficiency...';
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

        const jsonataReferenceStr = JSON.stringify(JSONATA_REFERENCE_GUIDE);
        const jsonataInputExampleStr = JSON.stringify(JSONATA_INPUT_EXAMPLE);
        const jsonataInputExampleSchemaStr = JSON.stringify(JSONATA_INPUT_EXAMPLE_SCHEMA);
        const jsonataExpressionStr = JSON.stringify(JSONATA_EXPRESSION);
        const jsonataOutputExampleStr = JSON.stringify(JSONATA_OUTPUT_EXAMPLE);
        const jsonataOutputExampleSchemaStr = JSON.stringify(JSONATA_OUTPUT_EXAMPLE_SCHEMA);
        const inputFileSchemaStr = JSON.stringify(inputFileSchema);
        const targetSchemaStr = JSON.stringify(targetSchema);
        const inputDataSubsetStr = JSON.stringify(inputDataSubset);
        console.log(
            'Sizes of the different input files in KB:' +
            ' jsonata example files: ' +
            ((jsonataReferenceStr.length + jsonataInputExampleStr.length + jsonataInputExampleSchemaStr.length + jsonataExpressionStr.length + jsonataOutputExampleStr.length + jsonataOutputExampleSchemaStr.length ) / 1024).toFixed(2) +
            ' inputFileSchema: ' +
            (inputFileSchemaStr.length / 1024).toFixed(2) +
            ' targetSchema: ' +
            (targetSchemaStr.length / 1024).toFixed(2) +
            ' inputDataSubset: ' +
            (inputDataSubsetStr.length / 1024).toFixed(2)
        );
        const resultPromise = queryJsonataExpression(
            apiKey,
            jsonataReferenceStr,
            jsonataInputExampleStr,
            jsonataInputExampleSchemaStr,
            jsonataOutputExampleStr,
            jsonataOutputExampleSchemaStr,
            jsonataExpressionStr,
            inputDataSubsetStr,
            inputFileSchemaStr,
            targetSchemaStr,
            userComments
        );

        const responseStr = await resultPromise
        statusRef.value = 'Data mapping suggestion generated successfully.';
        return fixGeneratedExpression(responseStr, ['jsonata', 'json']);


    }

    async performDataMapping(input: any, config: string, statusRef: Ref<string>, errorRef: Ref<string>): Promise<any|undefined> {
        statusRef.value = 'Performing data mapping...';
        errorRef.value = '';

        try {
            const result = await jsonata(config).evaluate(input);
            if (result && typeof result === 'object') {
                statusRef.value = 'Data mapping performed successfully.';
            }
            return result;

        } catch (e) {
            statusRef.value = '';
            errorRef.value = 'Data mapping failed. Please check the mapping configuration. Use <a href="https://try.jsonata.org/" target="_blank">https://try.jsonata.org/</a> to validate and fix your JSONata expression.';
            return undefined;
        }
    }

    sanitizeInputDocument(input: any): any {
        const result = cloneDeep(input);
        // loop through nested JSON object which could also have array as children and remove all special characters from property names
        this.removeSpecialCharactersRecursive(result);
        return result;
    }

    removeSpecialCharactersRecursive(data: any) {
        // TODO
    }

    sanitizeMappingConfig(config: string, input: any): string {
        return config; // TODO
    }

    validateMappingConfig(config: string, input: any): { valid: boolean; error: string | undefined } {
        const inputDataSubset = cutDataToNEntriesPerArray(input, 3);
        try {
            jsonata(config).evaluate(inputDataSubset);
            return { valid: true, error: undefined};
        } catch (error) {

            if (error && typeof error === 'object' && 'position' in error && 'code' in error) {
                return { valid: false, error: 'Error reason: at ' + error.position + " with code " + error.code + " " + JSON.stringify(error) };
            } else {
                return { valid: false, error: 'Unknown error' };
            }
        }

    }




}