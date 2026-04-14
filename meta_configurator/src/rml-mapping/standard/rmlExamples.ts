export const RML_INSTRUCTIONS = `You are an assistant that generates RML mappings in Turtle syntax that convert JSON input into RDF.

Follow the RML specification strictly and avoid generating invalid RML constructs.

General task:
Generate a valid RML mapping that transforms the given JSON input into RDF according to the target schema.

The output must contain ONLY valid Turtle mapping code and no explanations.

Input information that will be provided:
- Example JSON input
- Example RML mapping
- Real JSON input subset
- Optional user comments

Use the following conventions:

Logical source rules:
- Use 'rml:logicalSource'
- Set 'rml:source' to "Data.json"
- Use 'rml:referenceFormulation ql:JSONPath'
- Use appropriate JSONPath iterators (e.g. "$.items[*]" for arrays)

TriplesMap rules:
- Create one 'rr:TriplesMap' per repeating JSON structure (arrays or main objects).
- Each TriplesMap must contain exactly one 'rr:subjectMap'.
- Use 'rr:class' when assigning RDF types.

Object mapping rules:
In an 'rr:objectMap', use exactly ONE of the following:
- rml:reference
- rr:template
- rr:constant

Never combine them in the same objectMap.

Resource linking rules:
If the object refers to another mapped resource:
- Use 'rr:parentTriplesMap'
- Do NOT include 'rml:reference', 'rr:template', or 'rr:constant' in that objectMap.

IRI construction rules:
If an RDF subject or object must be an IRI constructed from a JSON value:
- Use 'rr:template'
- Declare 'rr:termType rr:IRI'
- ALWAYS construct full absolute IRIs (e.g. "http://example.com/resource/{id}")
- DO NOT use prefixed names inside templates (e.g. NEVER generate "ex:resource/{id}" or "local:value_{name}")
- DO NOT generate relative IRIs
- Ensure the template expands to a valid absolute IRI after substitution

Reference rules:
- 'rml:reference' values must be relative to the TriplesMap iterator
- Do NOT include "$." inside rml:reference values

Array mapping:
Arrays in JSON should normally be mapped using a separate TriplesMap
with its own 'rml:iterator'.

Prefix rules:
Use only the prefixes provided, and other prefixes which user may provide:
- rr:
- rml:
- ql:
- rdf:
- xsd:

IMPORTANT prefix constraint:
- Prefixed names (e.g. ex:Person) may ONLY be used for classes and predicates
- Prefixed names MUST NOT be used inside rr:template strings
- All IRIs generated via rr:template MUST be full absolute IRIs

Output format:
- Produce a single valid Turtle document.
- Declare prefixes at the top.
- Use compact Turtle syntax.
- Use inline blank nodes '[]' where appropriate.
- Do not output explanations or comments.
`;

export const RML_INPUT_EXAMPLE =
  '{\n' +
  '  "parameters": [\n' +
  '    {\n' +
  '      "name": "element_size",\n' +
  '      "value": 0.025,\n' +
  '      "unit": "M"\n' +
  '    }\n' +
  '  ],\n' +
  '  "metrics": [\n' +
  '    {\n' +
  '      "name": "max_von_mises_stress",\n' +
  '      "value": 299791507.5586333,\n' +
  '      "unit": "MegaPA"\n' +
  '    }\n' +
  '  ]\n' +
  '}';

export const RML_OUTPUT_EXAMPLE =
  '@prefix rr: <http://www.w3.org/ns/r2rml#> .\n' +
  '@prefix rml: <http://semweb.mmlab.be/ns/rml#> .\n' +
  '@prefix ql: <http://semweb.mmlab.be/ns/ql#> .\n' +
  '@prefix m4i: <http://w3id.org/nfdi4ing/metadata4ing#> .\n' +
  '@prefix schema: <https://schema.org/> .\n' +
  '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n' +
  '\n' +
  '<#RunFenicsSimulation>\n' +
  '  rml:logicalSource [\n' +
  '    rml:source "Data.json" ;\n' +
  '    rml:referenceFormulation ql:JSONPath ;\n' +
  '    rml:iterator "$"\n' +
  '  ] ;\n' +
  '\n' +
  '  rr:subjectMap [\n' +
  '    rr:template "https://www.example.org/run_fenics_simulation" ;\n' +
  '    rr:class m4i:Method\n' +
  '  ] ;\n' +
  '\n' +
  '  rr:predicateObjectMap [\n' +
  '    rr:predicate m4i:hasParameter ;\n' +
  '    rr:objectMap [ rr:parentTriplesMap <#ParameterMapping> ]\n' +
  '  ] ;\n' +
  '\n' +
  '  rr:predicateObjectMap [\n' +
  '    rr:predicate m4i:investigates ;\n' +
  '    rr:objectMap [ rr:parentTriplesMap <#MetricMapping> ]\n' +
  '  ] .\n' +
  '\n' +
  '<#ParameterMapping>\n' +
  '  rml:logicalSource [\n' +
  '    rml:source "Data.json" ;\n' +
  '    rml:referenceFormulation ql:JSONPath ;\n' +
  '    rml:iterator "$.parameters[*]"\n' +
  '  ] ;\n' +
  '\n' +
  '  rr:subjectMap [\n' +
  '    rr:template "https://www.example.org/variable_{name}" ;\n' +
  '    rr:class schema:PropertyValue\n' +
  '  ] ;\n' +
  '\n' +
  '  rr:predicateObjectMap [\n' +
  '    rr:predicate rdfs:label ;\n' +
  '    rr:objectMap [ rml:reference "name" ]\n' +
  '  ] ;\n' +
  '  rr:predicateObjectMap [\n' +
  '    rr:predicate schema:value ;\n' +
  '    rr:objectMap [ rml:reference "value" ]\n' +
  '  ] ;\n' +
  '  rr:predicateObjectMap [\n' +
  '    rr:predicate schema:unitCode ;\n' +
  '    rr:objectMap [\n' +
  '      rr:template "http://qudt.org/vocab/unit/{unit}" ;\n' +
  '      rr:termType rr:IRI\n' +
  '    ]\n' +
  '  ] .\n' +
  '\n' +
  '<#MetricMapping>\n' +
  '  rml:logicalSource [\n' +
  '    rml:source "Data.json" ;\n' +
  '    rml:referenceFormulation ql:JSONPath ;\n' +
  '    rml:iterator "$.metrics[*]"\n' +
  '  ] ;\n' +
  '\n' +
  '  rr:subjectMap [\n' +
  '    rr:template "https://www.example.org/variable_{name}" ;\n' +
  '    rr:class schema:PropertyValue\n' +
  '  ] ;\n' +
  '\n' +
  '  rr:predicateObjectMap [\n' +
  '    rr:predicate rdfs:label ;\n' +
  '    rr:objectMap [ rml:reference "name" ]\n' +
  '  ] ;\n' +
  '  rr:predicateObjectMap [\n' +
  '    rr:predicate schema:value ;\n' +
  '    rr:objectMap [ rml:reference "value" ]\n' +
  '  ] ;\n' +
  '  rr:predicateObjectMap [\n' +
  '    rr:predicate schema:unitCode ;\n' +
  '    rr:objectMap [\n' +
  '      rr:template "http://qudt.org/vocab/unit/{unit}" ;\n' +
  '      rr:termType rr:IRI\n' +
  '    ]\n' +
  '  ] .\n';
