## Workflow

### Commit Checklist

- [ ] All tests pass and valid Typescript (`npm run verify`)
- [ ] Update snapshots and README files as needed
- [ ] Documentation is updated as needed (see Documentation below)
- [ ] Changelog is updated as needed

## Getting Started

### Prerequisites
- Node.js 22 or higher (see `package.json` engines field)
- npm (included with Node.js)

### Setup
1. Clone the repository and navigate to the project directory
2. Run: `npm install`
3. Run: `npm run verify` to confirm everything is working

This command runs the full verification suite including tests, TypeScript checks, and snapshot validation.

## Documentation

### Literate Markdown Pattern

This project uses literate markdown — documentation mixed with executable code. The pattern:
- **Comments** in `.lit-md.ts` files become markdown documentation
- **Code examples** (using `example`, `test`, `spec`, `it`) automatically extract as code blocks
- **Grouping** with `describe`, `context`, or `suite` becomes heading hierarchy

Key documentation files:
- `./src/docs/README.lit-md.ts` - Main README (comments + examples)
- `./src/docs/cli.lit-md.ts` - CLI documentation
- `./src/docs/shell-examples.lit-md.ts` - Shell example patterns

**Important:** Do NOT edit `./README.md` directly. Instead:
1. Edit `./src/docs/README.lit-md.ts`
2. Run `npm run readme` to regenerate README.md

### Acceptance Tests

A comprehensive acceptance test suite validates output consistency. Tests are located in `test/acceptance/*.lit-md.ts`.

To add tests for new features:
1. Create a new `.lit-md.ts` file in `test/acceptance/`
2. Follow the pattern from existing tests (e.g., `test/acceptance/test-identifiers.lit-md.ts`)
3. Update the snapshot: `npm run test:acceptance:update`
4. Commit both the test file and `.snapshot.md` file

### Snapshot Matching

The `--match-snapshot` flag validates generated markdown output against `.snapshot.md` files without modifying them. This is useful for regression testing and ensuring consistent output.

- `npm run test:acceptance` - Validates all snapshots match generated content (fails if mismatches found)
- `npm run test:acceptance:update` - Updates all snapshots with current generated content
- `npm run verify` - Runs full verification including snapshot validation

**How it works:**
1. `--match-snapshot` generates markdown from source files but does NOT write snapshot files
2. The generated output is compared against existing `.snapshot.md` files
3. If files match, validation passes (exit code 0)
4. If files differ, validation fails with a colored diff (exit code 1)
5. If a snapshot doesn't exist, it's auto-generated on first run
6. Use `-u` flag to update snapshots when changes are intentional

**Regression test:** There is a permanent regression test in `test/snapshot-regression.test.ts` that ensures snapshot validation correctly fails when content mismatches. This prevents the March 2026 regression where snapshots were silently updated during validation instead of being validated.

## CHANGELOG Format Guidelines

Update `CHANGELOG.md` with any user-facing changes. Follow these guidelines:

- **Prepend** new entries to the top of the file
- **Use existing format** from previous entries as a reference
- **Categorize** changes under appropriate sections:
  - **Added** - New features
  - **Fixed** - Bug fixes
  - **Breaking Changes** - Breaking changes to the CLI or API
  - **Other categories** - CLI, Engine, Markdown Output, DevOps (add new categories as needed)
- **Include category labels** in parentheses: (CLI), (Engine), etc.
- **Describe impact** on users - what they need to do differently

Example:
```markdown
## [0.5.0] - 2026-03-23

## Added
- Support for `spec` and `it` identifiers as aliases for `test`. (Engine)

## Breaking Changes
- **CLI**: Renamed `--wait` flag to `--watch`. Update scripts using `lit-md --wait` to `lit-md --watch`. (CLI)
```


## Publishing

1. Decide on the version bump (patch, minor, or major based on changes)
2. Update CHANGELOG.md (see CHANGELOG Format Guidelines section above)
3. Update package.json with the new version
4. Commit with message like `chore: prepare release v1.2.3`
5. Tag it with the new version: `git tag v1.2.3`
6. Push to github: `git push github dev && git push github v1.2.3`
7. Pre-publish verification: `npm run verify` (ensures all tests pass)
8. Publish to NPM: `npm publish --access=public`
9. Verify on NPM: `npm view @ndp-software/lit-md@<version>`