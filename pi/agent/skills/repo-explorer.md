---
name: repo-explorer
description: clone and inspect external repositories in a reusable local exploration cache. Use this skill when the user asks to explore, inspect, investigate, compare, or answer questions about a repository that may not already be in the current workspace.
allowed-tools: Bash(mkdir -p ~/.explore/repos) Bash(ls -la ~/.explore/repos) Bash(git clone *)
---

Use this skill to explore repositories without cluttering the active workspace.

## Current Cache Contents

```!
mkdir -p ~/.explore/repos
ls -la ~/.explore/repos
```

## Flow

1. Check whether the target repository is already present in the Current Cache Contents above. If the repository is already present, use that local checkout for exploration.
2. If the repository is not present, clone it into `~/.explore/repos` first if it does not exist.

After opening the repository, inspect its local instructions and project metadata before making assumptions. Prefer `rg`, `rg --files`, and targeted file reads for exploration.
