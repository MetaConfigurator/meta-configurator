import type {TopLevelSchema} from "@/schema/jsonSchemaType";
import type {Ref} from "vue";

export interface DataMappingService {


    sanitizeMappingConfig(config: string, input: any): { result: string, error: string};
    sanitizeInputDocument(input: any): any
    generateMappingSuggestion(input: any, targetSchema: TopLevelSchema, statusRef: Ref<string>, errorRef: Ref<string>, userComments: string): Promise<string>
    performDataMapping(input: any, config: string, statusRef: Ref<string>, errorRef: Ref<string>): Promise<any|undefined>

}