/opt/homebrew/bin/brew shellenv fish | source

set -gx PNPM_HOME "$HOME/Library/pnpm"
set -gx BUN_INSTALL "$HOME/.bun"
fish_add_path "$HOME/.local/bin" "$HOME/.cabal/bin" "$HOME/.ghcup/bin" "$PNPM_HOME" "$BUN_INSTALL/bin"
if command -q go
    fish_add_path (go env GOPATH)/bin
end
if test -d "$HOME/.antigravity-ide/antigravity-ide/bin"
    fish_add_path "$HOME/.antigravity-ide/antigravity-ide/bin"
end

if status is-interactive
    alias ls="eza --all --color=always --git --no-filesize --icons=always --no-time --no-user --no-permissions --grid"
    alias air="$HOME/.air"
    alias vim="nvim"
    zoxide init fish | source
    alias cd="z"
    set -gx GPG_TTY (tty)
    if command -q fnm
        fnm env --use-on-cd --shell fish | source
    end
end
