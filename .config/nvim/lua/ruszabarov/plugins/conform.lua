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
			},
			format_on_save = {
				-- These options will be passed to conform.format()
				timeout_ms = 500,
				lsp_format = "fallback",
			},
		})
	end,
}
