import {computed, type ComputedRef} from 'vue';
import type {JsonSchemaObjectType, SchemaPropertyTypes} from '@/schema/jsonSchemaType';
import {collectObjectDefinitionPaths} from '@/schema/schemaReadingUtils';
import {getSchemaForMode} from '@/data/useDataLink';
import {SessionMode} from '@/store/sessionMode';
import {pathToJsonPointer} from '@/utility/pathUtils';

export const typeChoices: ComputedRef<{label: string; schema: JsonSchemaObjectType}[]> = computed(
  () => {
    const simpleTypes: SchemaPropertyTypes = ['string', 'number', 'boolean', 'null'];

    const result: {label: string; schema: JsonSchemaObjectType}[] = [];

    simpleTypes.forEach(type => {
      // push simple type
      result.push({
        label: type,
        schema: {
          type: type,
        },
      });

      // push simple type in array
      result.push({
        label: type + '[]',
        schema: {
          type: 'array',
          items: {
            type: type,
          },
        },
      });
    });

    const objectDefs = collectObjectDefinitionPaths(
      getSchemaForMode(SessionMode.DataEditor).schemaRaw.value
    );

    objectDefs.forEach(def => {
      const objectName: string = def[def.length - 1].toString();
      const pathAsJsonPointer = pathToJsonPointer(def);
      result.push({
        label: objectName,
        schema: {
          $ref: '#' + pathAsJsonPointer,
        },
      });
      result.push({
        label: objectName + '[]',
        schema: {
          type: 'array',
          items: {
            $ref: '#' + pathAsJsonPointer,
          },
        },
      });
    });

    return result;
  }
);

export function determineTypeChoiceBySchema(schema: JsonSchemaObjectType): string | undefined {
  const choices = typeChoices.value;

  for (const choice of choices) {
    if (isSchemaMatchingTypeChoice(schema, choice.schema)) {
      return choice.label;
    }
  }
  return undefined;
}

function isSchemaMatchingTypeChoice(
  schema: JsonSchemaObjectType,
  typeChoiceSchema: JsonSchemaObjectType
): boolean {
  if (schema.type !== typeChoiceSchema.type) {
    return false;
  }

  if (schema.type === 'object') {
    return schema.$ref === typeChoiceSchema.$ref;
  }

  if (schema.type === 'array') {
    return isSchemaMatchingTypeChoice(
      schema.items as JsonSchemaObjectType,
      typeChoiceSchema.items as JsonSchemaObjectType
    );
  }

  return true;
}
