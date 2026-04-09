# Contributing to MetaConfigurator

Welcome to the MetaConfigurator project! We appreciate your interest in contributing.

---

## Branching Model

- **`develop`** — the default branch. All feature branches are created from here and all PRs target here.
- **`main`** — stable releases only. Updated manually by a maintainer when a set of changes is deemed stable, together with a version bump and changelog entry.

---

## Team Members (with repository access)

### 1. Start with a GitHub Issue

Before writing any code, make sure there is a GitHub issue for the work you want to do.
If no issue exists yet, create one. If one exists, assign yourself to it or ask a maintainer to assign you.

### 2. Create a Branch from the Issue

Create a branch directly from the GitHub issue (using the "Create a branch" link on the issue page).
This automatically links the branch to the issue and bases it on `develop`.
Branch names follow the pattern `<issue-number>-short-description`, e.g. `123-add-searchbar`.

### 3. Develop Locally

Check out the branch locally:

```sh
git fetch origin
git checkout <branch-name>
```

See [documentation_developer/README.md](documentation_developer/README.md) for setup instructions.

### 4. Open a Pull Request

When the work is complete, open a Pull Request targeting `develop` and request a review.
You can optionally open a **Draft Pull Request** earlier during development — this lets others follow along and give early feedback without a formal review being requested.

---

## External Contributors (without repository access)

### 1. Find or Create an Issue

Check the existing issues before starting. If none covers your idea, open one.
**Leave a comment or contact the maintainers** to express interest — this avoids duplicate work and ensures your contribution is likely to be accepted.

### 2. Fork and Clone

Fork the repository on GitHub, then clone your fork:

```sh
git clone https://github.com/<your-username>/meta-configurator.git
cd meta-configurator
```

Add the upstream remote so you can stay up to date:

```sh
git remote add upstream https://github.com/MetaConfigurator/meta-configurator.git
```

### 3. Create a Feature Branch

Never work directly on `develop` or `main`. Create a branch from `develop`:

```sh
git checkout develop
git checkout -b <issue-number>-short-description
```

### 4. Open a Pull Request

When your work is complete, open a Pull Request against the upstream `develop` branch and request a review.
You can optionally open a **Draft Pull Request** earlier during development to get early feedback from maintainers.

---

## Commit Messages

No specific format is enforced, but commit messages should start with a verb and clearly describe what was done — e.g. `Add validation for empty schema`. This helps reviewers follow your work in the PR.

---

## Pull Request Guidelines

- **Title:** Start with a verb and describe what was done — e.g. `Add searchbar component`.
- **Description:** Always explain **why** the change is needed, not just what was changed. Link the related issue.
- **Scope:** Keep PRs focused on a single concern. Smaller PRs are reviewed faster and merged sooner.
- **Discussion:** PRs are the primary place for code review discussion. Use inline comments and the general PR thread to ask questions and suggest improvements.

---

## Releases

Releases are managed manually by maintainers. When a set of changes on `develop` is deemed stable, a maintainer will:
1. Update the version in `meta_configurator/package.json`
2. Add a changelog entry
3. Merge `develop` into `main`

---

## Code Style and Local Setup

Follow the coding conventions defined in the Prettier and ESLint configuration files.
For installation, running the dev server, linting, and testing, see the [developer documentation](documentation_developer/README.md).

---

## Issue Reporting

If you encounter a bug or have a feature suggestion, please open an issue. Provide a clear title and, for bugs, include steps to reproduce the problem.

Thank you for contributing!
