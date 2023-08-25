import {watch} from 'vue';
import {useDataStore} from '@/store/dataStore';
import {useSettingsStore} from '@/store/settingsStore';
import VueCookies from 'vue-cookies'; // Import VueCookies and VueCookiesType

const cookiesHandler = {
  initializeFromCookies: () => {
    console.log('Initializing from cookies...');

    const schemaDataCookie = VueCookies.get('schemaData');
    const settingsDataCookie = VueCookies.get('settingsData');
    const fileDataCookie = VueCookies.get('fileData');

    if (schemaDataCookie && schemaDataCookie !== 'undefined') {
      useDataStore().schemaData = JSON.parse(schemaDataCookie);
    }
    if (fileDataCookie && fileDataCookie !== 'undefined') {
      useDataStore().fileData = JSON.parse(fileDataCookie);
    }
    if (settingsDataCookie && settingsDataCookie !== 'undefined') {
      useSettingsStore().settingsData = JSON.parse(settingsDataCookie);
    }

    // Watch for changes in schemaData, settingsData, and fileData and update cookies
    watch(
      [
        () => useDataStore().schemaData,
        () => useSettingsStore().settingsData,
        () => useDataStore().fileData,
      ],
      ([newSchemaData, newSettingsData, newFileData]) => {
        VueCookies.set('schemaData', JSON.stringify(newSchemaData));
        VueCookies.set('settingsData', JSON.stringify(newSettingsData));
        VueCookies.set('fileData', JSON.stringify(newFileData));
        console.log('Cookies updated:', newSchemaData, newSettingsData, newFileData);
      }
    );
  },
};

export default cookiesHandler;
