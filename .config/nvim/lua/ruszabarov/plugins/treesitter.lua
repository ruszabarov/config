return {
	"nvim-treesitter/nvim-treesitter",
	event = { "BufReadPost", "BufNewFile" },
	build = ":TSUpdate",
	enabled = true,
	config = function()
		require("nvim-treesitter.configs").setup({
			ensure_installed = {
				"vimdoc",
				"javascript",
				"typescript",
				"lua",
				"html",
				"tsx",
				"bash",
				"markdown",
				"markdown_inline",
				"angular",
			},
			indent = { enable = true },
			highlight = {
				enable = true,
				use_languagetree = true,
				-- disable = { "markdown" },
			},
		})
	end,
	-- enable nvim-ts-context-commentstring plugin for commenting tsx and jsx
	require("ts_context_commentstring").setup({}),
}
