# Global Coding Guidelines

These instructions mirror `/Users/ruszabarov/.codex/AGENTS.md`:

- Do not preserve backwards compatibility. Remove obsolete paths instead of adding compatibility layers, fallbacks, or migrations.
- Choose the simplest implementation that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve readability. Do no reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages. Do no assume a library lacks a capability without checking its documentation and types.
- Make architectural decisions for long term. Do not accept a stopgap that only works for now and it meant to be replaced later.
- Study how established products solve the problem before designing a solution. Adopt their proven patterns and conventions rather than inventing an approach from scratch.

# Forks

Delegation policy:
- Use the `fork` tool for child-agent work to reduce context bloat in the main thread.
- `fork`s can use effort: `fast`, `balanced`, and `deep`. You can call multiple `fork`s in one turn.
- Ask forks for dense, concise handoffs with exact paths, commands, links, and only the evidence the parent needs.

Good fork tasks:
- Codebase exploration: map relevant files, entry points, architecture, dependencies, and conventions before implementation.
- Symbol or data-flow tracing: follow one function, route, model, API, event, or state value through definitions, references, callers, and side effects.
- Web research: gather current external facts, official docs, changelogs, API behavior, compatibility notes, and source links.
- Docs lookup: read local or vendor docs and return the exact usage guidance, caveats, and links needed for the task.
- Error investigation: inspect stack traces, logs, failing commands, regressions, and likely root causes with supporting evidence.
- Test and validation runs: run focused tests, linters, typechecks, builds, or diagnostics and summarize only failures and actionable output.
- Dependency or API comparison: compare libraries, versions, configuration options, migration paths, or tradeoffs without pulling all details into the main thread.
- Implementation review: inspect a proposed diff for correctness, edge cases, missing tests, security, accessibility, performance, or maintainability issues.
- Refactor planning: identify affected files, risks, ordering, and validation steps before making broad changes.
- Parallel option analysis: explore multiple viable approaches independently and report concise pros, cons, and recommendation.

# LSP

Use `lsp` for language-server-powered code intelligence: definitions, references, hover/type info, symbol lookup, rename safety, code actions, and file/workspace diagnostics. Prefer `lsp` before broad grep for symbol-aware questions.

Do not ever run the dev server (I always have it running myself). You can still run targeted tests/builds/linters at the end.
