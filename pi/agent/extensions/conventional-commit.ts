import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import type { Api, Model } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";

const ALLOWED_TYPES = [
	"feat",
	"fix",
	"docs",
	"style",
	"refactor",
	"perf",
	"test",
	"build",
	"ci",
	"chore",
	"revert",
] as const;

const SUBJECT_RE = new RegExp(
	`^(${ALLOWED_TYPES.join("|")})(\\([a-z0-9][a-z0-9._/-]*\\))?(!)?: .+`,
);

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

type GitResult = Awaited<ReturnType<ExtensionAPI["exec"]>>;

const SKILL_URL = new URL("../skills/conventional-commit/SKILL.md", import.meta.url);
const SKILL_FALLBACK_PATH = join(homedir(), ".pi", "agent", "skills", "conventional-commit", "SKILL.md");

function stripFrontmatter(markdown: string): string {
	if (!markdown.startsWith("---\n")) return markdown;
	const endIndex = markdown.indexOf("\n---", 4);
	return endIndex === -1 ? markdown : markdown.slice(endIndex + 4).trim();
}

function loadSkillInstructions(): string {
	try {
		return stripFrontmatter(readFileSync(fileURLToPath(SKILL_URL), "utf8"));
	} catch {
		return stripFrontmatter(readFileSync(SKILL_FALLBACK_PATH, "utf8"));
	}
}

const SKILL_INSTRUCTIONS = loadSkillInstructions();

interface PrArgs {
	base?: string;
	draft: boolean;
	noCommit: boolean;
	guidance: string;
}

interface PrText {
	title: string;
	body: string;
}

function parseArgs(args: string): { guidance: string; noVerify: boolean } {
	const parts = args.split(/\s+/).filter(Boolean);
	const noVerify = parts.includes("--no-verify");
	const guidance = parts.filter((part) => part !== "--no-verify").join(" ").trim();
	return { guidance, noVerify };
}

function parsePrArgs(args: string): PrArgs {
	const parts = args.split(/\s+/).filter(Boolean);
	let base: string | undefined;
	const remaining: string[] = [];
	let draft = false;
	let noCommit = false;

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (part === "--draft") {
			draft = true;
			continue;
		}
		if (part === "--no-commit") {
			noCommit = true;
			continue;
		}
		if (part === "--base" && parts[i + 1]) {
			base = parts[++i];
			continue;
		}
		if (part.startsWith("--base=")) {
			base = part.slice("--base=".length);
			continue;
		}
		if (part.startsWith("base:")) {
			base = part.slice("base:".length) || parts[++i];
			continue;
		}
		remaining.push(part);
	}

	return { base, draft, noCommit, guidance: remaining.join(" ").trim() };
}

async function git(pi: ExtensionAPI, ctx: ExtensionCommandContext, args: string[], timeout = 30_000): Promise<GitResult> {
	return pi.exec("git", args, { cwd: ctx.cwd, timeout });
}

function notify(ctx: ExtensionCommandContext, message: string, level: "info" | "warning" | "error" = "info") {
	if (ctx.hasUI) ctx.ui.notify(message, level);
}

function isGitPathPresent(cwd: string, gitPath: string): boolean {
	return existsSync(resolve(cwd, gitPath.trim()));
}

async function assertSafeRepoState(pi: ExtensionAPI, ctx: ExtensionCommandContext): Promise<boolean> {
	const inside = await git(pi, ctx, ["rev-parse", "--is-inside-work-tree"]);
	if (inside.code !== 0 || inside.stdout.trim() !== "true") {
		notify(ctx, "Not inside a git worktree", "error");
		return false;
	}

	const gitPaths = await Promise.all([
		git(pi, ctx, ["rev-parse", "--git-path", "MERGE_HEAD"]),
		git(pi, ctx, ["rev-parse", "--git-path", "rebase-merge"]),
		git(pi, ctx, ["rev-parse", "--git-path", "rebase-apply"]),
		git(pi, ctx, ["rev-parse", "--git-path", "CHERRY_PICK_HEAD"]),
		git(pi, ctx, ["rev-parse", "--git-path", "REVERT_HEAD"]),
	]);

	if (gitPaths.some((result) => result.code === 0 && isGitPathPresent(ctx.cwd, result.stdout))) {
		notify(ctx, "Refusing to commit while merge/rebase/cherry-pick/revert state is present", "error");
		return false;
	}

	return true;
}

