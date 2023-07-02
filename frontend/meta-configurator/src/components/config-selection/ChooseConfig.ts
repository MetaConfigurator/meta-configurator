
import { useDataStore } from '@/store/dataStore';

export function chooseConfigFromFile(): {
    openFileDialog: () => void;
    handleFileSelect: (event: Event) => void;
} {
    const openFileDialog = (): void => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/json';
        fileInput.addEventListener('change', handleFileSelect);
        fileInput.click();
    };

    const handleFileSelect = (event: Event): void => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const contents = e.target?.result as string;
                try {
                    const jsonData = JSON.parse(contents);
                    const dataStore = useDataStore();
                    dataStore.configData = jsonData; // Update the configData value in the store
                } catch (error) {
                    console.error('Error parsing JSON file:', error);
                }
            };
            reader.readAsText(file);
        }
    };

    return {
        openFileDialog,
        handleFileSelect,
    };
}
