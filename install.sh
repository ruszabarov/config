#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
backup_dir="$HOME/.local/state/dotfiles/backups/$(date +%Y%m%d-%H%M%S)-$$"
link_config() {
  local source="$repo_dir/$1" target="$HOME/$2"
  if [[ -L "$target" && "$(readlink "$target")" == "$source" ]]; then
    printf 'Already linked: %s\n' "$target"
    return
  fi
  mkdir -p "$(dirname "$target")"
  if [[ -e "$target" || -L "$target" ]]; then
    mkdir -p "$backup_dir/$(dirname "$2")"
    mv "$target" "$backup_dir/$2"
    printf 'Backup: %s\n' "$backup_dir/$2"
  fi
  ln -s "$source" "$target"
  printf 'Linked: %s -> %s\n' "$target" "$source"
}
# Preserve the machine's prompt settings when adopting an existing fish config.
if [[ ! -L "$HOME/.config/fish" && -f "$HOME/.config/fish/fish_variables" ]]; then
  cp "$HOME/.config/fish/fish_variables" "$repo_dir/.config/fish/fish_variables"
fi
link_config .config/fish .config/fish
link_config git/.gitconfig .gitconfig
link_config wezterm/.wezterm.lua .wezterm.lua
bash "$repo_dir/pi/install-links.sh" --link-models
# A fresh checkout needs Tide's universal prompt defaults initialized once.
if command -v fish >/dev/null 2>&1; then
  fish -c 'set -q tide_left_prompt_items; or emit _tide_init_install'
fi