function stripCodeFence(text: string): string {
	const trimmed = text.trim();
	const match = trimmed.match(/^```(?:text|commit|gitcommit)?\s*\n([\s\S]*?)\n```$/i);
	return (match?.[1] ?? trimmed).trim();
}

function sanitizeCommitMessage(raw: string): string {
	let message = stripCodeFence(raw).replace(/\r\n/g, "\n").trim();

	const lines = message.split("\n");
	const firstSubject = lines.findIndex((line) => SUBJECT_RE.test(line.trim()));
	if (firstSubject > 0) {
		message = lines.slice(firstSubject).join("\n").trim();
	}

	message = message
		.split("\n")
		.filter((line) => !/^\s*(Co-authored-by:|Generated with|Created by|Authored by)/i.test(line))
		.map((line) => line.trimEnd())
		.join("\n")
		.trim();

	if ((message.startsWith('"') && message.endsWith('"')) || (message.startsWith("'") && message.endsWith("'"))) {
		message = message.slice(1, -1).trim();
	}

	return message;
}

function validateCommitMessage(message: string): string | undefined {
	const subject = message.split("\n", 1)[0]?.trim() ?? "";
	if (!SUBJECT_RE.test(subject)) {
		return `First line is not a valid Conventional Commit subject: ${subject || "<empty>"}`;
	}
	if (subject.length > 100) {
		return `First line is too long (${subject.length} chars; max 100)`;
	}
	if (/\b(Claude|ChatGPT|OpenAI|Anthropic|Copilot|pi coding agent|AI assistant)\b/i.test(message)) {
		return "Commit message contains AI/tool attribution";
	}
	return undefined;
}

