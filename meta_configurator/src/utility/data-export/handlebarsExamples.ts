export const HANDLEBARS_INPUT_EXAMPLE =
  '{\n' +
  '  "zoo": [\n' +
  '    {\n' +
  '      "name": "Central Zoo",\n' +
  '      "location": "City A",\n' +
  '      "manager": {\n' +
  '        "firstName": "Alice",\n' +
  '        "lastName": "Smith"\n' +
  '      },\n' +
  '      "animals": [\n' +
  '        { "species": "Lion", "count": 3, "diet": "Carnivore" },\n' +
  '        { "species": "Elephant", "count": 2, "diet": "Herbivore" }\n' +
  '      ]\n' +
  '    },\n' +
  '    {\n' +
  '      "name": "Safari Park",\n' +
  '      "location": "City B",\n' +
  '      "manager": null,\n' +
  '      "animals": [\n' +
  '        { "species": "Giraffe", "count": 5, "diet": "Herbivore" },\n' +
  '        { "species": "Zebra", "count": 10, "diet": "Herbivore" }\n' +
  '      ]\n' +
  '    }\n' +
  '  ]\n' +
  '}\n';

export const HANDLEBARS_INPUT_SCHEMA =
  '{\n' +
  '  "type": "object",\n' +
  '  "properties": {\n' +
  '    "zoo": {\n' +
  '      "type": "array",\n' +
  '      "items": {\n' +
  '        "type": "object",\n' +
  '        "properties": {\n' +
  '          "name": { "type": "string" },\n' +
  '          "location": { "type": "string" },\n' +
  '          "manager": {\n' +
  '            "type": ["object", "null"],\n' +
  '            "properties": {\n' +
  '              "firstName": { "type": "string" },\n' +
  '              "lastName": { "type": "string" }\n' +
  '            }\n' +
  '          },\n' +
  '          "animals": {\n' +
  '            "type": "array",\n' +
  '            "items": {\n' +
  '              "type": "object",\n' +
  '              "properties": {\n' +
  '                "species": { "type": "string" },\n' +
  '                "count": { "type": "integer" },\n' +
  '                "diet": { "type": "string" }\n' +
  '              },\n' +
  '              "required": ["species", "count"]\n' +
  '            }\n' +
  '          }\n' +
  '        },\n' +
  '        "required": ["name", "location", "animals"]\n' +
  '      }\n' +
  '    }\n' +
  '  },\n' +
  '  "required": ["zoo"]\n' +
  '}\n';

export const HANDLEBARS_OUTPUT_EXAMPLE =
  'Zoo: Central Zoo (City A)\n' +
  'Manager: Alice Smith\n' +
  'Animals:\n' +
  '  - Lion: 3 (Carnivore)\n' +
  '  - Elephant: 2 (Herbivore)\n' +
  'Total animals: 5\n' +
  '\n' +
  'Zoo: Safari Park (City B)\n' +
  'Manager: Unknown Manager\n' +
  'Animals:\n' +
  '  - Giraffe: 5 (Herbivore)\n' +
  '  - Zebra: 10 (Herbivore)\n' +
  'Total animals: 15\n' +
  'Warning: This zoo has many animals!\n';

export const HANDLEBARS_MAPPING_EXAMPLE =
  '{{#each zoo}}\n' +
  'Zoo: {{name}} ({{location}})\n' +
  'Manager: {{#exists manager}}{{manager.firstName}} {{manager.lastName}}{{else}}Unknown Manager{{/exists}}\n' +
  'Animals:\n' +
  '{{#each animals}}\n' +
  '  - {{species}}: {{count}} ({{diet}})\n' +
  '{{/each}}\n' +
  '{{!-- Calculate total animal count --}}\n' +
  '{{#let total=0}}{{#each animals}}{{#set ../total (add ../total count)}}{{/each}}{{/let}}\n' +
  "Total animals: {{sum animals 'count'}}\n" +
  '\n' +
  "{{#compare (sum animals 'count') '>' 5}}\n" +
  'Warning: This zoo has many animals!\n' +
  '{{/compare}}\n' +
  '\n' +
  '{{!-- Separator between zoos --}}\n' +
  '{{#unless @last}}\n' +
  '---\n' +
  '{{/unless}}\n' +
  '{{/each}}\n';
