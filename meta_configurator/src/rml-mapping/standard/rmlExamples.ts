export const RML_INPUT_EXAMPLE =
  '{\n' +
  '  "person": {\n' +
  '    "firstName": "Alice",\n' +
  '    "lastName": "Smith",\n' +
  '    "age": 34,\n' +
  '    "gender": "F",\n' +
  '    "contact": {\n' +
  '      "email": "alice@example.com",\n' +
  '      "phone": "123-456-7890"\n' +
  '    },\n' +
  '    "address": {\n' +
  '      "city": "Berlin",\n' +
  '      "postalCode": "10115"\n' +
  '    },\n' +
  '    "roles": [1, 2]\n' +
  '  },\n' +
  '  "experiments": [\n' +
  '    {\n' +
  '      "id": "exp1",\n' +
  '      "temperature": 273,\n' +
  '      "reagentType": 1,\n' +
  '      "chemicals": [\n' +
  '        { "name": "H2O", "amount": 10 },\n' +
  '        { "name": "NaCl", "amount": 5 }\n' +
  '      ]\n' +
  '    },\n' +
  '    {\n' +
  '      "id": "exp2",\n' +
  '      "temperature": 300,\n' +
  '      "reagentType": 2,\n' +
  '      "chemicals": [\n' +
  '        { "name": "C6H12O6", "amount": 15 },\n' +
  '        { "name": "NaOH", "amount": 3 }\n' +
  '      ]\n' +
  '    }\n' +
  '  ]\n' +
  '}';

export const RML_INPUT_EXAMPLE_SCHEMA =
  '{\n' +
  '  "$schema": "https://json-schema.org/draft/2020-12/schema",\n' +
  '  "$id": "https://example.com/schema/experiment-input.json",\n' +
  '  "title": "ExperimentInput",\n' +
  '  "type": "object",\n' +
  '  "properties": {\n' +
  '    "person": {\n' +
  '      "type": "object",\n' +
  '      "properties": {\n' +
  '        "firstName": {\n' +
  '          "type": "string"\n' +
  '        },\n' +
  '        "lastName": {\n' +
  '          "type": "string"\n' +
  '        },\n' +
  '        "age": {\n' +
  '          "type": "integer",\n' +
  '          "minimum": 0\n' +
  '        },\n' +
  '        "gender": {\n' +
  '          "type": "string",\n' +
  '          "enum": ["F", "M"]\n' +
  '        },\n' +
  '        "email": {\n' +
  '          "type": "string",\n' +
  '          "format": "email"\n' +
  '        },\n' +
  '        "address": {\n' +
  '          "type": "object",\n' +
  '          "properties": {\n' +
  '            "city": {\n' +
  '              "type": "string"\n' +
  '            },\n' +
  '            "postalCode": {\n' +
  '              "type": "string"\n' +
  '            }\n' +
  '          },\n' +
  '          "required": ["city", "postalCode"]\n' +
  '        },\n' +
  '        "roles": {\n' +
  '          "type": "array",\n' +
  '          "items": {\n' +
  '            "type": "string",\n' +
  '            "enum": ["editor", "reviewer", "admin"]\n' +
  '          }\n' +
  '        }\n' +
  '      },\n' +
  '      "required": ["firstName", "lastName", "age", "gender", "email", "address", "roles"]\n' +
  '    },\n' +
  '    "experiments": {\n' +
  '      "type": "array",\n' +
  '      "items": {\n' +
  '        "type": "object",\n' +
  '        "properties": {\n' +
  '          "id": {\n' +
  '            "type": "string"\n' +
  '          },\n' +
  '          "temperature": {\n' +
  '            "type": "number"\n' +
  '          },\n' +
  '          "reagentType": {\n' +
  '            "type": "integer",\n' +
  '            "enum": [1, 2, 3]\n' +
  '          },\n' +
  '          "chemicals": {\n' +
  '            "type": "array",\n' +
  '            "items": {\n' +
  '              "type": "object",\n' +
  '              "properties": {\n' +
  '                "name": {\n' +
  '                  "type": "string"\n' +
  '                },\n' +
  '                "amount": {\n' +
  '                  "type": "number"\n' +
  '                }\n' +
  '              },\n' +
  '              "required": ["name", "amount"]\n' +
  '            }\n' +
  '          }\n' +
  '        },\n' +
  '        "required": ["id", "temperature", "reagentType", "chemicals"]\n' +
  '      }\n' +
  '    }\n' +
  '  },\n' +
  '  "required": ["person", "experiments"]\n' +
  '}';

