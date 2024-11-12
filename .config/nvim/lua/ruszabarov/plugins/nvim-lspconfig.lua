return {
	"neovim/nvim-lspconfig",
	event = { "VeryLazy" },
	dependencies = {
		"hrsh7th/cmp-nvim-lsp",
		"nvim-telescope/telescope.nvim",
		"nvim-lua/plenary.nvim",
	},
	enabled = true,
	config = function()
		local lspconfig = require("lspconfig")
		local util = require("lspconfig.util")
		local cmp_nvim_lsp = require("cmp_nvim_lsp")

		-- Disable inline error messages
		vim.diagnostic.config({
			virtual_text = false,
			float = {
				border = "single",
			},
		})

		-- Add border to floating window
		vim.lsp.handlers["textDocument/signatureHelp"] =
			vim.lsp.with(vim.lsp.handlers.hover, { border = "single", silent = true })
		vim.lsp.handlers["textDocument/hover"] =
			vim.lsp.with(vim.lsp.handlers.hover, { border = "single", silend = true })

		-- Make float window transparent start

		local set_hl_for_floating_window = function()
			vim.api.nvim_set_hl(0, "NormalFloat", {
				link = "Normal",
			})
			vim.api.nvim_set_hl(0, "FloatBorder", {
				bg = "none",
			})
		end

		set_hl_for_floating_window()

		vim.api.nvim_create_autocmd("ColorScheme", {
			pattern = "*",
			desc = "Avoid overwritten by loading color schemes later",
			callback = set_hl_for_floating_window,
		})

		-- Make float window transparent end

		local on_attach = function(client, bufnr)
			vim.keymap.set(
				"n",
				"K",
				vim.lsp.buf.hover,
				{ buffer = bufnr, desc = "Show documentation for what is under cursor" }
			)
			vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename, { buffer = bufnr, desc = "Smart rename" })
			vim.keymap.set(
				{ "n", "v" },
				"gf",
				vim.lsp.buf.code_action,
				{ buffer = bufnr, desc = "See available code actions" }
			)
			vim.keymap.set("n", "<leader>d", function()
				vim.diagnostic.open_float(nil, { severity_sort = true })
			end, { buffer = bufnr, desc = "Show diagnostics for line" })
			-- vim.keymap.set(
			-- 	"n",
			-- 	"gR",
			-- 	"<cmd>Telescope lsp_references<CR>",
			-- 	{ buffer = bufnr, desc = "Show definition, references" }
			-- )
			-- vim.keymap.set("n", "gd", vim.lsp.buf.definition, { buffer = bufnr, desc = "Go to definition" })
		end

		local capabilities = cmp_nvim_lsp.default_capabilities()
		local signs = { Error = "✖", Warn = "", Hint = "󰠠", Info = "" }
		for type, icon in pairs(signs) do
			local hl = "DiagnosticSign" .. type
			vim.fn.sign_define(hl, { text = icon, texthl = hl, numhl = "" })
		end

		-- configure typescript server with plugin
		lspconfig["ts_ls"].setup({
			capabilities = capabilities,
			on_attach = on_attach,
			root_dir = util.root_pattern("tsconfig.json", "package.json"),
		})

		-- configure html server
		lspconfig["html"].setup({
			capabilities = capabilities,
			on_attach = on_attach,
		})

		-- configure angular server
		lspconfig["angularls"].setup({
			capabilities = capabilities,
			on_attach = on_attach,
			root_dir = util.root_pattern("angular.json", "project.json", "nx.json"),
			filetypes = { "typescript", "html", "typescriptreact", "typescript.tsx", "htmlangular" },
		})

		-- configure lua server (with special settings)
		lspconfig["lua_ls"].setup({
			capabilities = capabilities,
			on_attach = on_attach,
			settings = { -- custom settings for lua
				Lua = {
					-- make the language server recognize "vim" global
					diagnostics = {
						globals = { "vim" },
					},
					workspace = {
						-- make language server aware of runtime files
						library = {
							[vim.fn.expand("$VIMRUNTIME/lua")] = true,
							[vim.fn.stdpath("config") .. "/lua"] = true,
						},
					},
				},
			},
		})

		-- configure css server
		lspconfig["cssls"].setup({
			capabilities = capabilities,
			on_attach = on_attach,
		})

		-- configure c server
		lspconfig["clangd"].setup({
			capabilities = capabilities,
			on_attach = on_attach,
		})

		-- configure python server
		lspconfig["pyright"].setup({
			capabilities = capabilities,
			on_attach = on_attach,
			filetypes = { "python" },
		})

		lspconfig["gopls"].setup({
			capabilities = capabilities,
			on_attach = on_attach,
			filetypes = { "go" },
		})

		lspconfig["hls"].setup({
			capabilities = capabilities,
			on_attach = on_attach,
			filetypes = { "haskell", "lhaskell" }, -- Add Haskell filetypes
			root_dir = util.root_pattern("*.cabal", "stack.yaml", "hie.yaml", ".git"),
		})

		lspconfig["eslint"].setup({
			capabilities = capabilities,
			on_attach = function(client, bufnr)
				client.server_capabilities.document_formatting = true
				client.server_capabilities.document_range_formatting = true
				on_attach(client, bufnr) -- inherit default on_attach settings
			end,
			root_dir = util.root_pattern(".eslintrc.js", ".eslintrc.json", "package.json"),
			settings = {
				codeAction = {
					disableRuleComment = {
						enable = true,
						location = "separateLine",
					},
					showDocumentation = {
						enable = true,
					},
				},
			},
		})
	end,
}
