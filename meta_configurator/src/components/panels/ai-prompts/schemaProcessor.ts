import type {JsonSchemaObjectType, JsonSchemaType} from "@/schema/jsonSchemaType";

export function removeCustomFieldsFromSchema(schema: JsonSchemaType) {
    if (schema === null || typeof schema !== 'object') {
        return schema;
    }
    // recursively modify schema by removing all custom metaConfigurator fields from it
    const removeCustomFields = (schema: JsonSchemaObjectType) => {
        for (const key in schema) {
            if (key === 'metaConfigurator') {
                delete schema[key];
            } else if (typeof schema[key] === 'object') {
                removeCustomFields(schema[key]);
            } else if(Array.isArray(schema[key])) {
                schema[key].forEach((item) => {
                    removeCustomFields(item);
                });
            }
        }
    };
    removeCustomFields(schema);
    return schema
}