function truncateForPrompt(value: string, maxChars: number): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars)}\n\n[diff truncated at ${maxChars} characters]`;
}

function sanitizeScope(value: string): string | undefined {
	const scope = value
		.toLowerCase()
		.replace(/\.[^.]+$/, "")
		.replace(/[^a-z0-9._/-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return scope || undefined;
}

function parseNameStatusPaths(nameStatus: string): string[] {
	return nameStatus
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const parts = line.split("\t");
			return parts[parts.length - 1] ?? "";
		})
		.filter(Boolean);
}

function fallbackCommitMessage(nameStatus: string, stat: string): string {
	const paths = parseNameStatusPaths(nameStatus);
	const lowerPaths = paths.map((path) => path.toLowerCase());
	const type = lowerPaths.length > 0 && lowerPaths.every((path) => path.endsWith(".md") || path.includes("/docs/"))
		? "docs"
		: lowerPaths.some((path) => path.includes(".github/workflows") || path.includes("/workflows/"))
			? "ci"
			: lowerPaths.some((path) => /(^|\/)(package-lock|yarn\.lock|pnpm-lock|bun\.lock|package\.json)$/.test(path))
				? "build"
				: lowerPaths.some((path) => /(^|\/)(__tests__|tests?|specs?)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/.test(path))
					? "test"
					: "chore";

	const firstSegments = paths.map((path) => path.split("/")[0]).filter(Boolean);
	const scope = firstSegments.length > 0 && firstSegments.every((segment) => segment === firstSegments[0])
		? sanitizeScope(firstSegments[0])
		: undefined;

	const changed = paths.length === 1 ? sanitizeScope(paths[0].split("/").pop() ?? "file") : undefined;
	const description = changed ? `update ${changed}` : `update ${scope ?? "project files"}`;
	const subject = `${type}${scope ? `(${scope})` : ""}: ${description}`.slice(0, 100);
	const body = stat.trim() ? `\n\n${stat.trim()}` : "";
	return `${subject}${body}`;
}

function resolveModel(ctx: ExtensionCommandContext): Model<Api> | undefined {
	const configured = process.env.PI_CONVENTIONAL_COMMIT_MODEL?.trim() || process.env.PI_COMMIT_MODEL?.trim();
	if (configured) {
		const slash = configured.indexOf("/");
		if (slash > 0) {
			const provider = configured.slice(0, slash);
			const modelId = configured.slice(slash + 1);
			const found = ctx.modelRegistry.find(provider, modelId);
			if (found) return found;
		}
	}

	return ctx.model;
}

function resolveThinking(ctx: ExtensionCommandContext): ThinkingLevel {
	const configured = process.env.PI_CONVENTIONAL_COMMIT_THINKING?.trim() || process.env.PI_COMMIT_THINKING?.trim();
	if (configured && ["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(configured)) {
		return configured as ThinkingLevel;
	}

	return (ctx.thinkingLevel as ThinkingLevel) ?? "off";
}

function describeModel(model: Model<Api>): string {
	return `${model.provider}/${model.id}`;
}

function describeConfiguredGenerationModel(ctx: ExtensionCommandContext): string {
	const model = resolveModel(ctx);
	return model ? describeModel(model) : "unknown model";
}

async function generateTextWithPi(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
	model: Model<Api>,
	systemPrompt: string,
	prompt: string,
	timeout: number,
	thinking: ThinkingLevel = "off",
): Promise<string | undefined> {
	const dir = mkdtempSync(join(tmpdir(), "pi-generate-text-"));
	const promptFile = join(dir, "prompt.md");

	try {
		writeFileSync(promptFile, prompt, "utf8");
		const result = await pi.exec(
			"pi",
			[
				"--provider",
				model.provider,
				"--model",
				model.id,
				"--thinking",
				thinking,
				"--no-tools",
				"--no-extensions",
				"--no-session",
				"--system-prompt",
				systemPrompt,
				"-p",
				`@${promptFile}`,
			],
			{ cwd: ctx.cwd, timeout },
		);

		if (result.code !== 0) {
			const error = result.stderr.trim() || result.stdout.trim() || `pi exited with code ${result.code}`;
			throw new Error(error);
		}

		return result.stdout.trim();
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function buildPrompt(input: {
	branch: string;
	status: string;
	stat: string;
	nameStatus: string;
	diff: string;
	guidance: string;
}): string {
	return [
		"Generate exactly one git commit message for all staged changes.",
		"Return only the commit message. Do not wrap it in Markdown. Do not include commentary.",
		"Follow the Conventional Commits rules in your instructions exactly.",
		"Base the message only on the provided git data.",
		input.guidance ? `\nUser guidance:\n${input.guidance}` : "",
		`\nBranch:\n${input.branch || "(detached HEAD)"}`,
		`\nStatus before staging:\n${input.status}`,
		`\nStaged diff stat:\n${input.stat}`,
		`\nStaged name/status:\n${input.nameStatus}`,
		`\nStaged diff:\n${input.diff}`,
	].join("\n");
}

async function generateCommitMessage(pi: ExtensionAPI, ctx: ExtensionCommandContext, guidance: string): Promise<string | undefined> {
	const [branch, status, stat, nameStatus, diff] = await Promise.all([
		git(pi, ctx, ["branch", "--show-current"]),
		git(pi, ctx, ["status", "--porcelain=v1"]),
		git(pi, ctx, ["diff", "--cached", "--stat", "--find-renames"]),
		git(pi, ctx, ["diff", "--cached", "--name-status", "--find-renames"]),
		git(pi, ctx, ["diff", "--cached", "--find-renames", "--no-ext-diff"]),
	]);

	const model = resolveModel(ctx);
	if (!model) {
		notify(ctx, "No active model found for commit message generation", "error");
		return undefined;
	}

	const thinking = resolveThinking(ctx);

	const prompt = buildPrompt({
		branch: branch.stdout.trim(),
		status: status.stdout.trim(),
		stat: stat.stdout.trim(),
		nameStatus: nameStatus.stdout.trim(),
		diff: truncateForPrompt(diff.stdout.trim(), 80_000),
		guidance,
	});

	try {
		const response = await generateTextWithPi(
			pi,
			ctx,
			model,
			`You write concise, accurate Conventional Commit messages. Return only the final commit message.\n\n${SKILL_INSTRUCTIONS}`,
			prompt,
			120_000,
			thinking,
		);

		return sanitizeCommitMessage(response ?? "");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const fallback = fallbackCommitMessage(nameStatus.stdout, stat.stdout);
		notify(ctx, `Commit-message generation failed on ${describeModel(model)}; using deterministic fallback. ${message}`, "warning");
		return fallback;
	}
}

async function commitAll(pi: ExtensionAPI, ctx: ExtensionCommandContext, args: string): Promise<boolean> {
	await ctx.waitForIdle();

	const { guidance, noVerify } = parseArgs(args);
	if (!(await assertSafeRepoState(pi, ctx))) return false;

	const statusBefore = await git(pi, ctx, ["status", "--porcelain=v1"]);
	if (statusBefore.code !== 0) {
		notify(ctx, statusBefore.stderr.trim() || "Could not inspect git status", "error");
		return false;
	}
	if (!statusBefore.stdout.trim()) {
		notify(ctx, "No changes to commit", "warning");
		return false;
	}

	notify(ctx, "Staging all changes for Conventional Commit...", "info");
	const add = await git(pi, ctx, ["add", "-A"]);
	if (add.code !== 0) {
		notify(ctx, add.stderr.trim() || "git add -A failed", "error");
		return false;
	}

	const hasStagedChanges = await git(pi, ctx, ["diff", "--cached", "--quiet", "--exit-code"]);
	if (hasStagedChanges.code > 1) {
		notify(ctx, hasStagedChanges.stderr.trim() || "Could not inspect staged changes", "error");
		return false;
	}
	if (hasStagedChanges.code === 0) {
		notify(ctx, "No staged changes to commit after git add -A", "warning");
		return false;
	}

	const model = resolveModel(ctx);
	const thinking = resolveThinking(ctx);
	notify(ctx, `Generating Conventional Commit message with ${describeConfiguredGenerationModel(ctx)} (thinking: ${thinking})...`, "info");
	const message = await generateCommitMessage(pi, ctx, guidance);
	if (!message) return false;

	const validationError = validateCommitMessage(message);
	if (validationError) {
		notify(ctx, validationError, "error");
		return false;
	}

	const dir = mkdtempSync(join(tmpdir(), "pi-conventional-commit-"));
	const messageFile = join(dir, "COMMIT_EDITMSG");

	try {
		writeFileSync(messageFile, `${message}\n`, "utf8");
		const commitArgs = noVerify ? ["commit", "--no-verify", "-F", messageFile] : ["commit", "-F", messageFile];
		const commit = await git(pi, ctx, commitArgs, 120_000);
		if (commit.code !== 0) {
			notify(ctx, commit.stderr.trim() || "git commit failed", "error");
			return false;
		}

		const subject = message.split("\n", 1)[0];
		notify(ctx, `Committed: ${subject}`, "info");
		return true;
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function splitLines(value: string): string[] {
	return value
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

function stripOrigin(branch: string): string {
	return branch.startsWith("origin/") ? branch.slice("origin/".length) : branch;
}

function unique(values: string[]): string[] {
	return [...new Set(values.filter(Boolean))];
}

async function getCurrentBranch(pi: ExtensionAPI, ctx: ExtensionCommandContext): Promise<string | undefined> {
	const branch = await git(pi, ctx, ["branch", "--show-current"]);
	return branch.stdout.trim() || undefined;
}

async function getBaseCandidates(pi: ExtensionAPI, ctx: ExtensionCommandContext, currentBranch: string): Promise<string[]> {
	const [originHead, locals, remotes] = await Promise.all([
		git(pi, ctx, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]),
		git(pi, ctx, ["branch", "--format=%(refname:short)"]),
		git(pi, ctx, ["branch", "-r", "--format=%(refname:short)"]),
	]);

	const localBranches = splitLines(locals.stdout);
	const remoteBranches = splitLines(remotes.stdout)
		.filter((branch) => !branch.endsWith("/HEAD"))
		.map(stripOrigin);
	const defaultBranch = originHead.code === 0 ? stripOrigin(originHead.stdout.trim()) : undefined;

	const ordered = unique([
		defaultBranch ?? "",
		"main",
		"master",
		...localBranches,
		...remoteBranches,
	]).filter((branch) => branch !== currentBranch);

	return ordered;
}

async function resolveBaseRef(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
	base: string,
): Promise<{ prBase: string; diffRef: string } | undefined> {
	const normalized = stripOrigin(base.trim());
	const candidates = base.startsWith("origin/") ? [base, normalized] : [`origin/${normalized}`, normalized];

	for (const candidate of candidates) {
		const check = await git(pi, ctx, ["rev-parse", "--verify", `${candidate}^{commit}`]);
		if (check.code === 0) return { prBase: normalized, diffRef: candidate };
	}

	notify(ctx, `Base branch not found locally or as origin/${normalized}: ${base}`, "error");
	return undefined;
}

async function chooseBaseBranch(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
	currentBranch: string,
	explicitBase?: string,
): Promise<{ prBase: string; diffRef: string } | undefined> {
	if (explicitBase) return resolveBaseRef(pi, ctx, explicitBase);

	const candidates = await getBaseCandidates(pi, ctx, currentBranch);
	if (candidates.length === 0) {
		notify(ctx, "No candidate base branches found", "error");
		return undefined;
	}

	const selected = ctx.hasUI
		? await ctx.ui.select("Select PR base branch", candidates)
		: candidates[0];

	if (!selected) return undefined;
	return resolveBaseRef(pi, ctx, selected);
}

function buildPrPrompt(input: {
	currentBranch: string;
	base: string;
	commits: string;
	stat: string;
	nameStatus: string;
	diff: string;
	guidance: string;
}): string {
	return [
		"Generate a GitHub pull request title and body for the current branch.",
		"Return exactly this format, with no Markdown fence and no commentary:",
		"<title>",
		"",
		"<body>",
		"",
		"Follow the pull request title and body rules in your instructions exactly.",
		"Base the PR text only on the provided git data and user guidance.",
		input.guidance ? `\nUser guidance:\n${input.guidance}` : "",
		`\nHead branch:\n${input.currentBranch}`,
		`\nBase branch:\n${input.base}`,
		`\nCommits:\n${input.commits}`,
		`\nDiff stat:\n${input.stat}`,
		`\nName/status:\n${input.nameStatus}`,
		`\nDiff:\n${input.diff}`,
	].join("\n");
}

function sanitizePrText(raw: string): PrText {
	const text = stripCodeFence(raw).replace(/\r\n/g, "\n").trim();
	const lines = text.split("\n");
	const titleIndex = lines.findIndex((line) => line.trim().length > 0);
	const title = (titleIndex >= 0 ? lines[titleIndex] : "")
		.replace(/^title:\s*/i, "")
		.replace(/^#+\s*/, "")
		.trim();
	let body = titleIndex >= 0 ? lines.slice(titleIndex + 1).join("\n").trim() : "";
	body = body.replace(/^body:\s*/i, "").trim();
	body = body
		.split("\n")
		.filter((line) => !/^\s*(Co-authored-by:|Generated with|Created by|Authored by)/i.test(line))
		.join("\n")
		.trim();

	return {
		title,
		body: body || `## Summary\n- ${title}\n\n## Tests\n- Not run (not specified)\n\n## Notes for reviewers\n- None`,
	};
}

