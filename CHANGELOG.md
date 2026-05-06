# Changelog

All notable changes to MetaConfigurator will be documented in this file.
This changelog begins with version 2.1.0, the release from which semantic versioning was formally adopted.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
