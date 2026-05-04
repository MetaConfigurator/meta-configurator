import {test, expect} from '@playwright/test';
import {openApp} from './utils';
import {tpGetData} from './utilsTestPanel';
import {
    expandImportOptions,
    openCsvImportDialog,
    setColumnPath,
    setCsvTablePath,
    submitCsvImport,
    uploadCsvFile,
} from './utilsCsvImport';
import {SessionMode} from '../src/store/sessionMode';

test('Import CSV as standalone table with default paths', async ({page}) => {
    await openApp(page, 'settings_testpanel.json');

    await openCsvImportDialog(page);
    await uploadCsvFile(page, 'data_people.csv');

    // submit without changing any options — default table path comes from the filename
    await submitCsvImport(page);

    // filename "data_people.csv" → stringToIdentifier strips underscores → key is "datapeople"
    const data = await tpGetData(page, SessionMode.DataEditor);
    expect(data).toHaveProperty('datapeople');
    expect(data.datapeople).toHaveLength(2);
    expect(data.datapeople[0]).toMatchObject({name: 'Alice', city: 'Berlin', role: 'Engineer'});
    expect(data.datapeople[1]).toMatchObject({name: 'Bob', city: 'Munich', role: 'Designer'});
});

test('Import CSV with custom table path and renamed column', async ({page}) => {
    await openApp(page, 'settings_testpanel.json');

    await openCsvImportDialog(page);
    await uploadCsvFile(page, 'data_people.csv');

    await expandImportOptions(page);
    await setCsvTablePath(page, 'people');
    await setColumnPath(page, 'city', 'location');

    await submitCsvImport(page);

    const data = await tpGetData(page, SessionMode.DataEditor);
    expect(data).toEqual({
        people: [
            {name: 'Alice', location: 'Berlin', role: 'Engineer'},
            {name: 'Bob', location: 'Munich', role: 'Designer'},
        ],
    });
});