function validatePrText(pr: PrText): string | undefined {
	if (!pr.title) return "Generated PR title is empty";
	if (pr.title.length > 120) return `Generated PR title is too long (${pr.title.length} chars; max 120)`;
	if (!pr.body) return "Generated PR body is empty";
	if (/\b(Claude|ChatGPT|OpenAI|Anthropic|Copilot|pi coding agent|AI assistant)\b/i.test(`${pr.title}\n${pr.body}`)) {
		return "Generated PR text contains AI/tool attribution";
	}
	return undefined;
}

async function generatePrText(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
	currentBranch: string,
	base: { prBase: string; diffRef: string },
	guidance: string,
): Promise<PrText | undefined> {
	const [commits, stat, nameStatus, diff] = await Promise.all([
		git(pi, ctx, ["log", "--oneline", `${base.diffRef}..HEAD`]),
		git(pi, ctx, ["diff", "--stat", "--find-renames", `${base.diffRef}...HEAD`]),
		git(pi, ctx, ["diff", "--name-status", "--find-renames", `${base.diffRef}...HEAD`]),
		git(pi, ctx, ["diff", "--find-renames", "--no-ext-diff", `${base.diffRef}...HEAD`]),
	]);

	if (!commits.stdout.trim()) {
		notify(ctx, `No commits found on ${currentBranch} relative to ${base.prBase}`, "error");
		return undefined;
	}

	const model = resolveModel(ctx);
	if (!model) {
		notify(ctx, "No active model found for PR generation", "error");
		return undefined;
	}

	const thinking = resolveThinking(ctx);

	const prompt = buildPrPrompt({
		currentBranch,
		base: base.prBase,
		commits: commits.stdout.trim(),
		stat: stat.stdout.trim(),
		nameStatus: nameStatus.stdout.trim(),
		diff: truncateForPrompt(diff.stdout.trim(), 80_000),
		guidance,
	});

	try {
		const response = await generateTextWithPi(
			pi,
			ctx,
			model,
			`You write concise, accurate GitHub pull request titles and bodies.\n\n${SKILL_INSTRUCTIONS}`,
			prompt,
			180_000,
			thinking,
		);

		const pr = sanitizePrText(response ?? "");
		const validationError = validatePrText(pr);
		if (validationError) {
			notify(ctx, validationError, "error");
			return undefined;
		}
		return pr;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		notify(ctx, `PR text generation failed: ${message}`, "error");
		return undefined;
	}
}

