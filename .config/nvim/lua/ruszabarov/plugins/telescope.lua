return {
	"nvim-telescope/telescope.nvim",
	dependencies = {
		"nvim-lua/plenary.nvim",
		"BurntSushi/ripgrep",
		{
			"nvim-telescope/telescope-fzf-native.nvim",
			build = "make", -- This compiles the FZF-native extension
		},
		"sharkdp/fd",
		"nvim-treesitter/nvim-treesitter",
		"nvim-tree/nvim-web-devicons",
	},
	config = function()
		local telescope = require("telescope")
		telescope.setup({
			defaults = {
				path_display = { "truncate" }, -- Truncate the path from the beginning
			},
			extensions = {
				fzf = {
					fuzzy = true, -- false will only do exact matching
					override_generic_sorter = true, -- override the generic sorter
					override_file_sorter = true, -- override the file sorter
					case_mode = "smart_case", -- or "ignore_case" or "respect_case"
					-- the default case_mode is "smart_case"
				},
			},
		})
		-- Load the FZF native extension after setting up Telescope
		telescope.load_extension("fzf")

		-- Key mappings
		local builtin = require("telescope.builtin")
		local map = vim.keymap.set
		local opts = { silent = true, noremap = true }

		-- Find files
		map("n", "<c-P>", function()
			builtin.find_files()
		end, opts)

		-- Find buffers
		map("n", "<leader>b", function()
			builtin.buffers()
		end, { desc = "Fuzzy find recent files", silent = true })

		-- Live Grep
		map("n", "<leader>/", function()
			builtin.live_grep()
		end, { desc = "Find string in cwd", silent = true })

		-- LSP Go to Definition
		map("n", "gd", builtin.lsp_definitions, opts)

		-- LSP Find All References
		map("n", "gr", builtin.lsp_references, opts)
	end,
}
