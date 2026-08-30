# Pi agent setup

Portable Pi Coding Agent configuration from `~/.pi/agent`.

## Restore

Copy or symlink the files in `agent/` into `~/.pi/agent/`:

```sh
mkdir -p ~/.pi/agent
cp -R agent/. ~/.pi/agent/
```

## Secrets and local runtime state

This directory intentionally does **not** include local auth, sessions, caches, package clones, npm state, temporary files, or generated model catalogues.

`agent/models.json` keeps model/provider definitions, but API keys are environment-variable references (for example `$OPENROUTER_API_KEY`) rather than committed secrets.
