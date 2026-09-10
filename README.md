# Dotfiles

Shared fish, Git, WezTerm, and Pi configuration.

## Install on macOS

```sh
git clone https://github.com/ruszabarov/config.git ~/.dotfiles
brew install fish eza zoxide git-delta neovim fnm gnupg pinentry-mac git-lfs
bash ~/.dotfiles/install.sh
```

The installer is safe to rerun. Existing files are backed up before replacement.
Fish, Git, and WezTerm backups go under `~/.local/state/dotfiles/backups/`;
Pi backups go under `~/.pi/agent/.link-backup-*`.

| Installed path | Repository source |
| --- | --- |
| `~/.config/fish` | `.config/fish` |
| `~/.gitconfig` | `git/.gitconfig` |
| `~/.wezterm.lua` | `wezterm/.wezterm.lua` |
| `~/.pi/agent/{APPEND_SYSTEM.md,settings.json,pi-lsp.json,models.json,agents,extensions,prompts,skills}` | Matching files under `pi/agent` |

Pi's models file contains an environment-variable reference, not an API key.
Provide `OPENROUTER_API_KEY` locally; do not put credentials in a linked file.
Pi packages and language servers need their own installation when using Pi.
WezTerm uses JetBrainsMono Nerd Font Mono; install that font if needed.

## Machine-local state

Git includes `~/.gitconfig.local` last. Put signing keys and machine-specific
overrides there, for example after generating and testing your key:

```sh
git config --file ~/.gitconfig.local user.signingkey YOUR_FINGERPRINT
git config --file ~/.gitconfig.local gpg.format openpgp
git config --file ~/.gitconfig.local commit.gpgsign true
git config --file ~/.gitconfig.local tag.gpgSign true
```

SSH and GPG private keys remain in `~/.ssh` and `~/.gnupg`, outside this repo.
Fish universal variables (including Tide preferences) are ignored by Git.
Fisher and Tide are vendored so the prompt works without downloading plugins at
startup. `fish_plugins` records those dependencies. zoxide provides directory
jumping; the older competing `z` plugin is not installed.

To change the login shell, register the installed fish path in `/etc/shells`
if absent, then run `chsh -s /opt/homebrew/bin/fish`. This needs local macOS
authentication. Open a new terminal session afterward.
