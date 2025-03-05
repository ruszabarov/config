if status is-interactive
    # Commands to run in interactive sessions can go here
end

eval "$(/opt/homebrew/bin/brew shellenv)"

alias ls="eza --all --color=always --git --no-filesize --icons=always --no-time --no-user --no-permissions --grid"
alias air="~/.air"

eval "$(zoxide init fish)"

alias cd="z"
alias vim="nvim"

set -Ux PATH $PATH (go env GOPATH)/bin

set -q GHCUP_INSTALL_BASE_PREFIX[1]; or set GHCUP_INSTALL_BASE_PREFIX $HOME ; set -gx PATH $HOME/.cabal/bin $PATH /Users/ruszabarov/.ghcup/bin # ghcup-env

set -x GPG_TTY (tty)

set -x JAVA_HOME (/usr/libexec/java_home)
set -x ANT_HOME (brew --prefix ant)/libexec
set -x PATH $JAVA_HOME/bin $ANT_HOME/bin $PATH
