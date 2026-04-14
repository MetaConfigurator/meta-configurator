# MetaConfigurator Semantic Workflow User Guide

This guide explains a practical, end-user RDF workflow in MetaConfigurator.  
You will move from plain JSON to a queryable and visual knowledge graph:

1. Start from structured JSON.
2. Convert JSON to JSON-LD with RML.
3. Review and edit triples in the RDF panel.
4. Use ontology assistance when choosing IRIs.
5. Run SPARQL queries (optionally with AI drafting).
6. Explore and refine the graph visually.

---

## Folder Contents

- `images/`: screenshots used in this guide.
- `samples/`: reusable examples (`.json`, `.jsonld`, `.ttl`, `.sparql`).

Main samples:

- [`samples/simulation-data.json`](./samples/simulation-data.json)
- [`samples/simulation-mapping.rml.ttl`](./samples/simulation-mapping.rml.ttl)
- [`samples/simulation-data.jsonld`](./samples/simulation-data.jsonld)
- [`samples/simulation-query.sparql`](./samples/simulation-query.sparql)
- [`samples/mof-s1-data.json`](./samples/mof-s1-data.json)
- [`samples/mof-mapping.rml.ttl`](./samples/mof-mapping.rml.ttl)
- [`samples/mof-s1-data.jsonld`](./samples/mof-s1-data.jsonld)
- [`samples/mof-prep-query.sparql`](./samples/mof-prep-query.sparql)

---

## 1) Start with JSON Data

Begin with your normal structured JSON (simulation data, lab records, process logs, etc.).

- Simulation example: [`samples/simulation-data.json`](./samples/simulation-data.json)
- MOF example: [`samples/mof-s1-data.json`](./samples/mof-s1-data.json)

![RDF panel with JSON input](./images/MC-RDF-JSON.png)

What this means:

- Your data is already valid JSON.
- It is not yet ready for semantic querying until converted to JSON-LD.

If the RDF panel warns that data is not in expected JSON-LD format, use:

- **JSON to JSON-LD** (RML conversion), or
- **Turtle import** if you already have RDF in Turtle.

---

## 2) Convert JSON to JSON-LD with RML

Use the RML mapping dialog to define how JSON fields become RDF entities and relationships.

You can:

- paste an existing RML mapping, or
- generate a draft mapping with AI and then adjust it.

![RML mapping dialog](./images/MC-RDF-RML-1.png)

Sample mappings:

- Simulation mapping: [`samples/simulation-mapping.rml.ttl`](./samples/simulation-mapping.rml.ttl)
- MOF mapping: [`samples/mof-mapping.rml.ttl`](./samples/mof-mapping.rml.ttl)

Practical recommendation:

- Treat AI-generated mapping as a first draft.
- Confirm identifiers, classes, and property choices before applying.

---

## 3) Inspect and Edit JSON-LD / RDF Triples

After conversion, the RDF panel gives two synchronized tabs:

- **Context**: manage prefix and context definitions.
- **Triples**: manage subject-predicate-object statements.

![Triples view](./images/MC-RDF-JSON-LD-2.png)
![Triple edit modal](./images/MC-RDF-Modal.png)

Typical tasks in the **Triples** tab:

- Add, edit, and delete triples.
- Search and filter across subject, predicate, object.
- Export graph data as Turtle, N-Triples, or RDF/XML.
- Open SPARQL and visualization directly from the same toolbar.

Useful behavior to know:

- Selecting a triple helps you locate the corresponding JSON-LD path.
- You can edit by selecting a row and using **Edit** (or double-clicking a row).
- Literal objects can include datatype selection; custom datatype is also supported.

Sample JSON-LD outputs:

- Simulation: [`samples/simulation-data.jsonld`](./samples/simulation-data.jsonld)
- MOF S-1: [`samples/mof-s1-data.jsonld`](./samples/mof-s1-data.jsonld)

---

## 4) Use Ontology-Assisted IRI Selection

When editing predicates or object IRIs, open **Ontology Explorer** for guided selection.

![Ontology explorer](./images/MC-RDF-Ontology-1.png)
![Ontology explorer SPARQL](./images/MC-RDF-Ontology-3.png)

What you can do there:

- Select a prefix from your current `@context`.
- Download ontology content by URL or upload an ontology file.
- Reuse cached ontology data, refresh it, or delete it.
- Browse `DatatypeProperty`, `ObjectProperty`, and `Class` terms.
- Use ontology-side SPARQL to discover additional terms quickly.
- Pick a term and insert it back into the triple editor.

This is especially helpful for consistent use of units, classes, and shared vocabularies.

---

## 5) Query with SPARQL (Optional AI Drafting)

Open SPARQL from the triples toolbar to validate and analyze your graph.

![SPARQL AI generation](./images/MC-RDF-SPARQL-1.png)
![SPARQL result table](./images/MC-RDF-SPARQL-2.png)
![MOF SPARQL result](./images/MC-RDF-SPARQL-3.png)

In this dialog you can:

- Write or paste SPARQL manually.
- Ask AI to draft a query from a natural-language prompt.
- Run query and inspect results in a filterable table.
- Export results (for example CSV for tabular results).

Visualization note:

- You can enable query-result visualization mode.
- This mode expects a graph-shaped query result (CONSTRUCT-style output).

Sample queries:

- Simulation: [`samples/simulation-query.sparql`](./samples/simulation-query.sparql)
- MOF prep-step: [`samples/mof-prep-query.sparql`](./samples/mof-prep-query.sparql)

---

## 6) Visualize and Refine the Knowledge Graph

Use **Visualize** to inspect relationships as a graph.

![Simulation KG](./images/MC-RDF-KG-1.png)
![MOF KG](./images/MC-RDF-KG-2.png)

Two visualization modes:

- From RDF Triples tab: **editable graph** (rename node, add/delete properties, add/delete nodes).
- From SPARQL visualizer tab: **read-only graph** for query result exploration.

Useful tools in graph view:

- Node search and quick focus.
- Zoom controls and fit-to-view.
- Optional layout animation.
- Export graph image.
- Undo/redo for edits.

For very large graphs, the app warns before rendering and lets you continue or cancel.

---

## Recommended End-to-End Workflow

1. Validate raw JSON in Data/Schema views.
2. Convert JSON to JSON-LD using RML (manual or AI draft).
3. Confirm context prefixes and main entities in RDF panel.
4. Clean up triples (missing links, wrong predicates, units, datatypes).
5. Use Ontology Explorer for consistent vocabulary choices.
6. Run SPARQL checks for your key domain questions.
7. Inspect the graph visually and refine remaining issues.
8. Export RDF or query results for downstream use.

---

## Practical Quality Checks

- Ensure important entities use stable and reusable identifiers.
- Keep prefix usage consistent between `@context`, triples, and queries.
- Use ontology IRIs for units/classes/properties instead of only plain text.
- Review AI-generated mapping/query drafts before trusting them.
- If the triple list is shortened due to display limits, increase RDF display limits in settings before final review.
