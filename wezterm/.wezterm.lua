local wezterm = require("wezterm")

local function hex_to_rgb(hex)
	hex = hex:gsub("#", "")
	return tonumber(hex:sub(1, 2), 16), tonumber(hex:sub(3, 4), 16), tonumber(hex:sub(5, 6), 16)
end

local function lighten(hex, percent)
	local r, g, b = hex_to_rgb(hex)
	local function lift(channel)
		return math.floor((channel + ((255 - channel) * percent / 100)) + 0.5)
	end
	return string.format("#%02X%02X%02X", lift(r), lift(g), lift(b))
end

local bright_step = 35

local palette = {
	syntax = {
		red = "#FF838B",
		orange = "#F5983A",
		yellow = "#DFAB25",
		green = "#87C05F",
		cyan = "#4AC2B8",
		blue = "#5EB7FF",
		purple = "#DD97F1",
		text = "#ADB0BB",
		comment = "#696C76",
		mute = "#595C66",
	},
	ui = {
		red = "#F8747E",
		orange = "#EB8332",
		yellow = "#D09214",
		green = "#75AD47",
		cyan = "#00B298",
		blue = "#50A4E9",
		purple = "#CC83E3",
		accent = "#50A4E9",
		tabline = "#111317",
		winbar = "#797D87",
		tool = "#16181D",
		base = "#1A1D23",
		inactive_base = "#16181D",
		statusline = "#111317",
		split = "#111317",
		float = "#14161B",
		title = "#50A4E9",
		border = "#3A3E47",
		current_line = "#1E222A",
		scrollbar = "#50A4E9",
		selection = "#26343F",
		menu_selection = "#26343F",
		highlight = "#23272F",
		none_text = "#3A3E47",
		text = "#9B9FA9",
		text_active = "#ADB0BB",
		text_inactive = "#494D56",
		text_match = "#E0E0Ee",
		prompt = "#21242A",
	},
}

palette.term = {
	black = palette.ui.tabline,
	bright_black = lighten(palette.ui.tabline, bright_step),
	red = palette.syntax.red,
	bright_red = lighten(palette.syntax.red, bright_step),
	green = palette.syntax.green,
	bright_green = lighten(palette.syntax.green, bright_step),
	yellow = palette.syntax.yellow,
	bright_yellow = lighten(palette.syntax.yellow, bright_step),
	blue = palette.syntax.blue,
	bright_blue = lighten(palette.syntax.blue, bright_step),
	purple = palette.syntax.purple,
	bright_purple = lighten(palette.syntax.purple, bright_step),
	cyan = palette.syntax.cyan,
	bright_cyan = lighten(palette.syntax.cyan, bright_step),
	white = palette.ui.text,
	bright_white = lighten(palette.syntax.text, bright_step),
	background = palette.ui.base,
	foreground = palette.ui.text,
}

local astro_scheme = {
	foreground = palette.term.foreground,
	background = palette.term.background,
	cursor_bg = palette.ui.accent,
	cursor_border = palette.ui.accent,
	cursor_fg = palette.ui.base,
	selection_bg = palette.ui.selection,
	selection_fg = palette.syntax.text,
	scrollbar_thumb = palette.ui.scrollbar,
	split = palette.ui.split,
	ansi = {
		palette.term.black,
		palette.term.red,
		palette.term.green,
		palette.term.yellow,
		palette.term.blue,
		palette.term.purple,
		palette.term.cyan,
		palette.term.white,
	},
	brights = {
		palette.term.bright_black,
		palette.term.bright_red,
		palette.term.bright_green,
		palette.term.bright_yellow,
		palette.term.bright_blue,
		palette.term.bright_purple,
		palette.term.bright_cyan,
		palette.term.bright_white,
	},
	tab_bar = {
		background = palette.ui.tabline,
		active_tab = {
			bg_color = palette.ui.base,
			fg_color = palette.ui.text_active,
			intensity = "Bold",
		},
		inactive_tab = {
			bg_color = palette.ui.inactive_base,
			fg_color = palette.ui.text_inactive,
		},
		inactive_tab_hover = {
			bg_color = palette.ui.highlight,
			fg_color = palette.ui.text,
		},
		new_tab = {
			bg_color = palette.ui.tabline,
			fg_color = palette.ui.text_inactive,
		},
		new_tab_hover = {
			bg_color = palette.ui.highlight,
			fg_color = palette.ui.text,
			italic = true,
		},
	},
}

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
