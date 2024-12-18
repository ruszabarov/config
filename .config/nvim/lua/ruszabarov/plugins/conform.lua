return {
	"stevearc/conform.nvim",
	config = function()
		require("conform").setup({
			formatters_by_ft = {
				typescript = { "prettierd", "eslint_d" },
				javascript = { "prettierd", "eslint_d" },
				html = { "prettierd", "eslint_d" },
				css = { "prettierd", "eslint_d" },
				scss = { "prettierd", "eslint_d" },
				json = { "prettierd" },
				lua = { "stylua" },
				cpp = { "clang-format" },
				c = { "clang-format" },
				python = { "black", "mypy", "ruff" },
				go = { "goimports" },
				haskell = { "ormolu" },
			},
			format_on_save = {
				enabled = true,
				lsp_format = "fallback",
			},
		})
	end,
}
