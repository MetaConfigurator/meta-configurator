import {toastService} from '@/utility/toastService';
import {extractAllInlinedSchemaElements} from "@/schema/schemaManipulationUtils";
import {getDataForMode} from "@/data/useDataLink";
import {SessionMode} from "@/store/sessionMode";

/**
 * Goes through the schema and extracts all sub-schema definitions into the $defs section.
 */
export async function extractInlinedSchemaDefinitions(): Promise<void> {
  const extractedElementCount = extractAllInlinedSchemaElements(getDataForMode(SessionMode.SchemaEditor), false, true)

  if (toastService) {
    toastService.add({
      severity: 'info',
      summary: 'Info',
      detail: `"Extracted ${extractedElementCount}" inlined schema elements into the $defs section.`,
      life: 5000,
    });
  }
}
