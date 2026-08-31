---
name: conventional-commit
description: Write git commit messages in Conventional Commits format and GitHub PR titles/bodies. Use whenever creating, reviewing, or validating a commit message, choosing a commit type (feat/fix/chore/...), indicating breaking changes, writing scopes, or opening pull requests. Also applies to automated commit-message generation.
---

# Conventional Commits

Every git commit message must follow the Conventional Commits v1.0.0 specification.

## Message Format

```text
<type>(<optional scope>)!: <description>

[optional body]

[optional footer(s)]
```

- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Subject line (header) validation regex:

```regex
^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9][a-z0-9._/-]*\))?(!)?: .+
```

## Subject Rules

- Use imperative, present tense: "add", not "added" or "adds".
- Do not capitalize the first letter of the description.
- No trailing period.
- Keep the subject line at 100 characters or fewer (aim for ~72).
- Use `!` immediately before `:` for breaking changes, or a `BREAKING CHANGE: <description>` footer.
- Scopes are lowercase nouns describing the affected codebase section: `[a-z0-9][a-z0-9._/-]*`, e.g. `fix(parser):`, `feat(auth-api):`.

## Choosing the Type

- `feat` — new user-facing feature (MINOR bump). Use only when behavior is added.
- `fix` — bug fix (PATCH bump).
- `docs` — documentation only (every changed path is a Markdown file or under a `docs/` directory).
- `ci` — CI configuration (`.github/workflows/`, other workflow files).
- `build` — build system or dependencies (lockfiles, `package.json`, bundler config).
- `test` — tests only (files under `tests/`, `__tests__/`, `specs/`, or `*.test.*` / `*.spec.*`).
- `refactor` — code change that is neither feature nor fix.
- `perf` — performance improvement.
- `style` — formatting/whitespace only, no logic change.
- `chore` — anything else (tooling, configs, gitignore, ...).
- `revert` — reverting a previous commit; reference it in a footer: `Refs: <sha>`.

## Choosing the Scope

- Derive it from the changed files: if all changed files share one top-level directory, use it; if a single file changed, its filename (without extension) is acceptable.
- Sanitize: lowercase, strip extensions, replace anything outside `[a-z0-9._/-]` with `-`, trim leading/trailing hyphens.
- Omit the scope when no clear common area exists.

## Body

- Add a body only when it materially helps (motivation, before/after behavior, context).
- Separate it from the subject with exactly one blank line.
- Free-form paragraphs; wrap manually around 72 characters.

## Footers

- One blank line after the body; token/value pairs like `Refs: #123`, `Reviewed-by: Z`, `BREAKING CHANGE: ...`.
- Token uses hyphens instead of spaces, except `BREAKING CHANGE` (also `BREAKING-CHANGE` is synonymous).
- Breaking changes must be MAJOR-bump-worthy: describe what breaks, not how it was fixed.

## Forbidden Content

Never include any of these in a commit message:

- `Co-authored-by:` lines
- "Generated with", "Created by", "Authored by" attribution lines
- Any mention of AI/tooling that produced the message (Claude, ChatGPT, OpenAI, Anthropic, Copilot, coding agent names)

The message must look entirely human-written and be based only on the actual changes.

## Examples

Good:

```text
feat(auth): add token refresh on 401 responses
```

```text
fix: prevent crash on empty input

Guard the parser against an empty input array, which previously
threw an unhandled TypeError.
```

```text
feat(api)!: drop support for the v1 endpoint

BREAKING CHANGE: clients must migrate to /v2 before upgrading.
```

Bad:

```text
feat: Added validation.          # past tense, capitalized, period
fixed login bug                  # missing type prefix
FEAT: add validation             # uppercase type
chore: update stuff              # vague description
```

## Pull Request Titles and Bodies

When generating PR text:

- Title: concise and specific, 120 characters or fewer, no trailing period. No `title:`/heading prefixes.
- Body: Markdown with exactly these sections: `## Summary`, `## Tests`, `## Notes for reviewers`.
- If tests are not evident from the changes, put `- Not run (not specified)` under Tests.
- Same forbidden-content rules as commit messages (no AI/tool attribution).
- Base the text only on the branch's commits and diff against the base branch.
