# End to End (E2E) Testing

This directory contains the end-to-end (E2E) tests for the Meta Configurator, also known as UI tests.
These tests are designed to verify the functionality of the Meta Configurator by simulating user interactions with the UI.
The tests are written in TypeScript and utilize the [Playwright library](https://playwright.dev/) for browser automation.

# Running the Tests

MetaConfigurator needs to be installed.
Run the complete E2E test-suite using

```bash
npm run test:e2e
```

To run the tests with a browser visible, run:

```bash
npm run test:e2e:ui
```

Running these commands will first copy the required text-fixtures into the `public`folder and then execute all the E2E tests in the directory.

An individual test file can be executed using

```bash
npx playwright test --headed <test_file_name>.spec.ts
```

# Testing a Panel Type

Each Panel type (e.g., `textEditor`, `guiEditor`, `schemaDiagram`) can modify the internal state of MetaConfigurator.
It can access and read from the `data`, `schema`, `currentPath` and `currentSelectedElement` (among others) and also write to these properties.
The individual panels are hidden and de-coupled from each other.
We do not have to test the interaction between, for example, the `textEditor` and the `guiEditor` and any other specific combination of two panels.
Instead, we can test each panel type in isolation, together with the internal state of MetaConfigurator. 
To manipulate or access the internal state of MetaConfigurator, the `test` panel can be used, see [utilsTestPanel.ts](utilsTestPanel.ts) for more information.