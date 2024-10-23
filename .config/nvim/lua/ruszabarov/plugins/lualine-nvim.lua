return {
	{
		"nvim-lualine/lualine.nvim",
		config = function()
			local icon = require("ruszabarov.core.icons")
			local lualine = require("lualine")
			local mode = "mode"
			local filetype = { "filetype", icon_only = true }

			local diagnostics = {
				"diagnostics",
				sources = { "nvim_diagnostic" },
				sections = { "error", "warn", "info", "hint" },
				symbols = {
					error = icon.diagnostics.Error,
					hint = icon.diagnostics.Hint,
					info = icon.diagnostics.Info,
					warn = icon.diagnostics.Warning,
				},
				colored = true,
				update_in_insert = false,
				always_visible = false,
			}

			local diff = {
				"diff",
				source = function()
					local gitsigns = vim.b.gitsigns_status_dict
					if gitsigns then
						return {
							added = gitsigns.added,
							modified = gitsigns.changed,
							removed = gitsigns.removed,
						}
					end
				end,
				symbols = {
					added = icon.git.LineAdded .. " ",
					modified = icon.git.LineModified .. " ",
					removed = icon.git.LineRemoved .. " ",
				},
				colored = true,
				always_visible = false,
			}

			-- Custom theme with background color set to #282828
			local custom_theme = {
				normal = {
					a = { bg = "#282828", fg = "#ebdbb2" },
					b = { bg = "#282828", fg = "#ebdbb2" },
					c = { bg = "#282828", fg = "#ebdbb2" },
				},
				insert = {
					a = { bg = "#282828", fg = "#ebdbb2" },
					b = { bg = "#282828", fg = "#ebdbb2" },
					c = { bg = "#282828", fg = "#ebdbb2" },
				},
				visual = {
					a = { bg = "#282828", fg = "#ebdbb2" },
					b = { bg = "#282828", fg = "#ebdbb2" },
					c = { bg = "#282828", fg = "#ebdbb2" },
				},
				replace = {
					a = { bg = "#282828", fg = "#ebdbb2" },
					b = { bg = "#282828", fg = "#ebdbb2" },
					c = { bg = "#282828", fg = "#ebdbb2" },
				},
				inactive = {
					a = { bg = "#282828", fg = "#a89984" },
					b = { bg = "#282828", fg = "#a89984" },
					c = { bg = "#282828", fg = "#a89984" },
				},
			}

			lualine.setup({
				options = {
					theme = custom_theme, -- Use the custom theme
					globalstatus = true,
					section_separators = "",
					component_separators = "",
					disabled_filetypes = { statusline = { "dashboard", "lazy", "alpha" } },
				},
				sections = {
					lualine_a = { mode },
					lualine_b = {},
					lualine_c = { "filename" },
					lualine_x = { diff, diagnostics, filetype },
					lualine_y = {},
					lualine_z = {},
				},
			})
		end,
	},
}
