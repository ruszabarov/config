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
		local cmp_nvim_lsp = require("cmp_nvim_lsp")

		-- Set up LSP keymaps, completion, and format-on-save via LspAttach
		vim.api.nvim_create_autocmd("LspAttach", {
			group = vim.api.nvim_create_augroup("my.lsp", {}),
			callback = function(args)
				local client = assert(vim.lsp.get_client_by_id(args.data.client_id))
				local bufnr = args.buf

				if client:supports_method("textDocument/hover") then
					vim.keymap.set(
						"n",
						"K",
						vim.lsp.buf.hover,
						{ buffer = bufnr, desc = "Show documentation for what is under cursor" }
					)
				end

				if client:supports_method("textDocument/rename") then
					vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename, { buffer = bufnr, desc = "Smart rename" })
				end

				if client:supports_method("textDocument/codeAction") then
					vim.keymap.set(
						{ "n", "v" },
						"gf",
						vim.lsp.buf.code_action,
						{ buffer = bufnr, desc = "See available code actions" }
					)
					vim.keymap.set("n", "<leader>qf", function()
						local opts = { context = { only = { "quickfix" } } }
						vim.lsp.buf.code_action(opts)
					end, { buffer = bufnr, desc = "Quick fix for diagnostics" })
				end

				vim.keymap.set("n", "<leader>d", function()
					vim.diagnostic.open_float(nil, { severity_sort = true })
				end, { buffer = bufnr, desc = "Show diagnostics for line" })

				-- Enable auto-completion
				if client:supports_method("textDocument/completion") then
					vim.lsp.completion.enable(true, client.id, bufnr, { autotrigger = true })
				end

				-- Auto-format on save when supported and willSaveWaitUntil is not available
				if
					not client:supports_method("textDocument/willSaveWaitUntil")
					and client:supports_method("textDocument/formatting")
				then
					vim.api.nvim_create_autocmd("BufWritePre", {
						group = vim.api.nvim_create_augroup("my.lsp", { clear = false }),
						buffer = bufnr,
						callback = function()
							vim.lsp.buf.format({ bufnr = bufnr, id = client.id, timeout_ms = 1000 })
						end,
					})
				end
			end,
		})

		local capabilities = cmp_nvim_lsp.default_capabilities()
		local severity = vim.diagnostic.severity
		vim.diagnostic.config({
			signs = {
				text = {
					[severity.ERROR] = "✖",
					[severity.WARN] = "",
					[severity.HINT] = "󰠠",
					[severity.INFO] = "",
				},
			},
		})

		-- configure typescript server with plugin
		vim.lsp.config["ts_ls"] = {
			capabilities = capabilities,
			root_markers = { "tsconfig.json", "package.json" },
		}
		vim.lsp.enable("ts_ls")

		-- configure html server
		vim.lsp.config["html"] = {
			capabilities = capabilities,
		}
		vim.lsp.enable("html")

		-- configure angular server
		vim.lsp.config["angularls"] = {
			capabilities = capabilities,
			root_markers = { "angular.json", "project.json", "nx.json" },
			filetypes = { "typescript", "html", "typescriptreact", "typescript.tsx", "htmlangular" },
		}
		vim.lsp.enable("angularls")

		-- configure lua server (with special settings)
		vim.lsp.config["lua_ls"] = {
			capabilities = capabilities,
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
		}
		vim.lsp.enable("lua_ls")

		-- configure css server
		vim.lsp.config["cssls"] = {
			capabilities = capabilities,
		}
		vim.lsp.enable("cssls")

		-- configure c server
		vim.lsp.config["clangd"] = {
			capabilities = capabilities,
		}
		vim.lsp.enable("clangd")

		-- configure python server
		vim.lsp.config["pyright"] = {
			capabilities = capabilities,
			filetypes = { "python" },
		}
		vim.lsp.enable("pyright")

		vim.lsp.config["gopls"] = {
			capabilities = capabilities,
			filetypes = { "go" },
		}
		vim.lsp.enable("gopls")

		vim.lsp.config["eslint"] = {
			capabilities = capabilities,
			root_markers = { ".eslintrc.js", ".eslintrc.json", "package.json" },
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
		}
		vim.lsp.enable("eslint")
	end,
}
