return {
	"nvim-treesitter/nvim-treesitter-textobjects",
	dependencies = { "nvim-treesitter/nvim-treesitter" },
	config = function()
		require("nvim-treesitter.configs").setup({
			textobjects = {
				select = {
					enable = true,
					-- Automatically jump forward to textobj, similar to targets.vim
					lookahead = true,
					keymaps = {
						["af"] = "@function.outer",
						["if"] = "@function.inner",
						["ac"] = "@class.outer",
						["ic"] = "@class.inner",
						-- Add more mappings as needed
					},
				},
				move = {
					enable = true,
					set_jumps = true, -- Whether to set jumps in the jumplist
					keymaps = {
						-- Move to the next function/class
						["]m"] = "@function.outer",
						["[["] = "@class.outer",
						-- Move to the previous function/class
						["[m"] = "@function.outer",
						["]]"] = "@class.outer",
						-- Add more keymaps if needed
					},
				},
			},
		})
	end,
}