async function pushCurrentBranch(pi: ExtensionAPI, ctx: ExtensionCommandContext, currentBranch: string): Promise<boolean> {
	const upstream = await git(pi, ctx, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
	const push = upstream.code === 0
		? await git(pi, ctx, ["push"], 120_000)
		: await git(pi, ctx, ["push", "-u", "origin", currentBranch], 120_000);

	if (push.code !== 0) {
		notify(ctx, push.stderr.trim() || "git push failed", "error");
		return false;
	}

	return true;
}

async function getExistingPrUrl(pi: ExtensionAPI, ctx: ExtensionCommandContext): Promise<string | undefined> {
	const result = await pi.exec("gh", ["pr", "view", "--json", "url"], { cwd: ctx.cwd, timeout: 30_000 });
	if (result.code !== 0) return undefined;
	try {
		const parsed = JSON.parse(result.stdout) as { url?: string };
		return parsed.url;
	} catch {
		return undefined;
	}
}

async function createPr(
	pi: ExtensionAPI,
	ctx: ExtensionCommandContext,
	currentBranch: string,
	base: { prBase: string; diffRef: string },
	pr: PrText,
	draft: boolean,
): Promise<string | undefined> {
	const dir = mkdtempSync(join(tmpdir(), "pi-pr-"));
	const bodyFile = join(dir, "PULL_REQUEST_BODY.md");

	try {
		writeFileSync(bodyFile, `${pr.body}\n`, "utf8");
		const args = [
			"pr",
			"create",
			"--base",
			base.prBase,
			"--head",
			currentBranch,
			"--title",
			pr.title,
			"--body-file",
			bodyFile,
		];
		if (draft) args.push("--draft");

		const result = await pi.exec("gh", args, { cwd: ctx.cwd, timeout: 120_000 });
		if (result.code !== 0) {
			notify(ctx, result.stderr.trim() || "gh pr create failed", "error");
			return undefined;
		}

		return result.stdout.trim().split("\n").find((line) => /^https?:\/\//.test(line.trim()))?.trim() ?? result.stdout.trim();
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

async function openPullRequest(pi: ExtensionAPI, ctx: ExtensionCommandContext, args: string): Promise<void> {
	await ctx.waitForIdle();
	if (!(await assertSafeRepoState(pi, ctx))) return;

	const parsed = parsePrArgs(args);
	const currentBranch = await getCurrentBranch(pi, ctx);
	if (!currentBranch) {
		notify(ctx, "Refusing to open a PR from detached HEAD", "error");
		return;
	}

	const base = await chooseBaseBranch(pi, ctx, currentBranch, parsed.base);
	if (!base) return;
	if (base.prBase === currentBranch) {
		notify(ctx, "Current branch and PR base branch are the same", "error");
		return;
	}

	const status = await git(pi, ctx, ["status", "--porcelain=v1"]);
	if (status.code !== 0) {
		notify(ctx, status.stderr.trim() || "Could not inspect git status", "error");
		return;
	}

	if (status.stdout.trim()) {
		if (parsed.noCommit) {
			notify(ctx, "Worktree has uncommitted changes and --no-commit was provided", "error");
			return;
		}

		const shouldCommit = ctx.hasUI
			? await ctx.ui.confirm("Commit changes before PR?", "This will run git add -A and create one Conventional Commit.")
			: true;
		if (!shouldCommit) return;

		const committed = await commitAll(pi, ctx, parsed.guidance);
		if (!committed) return;
	}

	const model = resolveModel(ctx);
	const thinking = resolveThinking(ctx);
	notify(ctx, `Generating PR title and body with ${describeConfiguredGenerationModel(ctx)} (thinking: ${thinking})...`, "info");
	const pr = await generatePrText(pi, ctx, currentBranch, base, parsed.guidance);
	if (!pr) return;

	if (ctx.hasUI) {
		const ok = await ctx.ui.confirm(
			parsed.draft ? "Create draft PR?" : "Create PR?",
			[`Base: ${base.prBase}`, `Head: ${currentBranch}`, `Title: ${pr.title}`, "", pr.body].join("\n"),
		);
		if (!ok) return;
	}

	notify(ctx, `Pushing ${currentBranch}...`, "info");
	if (!(await pushCurrentBranch(pi, ctx, currentBranch))) return;

	const existingUrl = await getExistingPrUrl(pi, ctx);
	if (existingUrl) {
		notify(ctx, `PR already exists: ${existingUrl}`, "info");
		return;
	}

	const url = await createPr(pi, ctx, currentBranch, base, pr, parsed.draft);
	if (url) notify(ctx, `Created PR: ${url}`, "info");
}

export default function conventionalCommitExtension(pi: ExtensionAPI) {
	pi.registerCommand("commit", {
		description: "Stage all changes and create one Conventional Commit using currently selected model & reasoning level",
		handler: async (args, ctx) => commitAll(pi, ctx, args),
	});

	pi.registerCommand("pr", {
		description: "Commit dirty changes if requested, push the branch, and create a GitHub PR using currently selected model & reasoning level",
		handler: async (args, ctx) => openPullRequest(pi, ctx, args),
	});
}
