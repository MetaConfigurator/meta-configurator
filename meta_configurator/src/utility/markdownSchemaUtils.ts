import {convert_to, from_json_schema, Templates} from "mdmodels";
import {importSchema} from "@/components/toolbar/importFile";


export function importSchemaFromMarkdown(importedMarkdown: string) {
    const jsonSchemaString = convert_to(importedMarkdown, Templates.JsonSchema);
    const jsonSchema = JSON.parse(jsonSchemaString);
    importSchema(jsonSchema);
}


export function exportSchemaToMarkdown(schema: any): string {
    const dataModel = from_json_schema(schema);
    return convert_to(dataModel, Templates.Markdown);
}