import type {ManagedData} from '@/data/managedData';
import {
  SchemaElementData,
  SchemaObjectAttributeData,
  SchemaObjectNodeData,
} from '@/schema/graph-representation/schemaGraphTypes';
import {findAvailableSchemaId} from '@/schema/schemaReadingUtils';
import {
  addSchemaEnum,
  addSchemaObject,
  createIdentifierForExtractedElement,
  extractInlinedSchemaElement,
} from '@/schema/schemaManipulationUtils';
import type {Path} from '@/utility/path';

export type ClipboardSchemaPayload = {
  name: string;
  schema: any;
};

export async function copySelectedSchemaToClipboard(
  event: ClipboardEvent | undefined,
  schemaData: ManagedData,
  selectedData: SchemaElementData | undefined,
  selectedPath: Path
) {
  if (!selectedData) {
    console.log('No element selected to copy');
    return;
  }

  const schema = schemaData.dataAt(selectedPath);
  let metaType = selectedData.getNodeType();

  if (schema.enum != undefined) {
    metaType = 'schemaenum';
  }

  const dataToCopy = structuredClone(schema);
  if (!dataToCopy.type && metaType === 'schemaobject') {
    dataToCopy.type = 'object';
  }

  const clipboardText = JSON.stringify(
    {
      [getClipboardNameForSelectedSchema(selectedData)]: dataToCopy,
    },
    null,
    2
  );

  try {
    if (event?.clipboardData) {
      event.clipboardData.setData('text/plain', clipboardText);
      return;
    }
    await navigator.clipboard.writeText(clipboardText);
    console.log('Copied to system clipboard:', dataToCopy);
  } catch (err) {
    console.error('Failed to write to clipboard:', err);
  }
}

export async function pasteSchemaFromClipboard(
  event: ClipboardEvent | undefined,
  schemaData: ManagedData,
  selectedData: SchemaElementData | undefined
) {
  const clipboardText =
    event?.clipboardData?.getData('text/plain') ?? (await navigator.clipboard.readText());
  const payload = normalizeClipboardSchemaPayload(JSON.parse(clipboardText));

  if (isComplexSchema(payload.schema)) {
    return addComplexSchemaToDefinitions(schemaData, payload);
  }

  return addPrimitiveSchemaAsAttribute(schemaData, selectedData, payload);
}

export function inferSchemaKind(
  schema: any
): 'object' | 'array' | 'enum' | 'attribute' | 'unknown' {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return 'unknown';
  }

  if (schema.enum !== undefined) {
    return 'enum';
  }
  if (isPrimitiveArraySchema(schema)) {
    return 'attribute';
  }
  if (schema.type === 'array' || schema.items !== undefined) {
    return 'array';
  }
  if (schema.type === 'object' || schema.properties || schema.$ref) {
    return 'object';
  }
  if (
    ['string', 'boolean', 'number', 'null', 'integer'].includes(schema.type) ||
    schema.const !== undefined
  ) {
    return 'attribute';
  }

  return 'unknown';
}

function getClipboardNameForSelectedSchema(selectedData: SchemaElementData) {
  return createIdentifierForExtractedElement(
    selectedData.name,
    selectedData.title,
    selectedData.fallbackDisplayName
  );
}

function normalizeClipboardSchemaPayload(data: any): ClipboardSchemaPayload {
  if (isWrappedSchemaPayload(data)) {
    const [name, schema] = Object.entries(data)[0] as [string, any];
    return {
      name: name.trim() || deriveNameFromSchema(schema),
      schema,
    };
  }

  return {
    name: defaultNameForSchema(data),
    schema: data,
  };
}

function deriveNameFromSchema(schema: any) {
  if (schema?.title && typeof schema.title === 'string') {
    return schema.title;
  }
  if (schema?.type === 'object' || schema?.properties || schema?.$ref) {
    return 'object';
  }
  if (schema?.type === 'array' || schema?.items) {
    return 'array';
  }
  if (schema?.enum !== undefined) {
    return 'enum';
  }
  if (typeof schema?.type === 'string') {
    return schema.type;
  }
  return 'schema';
}

function isWrappedSchemaPayload(data: any) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  const entries = Object.entries(data);
  if (entries.length !== 1) {
    return false;
  }

  return inferSchemaKind(data) === 'unknown' && inferSchemaKind(entries[0]![1]) !== 'unknown';
}

function isComplexSchema(schema: any) {
  return ['object', 'array', 'enum'].includes(inferSchemaKind(schema));
}

function defaultNameForSchema(schema: any) {
  const schemaKind = inferSchemaKind(schema);

  if (schemaKind === 'attribute') {
    return 'attr';
  }
  if (schemaKind === 'object' || schemaKind === 'array') {
    return 'object';
  }
  if (schemaKind === 'enum') {
    return 'enum';
  }

  return 'schema';
}

function addComplexSchemaToDefinitions(schemaData: ManagedData, payload: ClipboardSchemaPayload) {
  const preferredName = payload.name.trim() || deriveNameFromSchema(payload.schema);
  const schemaKind = inferSchemaKind(payload.schema);

  if (schemaKind === 'enum') {
    return addSchemaEnum(schemaData, payload.schema, preferredName);
  }

  const elementPath = addSchemaObject(schemaData, false, payload.schema, preferredName);

  if (schemaKind === 'array') {
    return extractArrayItemsToDefinition(schemaData, elementPath, payload);
  }

  return elementPath;
}

function addPrimitiveSchemaAsAttribute(
  schemaData: ManagedData,
  selectedData: SchemaElementData | undefined,
  payload: ClipboardSchemaPayload
) {
  const targetObjectPath = getSelectedObjectPathForAttributePaste(selectedData);
  if (!targetObjectPath) {
    throw new Error('Primitive schemas can only be pasted when an object is selected.');
  }

  const attributePath = findAvailableSchemaId(
    schemaData,
    [...targetObjectPath, 'properties'],
    payload.name.trim() || 'property',
    true
  );

  schemaData.setDataAt(attributePath, payload.schema);
  return attributePath;
}

function getSelectedObjectPathForAttributePaste(selectedData: SchemaElementData | undefined) {
  if (selectedData instanceof SchemaObjectNodeData) {
    return selectedData.absolutePath;
  }

  if (selectedData instanceof SchemaObjectAttributeData) {
    return selectedData.absolutePath.slice(0, -2);
  }

  return undefined;
}

function isPrimitiveArraySchema(schema: any) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return false;
  }

  if (!(schema.type === 'array' || schema.items !== undefined)) {
    return false;
  }

  const items = schema.items;
  if (!items || typeof items !== 'object' || Array.isArray(items)) {
    return false;
  }

  return inferSchemaKind(items) === 'attribute';
}

function extractArrayItemsToDefinition(
  schemaData: ManagedData,
  arrayPath: Path,
  payload: ClipboardSchemaPayload
) {
  const arraySchema = schemaData.dataAt(arrayPath);
  if (!arraySchema?.items || typeof arraySchema.items !== 'object' || arraySchema.items.$ref) {
    return arrayPath;
  }

  const itemName = createIdentifierForExtractedElement(
    undefined,
    arraySchema.items.title,
    payload.name + 'Item'
  );

  return extractInlinedSchemaElement([...arrayPath, 'items'], schemaData, itemName, true);
}
