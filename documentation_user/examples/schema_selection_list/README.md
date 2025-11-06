# Schema Selection List

## Overview

You can provide one or more lists of pre-defined JSON schemas the user can load from in the tool settings file.
This is especially useful for organizations to give their teams quick access to their schemas.
The lists of schemas to show to the user can be configured in the settings, under the `schemaSelectionLists` key.
A list of schemas can be defined by a URL to a JSON file or by an inline array of schema definitions:

```json
  "schemaSelectionLists": [
    {
      "label": "Example Schemas",
      "schemas": [
        {
          "label": "Feature Testing Schema",
          "url": "https://github.com/MetaConfigurator/meta-configurator/blob/main/documentation_user/examples/schema_selection_list/example.schema.json"
        },
        {
          "label": "Strenda Schema",
          "url": "https://github.com/MetaConfigurator/meta-configurator/blob/main/documentation_user/examples/schema_selection_list/example.schema.json"
        },
        {
          "label": "EnzymeML Schema",
          "url": "https://github.com/MetaConfigurator/meta-configurator/blob/main/documentation_user/examples/schema_selection_list/enzymeMl.schema.json"
        },
        {
          "label": "Autonomous Vehicle Schema",
          "url": "https://github.com/MetaConfigurator/meta-configurator/blob/main/documentation_user/examples/schema_selection_list/autonomousVehicle.schema.json"
        }
      ]
    },
    {
      "label": "preCICE Schemas",
      "schemas": "https://github.com/MetaConfigurator/meta-configurator/blob/main/documentation_user/examples/schema_selection_list/preCICESchemas.json"
    }
  ]
```
