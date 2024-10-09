if status is-interactive
    # Commands to run in interactive sessions can go here
end

eval "$(/opt/homebrew/bin/brew shellenv)"

alias ls="eza --all --color=always --git --no-filesize --icons=always --no-time --no-user --no-permissions --across"

eval "$(zoxide init fish)"

alias cd="z"
alias vim="nvim"
