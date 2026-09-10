# Schema Inference and Refinement

MetaConfigurator can derive a JSON Schema from existing data (*inference*) and improve a schema using the evidence in that data (*refinement*).
Both run locally in the browser: no AI endpoint and no API key are needed.

## Infer a Schema from Data

In the **Schema Editor** tab, open **`New Schema / Infer Schema...` → `Infer Schema from Data...`**.

Choose the input source:

- **Current data**: the document in the Data Editor.
- **Upload files**: one or more JSON or YAML files. With several files, one schema is built that satisfies all of them, so the more representative instances you provide, the more accurate it becomes. A single uploaded file is also loaded into the Data Editor.

Optionally enable refinement steps (see below), then click **Infer Schema**. The result replaces the schema in the Schema Editor.

> **Note:** Very large documents are trimmed before inference. See the settings under `performance → maxDocumentSizeForSchemaInference`.

## Refine an Existing Schema

In the **Schema Editor** tab, open **`Utility...` → `Refine Schema based on Data...`**.

The steps improve the schema currently in the Schema Editor, using the data in the Data Editor as evidence, so data has to be loaded.
Only the data-dependent steps are offered here; the two purely structural ones are separate entries in the same `Utility...` menu.

## The Refinement Steps

Enabling a step reveals its parameters, pre-filled with useful defaults.

- **Add Examples**: writes real values from the data into the `examples` of string, number and boolean fields. Parameters: max examples per field (4), only unique values, ignore `null`.
- **Detect Enums**: turns fields with a small repeating value set into a schema `enum`. Parameters: minimum observed values (4), minimum duplicate ratio (0.2), maximum unique values (20), allowed types.
- **Detect Additional Properties**: recognizes map-like objects whose *keys* are data (for example one entry per measurement ID) and rewrites them to `additionalProperties` with one shared value schema. Parameters: minimum number of properties (3), similarity threshold (0.8), minimum matching properties (2), require same value type.
- **Extract Sub-schemas into References**: moves inlined object and enum sub-schemas into `$defs` and replaces them with `$ref`.
- **Sort Schema Properties Alphabetically**: sorts schema keys recursively, including `properties` and `$defs`.

When several steps are selected, they are applied in this order: detect additional properties, add examples, detect enums, extract references, sort.

## Where Else it is Used

The same inference and refinement steps are reused by other features:

- [Data Import](../data_import): *Automatic schema handling* infers a schema for the imported data.
- [Data to Schema Mapping](../data_to_schema_mapping): the mapping method *based on inferred source schema* sends an inferred and refined schema of your data to the LLM instead of the data itself.
