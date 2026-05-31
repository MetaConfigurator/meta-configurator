# Changelog

All notable changes to MetaConfigurator will be documented in this file.
This changelog begins with version 2.1.0, the release from which semantic versioning was formally adopted.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.6.0] - 2026-05-31

### Added

- Add `nullable` checkbox in the schema diagram to make it easier to mark fields as nullable without having to edit the raw JSON schema
- Add a relay backend service which can be used to proxy requests to external APIs, e.g. for AI-assisted features, without exposing the API key in the frontend
- Host a relay backend with an API key configured to Helmholtz Blablador to enable AI-assisted features in the public deployment without users needing to configure their own API key (it is still possible to configure a custom endpoint and API key in the frontend or self-host a relay backend)
- Add custom UI component in GUI Editor for fields with a `date` format, showing a date picker instead of a regular text input
- Add new function for sorting all properties in a schema alphabetically (as one time use utility in schema editor and as a sorting option in GUI editor)
- Add custom UI component for references in GUI editor, which suggests all existing definitions in the schema as options
- Add more unit tests
- Add support for entering scientific notations in number fields in GUI editor, as well as for displaying them in scientific notation (value thresholds are configurable in the settings)

### Changed
- The GUI Editor now also highlights the currently selected field visually
- Internal code refactoring and cleanup to remove duplicated code
- Schema violations that involve `oneOf` or `anyOf` children used to be shown by listing all children violations separately. For better visual clarity, they now first get merged into one violation text in a tree form. This explicitly also supports nested schema composition violations.
- Removed XML as a supported data format and instead added an XML import and export function

### Fixed
- Fix typing errors in the code
- Fix `enter` in the GUI editor when editing property names sometimes not resulting in the expected behavior (it added a newline instead of confirming rename in some scenarios)
- Fix RDF context view breadcrumbs not showing the correct path when navigating into nested structures
- Fix auto-expansion of property tree in the GUI editor not working for some nested structures
- Fix component overflow in the UI on mobile devices

## [2.5.0] - 2026-04-22

### Added

- Add next/previous buttons to the search bar for easier navigation through search results
- Add copy/paste support for schema diagrams

## [2.4.0] - 2026-04-15

### Added

- Add RDF Panel to support RDF authoring workflows
- Add JSON to JSON-LD conversion using RML mapping
- Add SPARQL querying support in RDF Panel
- Add Knowledge Graph visualization for RDF data exploration

## [2.3.0] - 2026-04-14

### Changed

- Remove prototypical STML mapping in favor of more powerful Jsonata
- Refactor the code base to use a newly implemented JSON Schema visitor pattern instead of having schema traversal logic implemented in different places

### Fixed

- Fix schema diagram: it now correctly draws multiple edges if a sub-schema defines its own structure and additionally has a reference

## [2.2.0] - 2026-03-27

### Added

- Add word-wrap for text editor
- Add `experimental` tag in the About page for the experimental deployment
- Add workflow to automatically generate a git tag when a PR is merged into `main` or `develop` with an incremented version in the package.json

### Changed

- Update multiple dependencies (picomatch, handlebars, yaml)

## [2.1.0] - 2026-03-25

Initial versioned release. Introduces semantic versioning, a structured branching model (`develop` / `main`), and contribution guidelines.
