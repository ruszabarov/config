# Pi agent setup

Portable Pi Coding Agent configuration from `~/.pi/agent`.

## Restore / link into `~/.pi/agent`

From this directory, run:

```sh
./install-links.sh
```

This symlinks the portable config files/directories from this repo into `~/.pi/agent`, so edits made by Pi are reflected in the dotfiles checkout.

`models.json` is intentionally not linked by default because the live file may contain local secrets. To link it too, first make sure committed API keys are environment/auth references, then run:

```sh
./install-links.sh --link-models
```

## Secrets and local runtime state

This directory intentionally does **not** include local auth, sessions, caches, package clones, npm state, temporary files, or generated model catalogues.

`agent/models.json` keeps model/provider definitions, but API keys are environment-variable references (for example `$OPENROUTER_API_KEY`) rather than committed secrets.
