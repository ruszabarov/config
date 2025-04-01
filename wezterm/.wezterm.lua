local wezterm = require("wezterm")

return {
	color_scheme = "GruvboxDark",
	font = wezterm.font("JetBrainsMono Nerd Font Mono"),
	font_size = 15.0,
	leader = { key = "a", mods = "CTRL", timeout_milliseconds = 1000 },
	keys = {
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
