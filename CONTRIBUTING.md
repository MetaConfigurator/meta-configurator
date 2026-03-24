# Contributing to MetaConfigurator

Welcome to the MetaConfigurator project! We appreciate your interest in contributing.

---

## Team Members (with repository access)

If you are part of the core team and have direct write access to the repository, follow this workflow:

### 1. Start with a GitHub Issue

Before writing any code, make sure there is a GitHub issue for the work you want to do.
If no issue exists yet, create one. If one exists, assign yourself to it or ask a maintainer to assign you.

### 2. Create a Branch from the Issue

Create a branch directly from the GitHub issue (using the "Create a branch" link on the issue page).
This automatically links the branch to the issue.
Branch names follow the pattern `<issue-number>-short-description`, e.g. `123-add-searchbar`.

### 3. Develop Locally

Check out the branch locally:

```sh
git fetch origin
git checkout <branch-name>
```

See [documentation_developer/README.md](documentation_developer/README.md) for setup instructions.

### 4. Open a Pull Request

When the work is complete, open a Pull Request and request a review.
You can optionally open a **Draft Pull Request** earlier during development — this lets others follow along and give early feedback without a formal review being requested.

---

## External Contributors (without repository access)

If you are not part of the core team, you will need to fork the repository.

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

Never work directly on `main`. Create a branch for your change:

```sh
git checkout -b <issue-number>-short-description
```

### 4. Open a Pull Request

When your work is complete, open a Pull Request against the upstream `main` branch and request a review.
You can optionally open a **Draft Pull Request** earlier during development to get early feedback from maintainers.

---

## Pull Request Guidelines

- **Title:** Must follow the [Conventional Commits](https://www.conventionalcommits.org/) format — `<type>: <Verb> <subject>` — e.g. `feat: Add searchbar component`. This is required because the PR title is used as the squash merge commit message on `main`, from which the CI/CD pipeline automatically determines the semantic version bump and creates a release tag.
- **Description:** Always explain **why** the change is needed, not just what was changed. Link the related issue.
- **Scope:** Keep PRs focused on a single concern. Smaller PRs are reviewed faster and merged sooner.
- **Discussion:** PRs are the primary place for code review discussion. Use inline comments and the general PR thread to ask questions and suggest improvements.

**PR title type prefixes and their effect on versioning:**

| Prefix | Description | Version bump |
|---|---|---|
| `feat:` | A new feature | Minor (`x.Y.0`) |
| `fix:` | A bug fix | Patch (`x.y.Z`) |
| `perf:` | A performance improvement | Patch |
| `refactor:` | Code restructuring without behavior change | Patch |
| `docs:` | Documentation only | Patch |
| `chore:` | Build process, dependencies, tooling | Patch |
| `test:` | Adding or fixing tests | Patch |
| `breaking:` | Incompatible API change | Major (`X.0.0`) |

PRs are always merged via **squash merge**, so the PR title becomes the single commit message on `main`. Individual commit messages on your branch are not required to follow the Conventional Commits format, but should still start with a verb and clearly describe what was done, e.g. `Add validation for empty schema` — this helps reviewers follow your work in the PR.

---

## Code Style and Local Setup

Follow the coding conventions defined in the Prettier and ESLint configuration files.
For installation, running the dev server, linting, and testing, see the [developer documentation](documentation_developer/README.md).

---

## Issue Reporting

If you encounter a bug or have a feature suggestion, please open an issue. Provide a clear title and, for bugs, include steps to reproduce the problem.

Thank you for contributing!
