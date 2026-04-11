export interface RmlMappingService {
  validateMappingConfig(config: string, input: any): {success: boolean; message: string};
  generateMappingSuggestion(
    input: any,
    userComments: string
  ): Promise<{config: string; success: boolean; message: string}>;
  performRmlMapping(
    input: any,
    config: string
  ): Promise<{resultData: any; success: boolean; message: string}>;
}
