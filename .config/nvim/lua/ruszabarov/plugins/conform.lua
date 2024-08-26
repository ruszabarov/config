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
			},
		})
	end,
}
