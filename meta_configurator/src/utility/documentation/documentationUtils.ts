import type {JsonSchemaObjectType, TopLevelSchema} from "@/schema/jsonSchemaType";
import {collectReferences, findTargetPath, resolveReferences} from "@/schema/resolveReferences";
import type {Path} from "@/utility/path";
import {pathToString} from "@/utility/pathUtils";
import {formatRegistry} from '@/dataformats/formatRegistry';

export function shouldIncludeNodeInDocumentation(propertyName: string) {
  if (["if", "then", "else"].includes(propertyName.toLowerCase())) {
    return false;
  }

  return true;
}

export function hasExample(schema: any): boolean {
    return schema && Array.isArray(schema.examples) && schema.examples.length > 0;
}


export function getDefaultValues(schema: any): any[] {
    if (schema.defaults && schema.defaults.length > 0) {
        return schema.defaults;
    }
    return []
}

export function generateSchemaInstance(schema: any, rootSchema: TopLevelSchema, visitedReferences: Set<string>|undefined = undefined): any {
    // if the schema has example values, take the first example
    if (schema.examples && schema.examples.length > 0) {
        return schema.examples[0];
    }

    // otherwise, if the schema has a default, also take it
    if (schema.defaults && schema.defaults.length > 0) {
        return schema.defaults[0];
    }

    // if there is a constant value defined, take it
    if (schema.const) {
        return schema.const;
    }

    if (visitedReferences == undefined) {
        visitedReferences = new Set();
    }
    // mark the current schema as visited so children will not visit it again if not required
    visitedReferences = visitedReferences.union(collectReferences(schema, rootSchema));

    // resolve the references of the current schema if needed
    const resolvedSchema: JsonSchemaObjectType = resolveReferences(schema, rootSchema)

    const type = resolvedSchema?.type ?? "any";
    if (type === "string") return "{string}";
    if (type === "number") return "{number}";
    if (type === "integer") return "{integer}";
    if (type === "boolean") return "{boolean}";
    if (type === "array") {
        const arrayItemInstance = generateSchemaInstance(resolvedSchema.items, rootSchema, visitedReferences);
        const itemCount = Math.max(schema.minItems || 0, 1);
        const resultArray: any[] = []
        for (let i = 0; i < itemCount; i++) {
            resultArray.push(arrayItemInstance)
        }
        return resultArray as any;
    }
    if (type === "object") {
        const props = resolvedSchema.properties ?? {};
        const patternProps = resolvedSchema.patternProperties ?? {};
        const additionalProps = resolvedSchema.additionalProperties ?? true;
        const required = resolvedSchema.required ?? [];
        const result: any = {};
        for (const key in props) {
            const propertySchema = props[key];
            const propertyReferences = collectReferences(propertySchema, rootSchema);
            const propertyRefIsNotAlreadyVisited = propertyReferences.isDisjointFrom(visitedReferences);
            if (required.includes(key) || propertyRefIsNotAlreadyVisited)
                result[key] = generateSchemaInstance(propertySchema, rootSchema, visitedReferences);
        }
        for (const key in patternProps) {
            const propertySchema = patternProps[key];
            const propertyReferences = collectReferences(propertySchema, rootSchema);
            const propertyRefIsNotAlreadyVisited = propertyReferences.isDisjointFrom(propertyReferences);
            if (key in required || propertyRefIsNotAlreadyVisited)
                result[key] = generateSchemaInstance(propertySchema, rootSchema, visitedReferences);
        }
        if (additionalProps && additionalProps != true) {
            result["additionalProp"] = generateSchemaInstance(additionalProps, rootSchema, visitedReferences);
        }
        return result;
    }
    return "{value}";
}

export function extractConstraints(schema: any): string {
    if (!schema) return "-";
    const constraints: string[] = [];
    const keys = ["minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "pattern", "format", "const", "multipleOf"];
    for (const key of keys) {
        if (key in schema) {
            constraints.push(`${key}: ${JSON.stringify(schema[key])}`);
        }
    }
    const deprecated = schema.deprecated == true;

    if (deprecated) {
        return constraints.length ? constraints.join(", ") + ". Deprecated." : "Deprecated.";
    } else {
        return constraints.length ? constraints.join(", ") : "-";
    }
}

export function toAnchor(nodePath: Path, rootSchema: TopLevelSchema): string {
  if( nodePath.length === 0) {
    return "root";
  }
    const resolvedPath = findTargetPath(nodePath, rootSchema, true)
    return pathToString(resolvedPath)
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, "");
}

export function escapeMarkdown(text: string | undefined | null): string {
    if (!text) return "-";
    return text
        .replace(/\\/g, '\\\\')     // Escape backslashes
        .replace(/([_*[\]()#+\-!`>])/g, '\\$1') // Escape Markdown symbols
        .replace(/</g, '&lt;')       // Escape angle brackets
        .replace(/>/g, '&gt;')       // Escape angle brackets
        .trim();
}

export function formatDocumentExample(data: any, dataFormat: string): string {
  const formatDef = formatRegistry.getFormat(dataFormat);
  return formatDef.dataConverter.stringify(data);
}