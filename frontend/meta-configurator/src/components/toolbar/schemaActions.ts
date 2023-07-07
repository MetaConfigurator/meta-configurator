// schemaActions.ts

import { combinedSchema } from "@/data/CombinedSchema";
import type { MenuItemCommandEvent } from "primevue/menuitem";

export function handleChooseSchema(event: MenuItemCommandEvent): void {
  const selectedSchemaKey = event.item.key;
  const selectedSchema = combinedSchema.find((schema) => schema.key === selectedSchemaKey);

  if (selectedSchema) {
    // Perform actions based on the selected schema
    switch (selectedSchema.key) {
      case 'default':
        // Handle selection of the Default Schema
        // Example: Open the Default Schema editor
        console.log('Selected Default Schema');
        break;
      case 'animal':
        // Handle selection of the Animal Schema
        // Example: Open the Animal Schema editor
        console.log('Selected Animal Schema');
        break;
      // Add more cases for other schema options if needed
    }
  }
}
