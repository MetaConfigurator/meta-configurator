# Shared Test Helpers

This folder contains shared Playwright test helpers used by:

- [MetaConfigurator E2E tests](../../meta_configurator/e2e/README.md)
- [Relay tests](../../relay/tests/)

The goal is to keep browser test helper code in one place while allowing the
main MetaConfigurator suite and the relay-specific suite to run separately.
