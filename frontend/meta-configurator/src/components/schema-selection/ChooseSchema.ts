import {schemaStore} from "@/store/schemaStore";
import { TopLevelJsonSchema } from '@/model/TopLevelJsonSchema';


export function chooseSchemaFromFile(): void {
    const inputElement = document.createElement('input');

    inputElement.type = 'file';
    inputElement.accept = '.json';

    inputElement.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                const contents = e.target?.result as string;
                try {
                    const selectedSchema = JSON.parse(contents);
                    schemaStore().schema = new TopLevelJsonSchema(selectedSchema);

                    console.log('Selected JSON schema:', selectedSchema);
                } catch (error) {
                    console.error('Error parsing JSON schema:', error);
                }
            };

            reader.readAsText(file);
        }
    };

    inputElement.click();
}
