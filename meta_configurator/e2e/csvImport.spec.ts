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
    uploadCsvFileAndCheckProgress,
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

test('CSV file upload progresses reliably for 15 consecutive attempts in the same session without reload', async ({page}) => {
    test.setTimeout(60000);
    await openApp(page, 'settings_testpanel.json');

    for (let attempt = 1; attempt <= 15; attempt++) {
        await test.step(`csv upload attempt ${attempt}`, async () => {
            await openCsvImportDialog(page);
            try {
                await uploadCsvFileAndCheckProgress(page, 'data_people.csv', 4000);
            } catch (error) {
                throw new Error(`CSV upload attempt ${attempt} got stuck before parsing completed`, {
                    cause: error instanceof Error ? error : undefined,
                });
            }
            await submitCsvImport(page);
        });
    }
});
