# Testing

## Best Practices

Keep code decoupled and functions small and atomic. 
Always keep testability in mind.

## Unit Tests

If new functionality is developed, unit tests should be written for it.
We use the testing framework `vitest`.
Run all tests using `npm run test`.

Unit tests should test small blocks of the code, mainly individual functions.
A few parts of the code (e.g., the worker for validation) can not be executed by the unit tests.
Hence, every code that has a dependency to these untestable parts needs to specify mocks for these parts.
To avoid the need for writing many mocks, keep the coupling as small as possible and avoid importing more than needed.
If, for example, a file imports from the `main.ts` script, it indirectly imports everything which `main.ts` refers to, which is almost all of the project.
Therefore, when `main.ts` is imported, to write tests for your components you need to mock many components.
This should be avoided and instead the dependencies which you need should be extracted from the `main.ts` into a smaller, independent, file.

## E2E Tests

This project also has end-to-end tests which open MetaConfigurator in a browser and then simulate different clicks and keyboard inputs to test the full behavior of the app.
More details can be found in the [e2e test directory](../meta_configurator/e2e).