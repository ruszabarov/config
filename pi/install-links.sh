#!/usr/bin/env bash
set -euo pipefail

# Link portable Pi agent config from this dotfiles repo into ~/.pi/agent.
# Runtime state, auth, caches, sessions, and generated package state are left local.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_AGENT_DIR="$SCRIPT_DIR/agent"
PI_AGENT_DIR="${PI_AGENT_DIR:-$HOME/.pi/agent}"
BACKUP_DIR="$PI_AGENT_DIR/.link-backup-$(date +%Y%m%d%H%M%S)"

LINK_MODELS=false
if [[ "${1:-}" == "--link-models" ]]; then
  LINK_MODELS=true
fi

items=(
  APPEND_SYSTEM.md
  settings.json
  pi-lsp.json
  agents
  extensions
  prompts
  skills
)

if [[ "$LINK_MODELS" == true ]]; then
  items+=(models.json)
fi

mkdir -p "$PI_AGENT_DIR"

backup_created=false
link_item() {
  local item="$1"
  local source="$REPO_AGENT_DIR/$item"
  local target="$PI_AGENT_DIR/$item"

  if [[ ! -e "$source" ]]; then
    echo "skip missing source: $source" >&2
    return
  fi

  if [[ -L "$target" ]]; then
    local current
    current="$(readlink "$target")"
    if [[ "$current" == "$source" ]]; then
      echo "already linked: $target -> $source"
      return
    fi
  fi

  if [[ -e "$target" || -L "$target" ]]; then
    if [[ "$backup_created" == false ]]; then
      mkdir -p "$BACKUP_DIR"
      backup_created=true
    fi
    mv "$target" "$BACKUP_DIR/$item"
    echo "backed up: $target -> $BACKUP_DIR/$item"
  fi

  ln -s "$source" "$target"
  echo "linked: $target -> $source"
}

for item in "${items[@]}"; do
  link_item "$item"
done

if [[ "$LINK_MODELS" != true ]]; then
  echo "left local: $PI_AGENT_DIR/models.json"
  echo "run with --link-models only after replacing committed model API keys with env/auth references"
fi

if [[ "$backup_created" == true ]]; then
  echo "backup dir: $BACKUP_DIR"
fi
