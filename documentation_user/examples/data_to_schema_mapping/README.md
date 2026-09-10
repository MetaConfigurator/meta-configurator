# Data to Schema Mapping

This feature converts the data in the **Data Editor** so that it matches the schema in the **Schema Editor**, with the help of an LLM.
Typical use: you imported data in some foreign structure and want it in the shape your target schema prescribes.

Open it in the **Data** tab via **`Utility...` → `Transform Data to match the Schema...`** (dialog *Convert Data to Target Schema*).
Data and a target schema have to be loaded; **Additional Mapping Hints** let you steer the mapping in natural language (e.g. *"rename fields, format dates"*).

The AI connection is configured in the same dialog, in the *API Key and AI Settings* panel.
By default a free public relay is used, so no API key is required; see [AI Assistance](../ai_assistance) for details.

## Mapping Methods

| Method | What is sent to the LLM | Result |
| --- | --- | --- |
| **Generate Mapping Function based on source data and target schema** | your data and the target schema | a reusable mapping function |
| **Generate Mapping Function based on inferred source schema and target schema** | a locally inferred schema of your data and the target schema | a reusable mapping function |
| **Direct AI Mapping** | your data and the target schema | the transformed data itself |

A **mapping function** is the better choice in most cases: you can read, correct and re-run it, it is deterministic, and it can be applied to further documents of the same kind.
**Direct AI Mapping** produces no reusable artifact and applies the LLM answer directly, which is convenient for a one-off conversion.

Use the **inferred source schema** variant for large or repetitive data: instead of the data itself, only its structure is sent.
This keeps the request small and avoids leaking data values into the prompt.
The *Source Schema Inference Options* panel refines that inferred schema before it is sent — examples, enum detection and additional-property detection are enabled by default, so the LLM still sees representative values.
These are the same steps described in [Schema Inference and Refinement](../schema_inference_and_refinement).

## Mapping Language

For the two mapping-function methods you choose the language:

- **JSONata**: a declarative query and transformation language. Expressive and compact, but complex inputs can yield mappings that need manual correction.
- **JavaScript**: runs in a Web Worker, off the main thread and without DOM access, with common network, import and storage calls rejected. This keeps accidents in check rather than sandboxing untrusted code, so only run code you would run yourself.

## Workflow

1. Click **Generate Suggestion**. The generated mapping appears in the editor and is validated against your data while you type.
2. Review and adjust it. If the mapping fails, the button becomes **Regenerate Suggestion for Previous Error**, which sends the failing mapping and the error message back to the LLM.
3. Click **Perform Mapping** to apply it to the data in the Data Editor.

With *Direct AI Mapping* there is a single button, **Execute AI Mapping**, which transforms the data in one step.

## Related Guides

- [Data Import](../data_import) — get data into MetaConfigurator, including an AI-assisted import that can map to the schema during import
- [Schema Inference and Refinement](../schema_inference_and_refinement) — build the target schema, or refine the inferred source schema
- [AI Assistance](../ai_assistance) — configure the AI connection