export const RML_OUTPUT_EXAMPLE =
'@prefix rr: <http://www.w3.org/ns/r2rml#> .\n' +
'@prefix rml: <http://semweb.mmlab.be/ns/rml#> .\n' +
'@prefix ql: <http://semweb.mmlab.be/ns/ql#> .\n' +
'@prefix ex: <http://example.com/ns#> .\n' +
'@prefix schema: <https://schema.org/> .\n' +
'\n' +
'<#PersonMapping>\n' +
'  rml:logicalSource [\n' +
'    rml:source "Data.json" ;\n' +
'    rml:referenceFormulation ql:JSONPath ;\n' +
'    rml:iterator "$.person"\n' +
'  ] ;\n' +
'\n' +
'  rr:subjectMap [\n' +
'    rr:template "http://example.com/person/{firstName}_{lastName}" ;\n' +
'    rr:class schema:Person\n' +
'  ] ;\n' +
'\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate schema:givenName ;\n' +
'    rr:objectMap [ rml:reference "firstName" ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate schema:familyName ;\n' +
'    rr:objectMap [ rml:reference "lastName" ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate schema:age ;\n' +
'    rr:objectMap [ rml:reference "age" ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate schema:gender ;\n' +
'    rr:objectMap [ rml:reference "gender" ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate schema:email ;\n' +
'    rr:objectMap [ rml:reference "contact.email" ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate schema:telephone ;\n' +
'    rr:objectMap [ rml:reference "contact.phone" ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate schema:address ;\n' +
'    rr:objectMap [ rr:parentTriplesMap <#AddressMapping> ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate ex:hasRole ;\n' +
'    rr:objectMap [ rml:reference "roles[*]" ]\n' +
'  ] .\n' +
'\n' +
'<#AddressMapping>\n' +
'  rml:logicalSource [\n' +
'    rml:source "Data.json" ;\n' +
'    rml:referenceFormulation ql:JSONPath ;\n' +
'    rml:iterator "$.person.address"\n' +
'  ] ;\n' +
'\n' +
'  rr:subjectMap [\n' +
'    rr:template "http://example.com/address/{city}_{postalCode}" ;\n' +
'    rr:class schema:PostalAddress\n' +
'  ] ;\n' +
'\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate schema:addressLocality ;\n' +
'    rr:objectMap [ rml:reference "city" ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate schema:postalCode ;\n' +
'    rr:objectMap [ rml:reference "postalCode" ]\n' +
'  ] .\n' +
'\n' +
'<#ExperimentMapping>\n' +
'  rml:logicalSource [\n' +
'    rml:source "Data.json" ;\n' +
'    rml:referenceFormulation ql:JSONPath ;\n' +
'    rml:iterator "$.experiments[*]"\n' +
'  ] ;\n' +
'\n' +
'  rr:subjectMap [\n' +
'    rr:template "http://example.com/experiment/{id}" ;\n' +
'    rr:class ex:Experiment\n' +
'  ] ;\n' +
'\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate ex:temperature ;\n' +
'    rr:objectMap [ rml:reference "temperature" ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate ex:reagentType ;\n' +
'    rr:objectMap [ rml:reference "reagentType" ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate ex:hasChemical ;\n' +
'    rr:objectMap [ rr:parentTriplesMap <#ChemicalMapping> ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate ex:performedBy ;\n' +
'    rr:objectMap [ rr:parentTriplesMap <#PersonMapping> ]\n' +
'  ] .\n' +
'\n' +
'<#ChemicalMapping>\n' +
'  rml:logicalSource [\n' +
'    rml:source "Data.json" ;\n' +
'    rml:referenceFormulation ql:JSONPath ;\n' +
'    rml:iterator "$.experiments[*].chemicals[*]"\n' +
'  ] ;\n' +
'\n' +
'  rr:subjectMap [\n' +
'    rr:template "http://example.com/chemical/{name}" ;\n' +
'    rr:class ex:Chemical\n' +
'  ] ;\n' +
'\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate ex:chemicalName ;\n' +
'    rr:objectMap [ rml:reference "name" ]\n' +
'  ] ;\n' +
'  rr:predicateObjectMap [\n' +
'    rr:predicate ex:amount ;\n' +
'    rr:objectMap [ rml:reference "amount" ]\n' +
'  ] .\n';
