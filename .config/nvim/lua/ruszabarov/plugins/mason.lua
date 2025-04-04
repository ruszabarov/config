return {
	"williamboman/mason.nvim",
	dependencies = {
		"williamboman/mason-lspconfig.nvim",
		"WhoIsSethDaniel/mason-tool-installer.nvim",
	},
	config = function()
		local mason = require("mason")
		local mason_lspconfig = require("mason-lspconfig")
		local mason_tool_installer = require("mason-tool-installer")

		mason.setup({})

		mason_lspconfig.setup({
			ensure_installed = {
				"ts_ls",
				"angularls",
				"lua_ls",
				"html",
				"cssls",
				"clangd",
				"pyright",
				"hls",
				"gopls",
			},
			automatic_installation = true,
		})

		mason_tool_installer.setup({
			ensure_installed = {
				"prettier",
				"stylua",
				"eslint",
				"prettierd",
				"clang-format",
				"mypy",
				"ruff",
				"black",
				"goimports",
				"ormolu",
				"hlint",
			},
		})
	end,
}
