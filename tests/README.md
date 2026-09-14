# Testing

## Best Practices

Keep code decoupled and functions small and atomic.
Always keep testability in mind.

## Unit Tests

Use `vitest` for unit tests. Run them with `npm run test`.

Unit tests should cover small units of behavior, mainly individual functions.
Keep dependencies narrow so tests do not need large mock setups. If code depends
on hard-to-test runtime pieces, extract smaller testable units instead of
pulling broad entry points into the test.

## E2E Tests

Browser E2E tests are split by responsibility:

- Main MetaConfigurator E2E tests: [meta_configurator/e2e](../meta_configurator/e2e)
- Relay-specific browser E2E test: [relay/tests](../backend/relay/tests)
- Shared Playwright helpers used by both: [tests/shared](shared)

Run the main browser E2E suite with `npm run test:e2e`.
Run the relay browser E2E suite with `npm run test:e2e:relay`.

The relay also has Python unit tests and Docker smoke tests under
[relay/tests](../backend/relay/tests).
