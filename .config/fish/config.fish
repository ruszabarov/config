eval "$(/opt/homebrew/bin/brew shellenv)"

alias ls="eza --all --color=always --git --no-filesize --icons=always --no-time --no-user --no-permissions --grid"
alias air="~/.air"

eval "$(zoxide init fish)"

alias cd="z"
alias vim="nvim"

set -Ux PATH $PATH (go env GOPATH)/bin

set -q GHCUP_INSTALL_BASE_PREFIX[1]; or set GHCUP_INSTALL_BASE_PREFIX $HOME ; set -gx PATH $HOME/.cabal/bin $PATH /Users/ruszabarov/.ghcup/bin # ghcup-env

set -x GPG_TTY (tty)

# pnpm
set -gx PNPM_HOME "/Users/ruszabarov/Library/pnpm"
if not string match -q -- $PNPM_HOME $PATH
  set -gx PATH "$PNPM_HOME" $PATH
end
# pnpm end
export PATH="$HOME/.local/bin:$PATH"

# bun
set --export BUN_INSTALL "$HOME/.bun"
set --export PATH $BUN_INSTALL/bin $PATH


# Added by Antigravity CLI installer
set -gx PATH "/Users/ruszabarov/.local/bin" $PATH

# fnm (Fast Node Manager) — auto-switches Node version on cd into a dir with .nvmrc/.node-version
fnm env --use-on-cd --shell fish | source

# Added by Antigravity IDE
fish_add_path /Users/ruszabarov/.antigravity-ide/antigravity-ide/bin
