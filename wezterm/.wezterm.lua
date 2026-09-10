local wezterm = require("wezterm")

return {
	color_scheme = "GruvboxDark",
	window_padding = {
		left = 1,
		right = 1,
		top = 1,
		bottom = 1,
	},
	font = wezterm.font("JetBrainsMono Nerd Font Mono"),
	font_size = 15.0,
	enable_kitty_keyboard = true,
	leader = { key = "a", mods = "CTRL", timeout_milliseconds = 1000 },
	keys = {
		-- Let Option/Alt+Enter pass through to terminal apps like pi
		-- instead of toggling WezTerm fullscreen.
		{
			mods = "ALT",
			key = "Enter",
			action = wezterm.action.DisableDefaultAssignment,
		},
		-- splitting
		{
			mods = "LEADER",
			key = "-",
			action = wezterm.action.SplitVertical({ domain = "CurrentPaneDomain" }),
		},
		{
			mods = "LEADER",
			key = "=",
			action = wezterm.action.SplitHorizontal({ domain = "CurrentPaneDomain" }),
		},
		{
			mods = "LEADER",
			key = "w",
			action = wezterm.action.CloseCurrentPane({ confirm = false }),
		},
	},
}
