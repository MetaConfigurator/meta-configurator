# Data Import

All import entries live in the **Data** tab of the top menu bar, under **`Open / Import Data...`**.

## Open JSON or YAML Data

**`Open JSON/YAML Data`** loads a file from your hard drive directly into the Data Editor, without conversion, backend or AI.
This is the fastest path whenever your data already is JSON or YAML.
If a schema is loaded, the data is validated against it immediately; otherwise you can derive one, see [Schema Inference and Refinement](../schema_inference_and_refinement).

## Import Turtle (RDF)

**`Import Turtle Data`** reads an RDF Turtle file and converts it to JSON-LD.
The current data is overwritten, the schema stays unchanged.
For editing triples, ontology assistance and SPARQL queries, see the [RDF Panel](../rdf) guide.

## Import XML

**`Import XML Data`** converts an XML document to JSON.
Since XML has concepts JSON does not, the dialog exposes the conversion conventions: attribute prefix, the property names for text nodes, CDATA and comments, value trimming, parsing of tag and attribute values, and namespace prefix removal.
The defaults are a good starting point; adjust them if the resulting JSON does not have the expected shape.

## Import CSV

**`Import CSV Data`** turns a table into JSON.
Select the document, its delimiter and its decimal separator.
The table can be imported as an independent table (an array of row objects) or expanded into existing data through a lookup table.
A worked end-to-end example is in the [MOF Synthesis Example](../mof_synthesis).

## Advanced Data Import

**`Advanced Data Import...`** is the general entry point for everything else.
It combines backend format detection, AI-assisted conversion and an editable JavaScript transformation step.

### Recognized formats

The selected file is sent to the *format processing* backend service, which detects the format and tries to parse it; the dialog reports the result.
Recognized are **JSON**, **JSON Lines / NDJSON**, **YAML**, **XML**, **CSV**, **TSV**, **TOML**, **INI**, **dotenv**, **Java properties**, **Markdown tables**, **Turtle / RDF** (converted to compacted JSON-LD), **CIF / mmCIF** and other **STAR-family** formats.
The endpoint is configurable in the settings (`backend → formatProcessingUrl`); a public instance is used by default.
If the service is unreachable, the dialog says so and disables the modes that depend on it.

### Schema handling

- **Automatic schema handling**: a schema is inferred from the imported data and loaded into the Schema Editor (JSON-LD is deliberately left schema-free). See [Schema Inference and Refinement](../schema_inference_and_refinement).
- **Validate against current schema**: the current schema is kept and the result is validated against it. On a mismatch you get a warning and can confirm by clicking the import button again.

### Import modes

Which modes are available depends on the file, the schema handling and whether AI is configured.

| Mode | What it does |
| --- | --- |
| **Use parsed result directly** | Imports the JSON the backend parser produced, unchanged. No LLM call. |
| **Generate JavaScript mapping from raw input** | The LLM writes a `transform(input)` function converting the raw file content to JSON. |
| **Map parsed data to schema with AI** | The LLM writes a function mapping the parsed JSON onto the current schema. |
| **Full AI import** | The document is sent to the LLM, which returns the finished JSON. |

Prefer the cheapest mode that works: direct parse when the parsed shape already fits, a generated function when the shape has to change (reviewable and reusable), full AI import only when the input needs real interpretation.

### The generated JavaScript

For the JavaScript-based modes an editor shows the generated function, which you can edit or write yourself — this is also how to use the dialog without AI.
**Additional Hints** steer the generation in natural language (e.g. *"map temperature and unit fields"*).
Before importing, the function is smoke-tested on a sample; on failure the button becomes **Regenerate Suggestion for Previous Error**, which sends the failing code and the error back to the LLM.

> The function runs in a Web Worker, off the main thread and without DOM access, and common network, import and storage calls are rejected. This keeps accidents in check rather than sandboxing untrusted code, so only run code you would run yourself.

The AI-assisted modes need an AI endpoint. By default a free public relay is used, so no API key is required; see [AI Assistance](../ai_assistance) for the connection modes.
To convert data you already have so that it matches a target schema, see [Data to Schema Mapping](../data_to_schema_mapping).
