import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Claude-compatible skill shell interpolation for pi.
 *
 * Supports inline !`command` and fenced ```! blocks in skill markdown. Before
 * running anything, each command must match a Bash rule from the skill's
 * allowed-tools frontmatter. Fenced blocks are intentionally strict: one simple
 * command per non-empty line, with shell control operators/redirection blocked.
 */

const TIMEOUT_MS = 10_000;

type Frontmatter = Record<string, unknown> & {
	"allowed-tools"?: unknown;
};

type InterpolationMatch = {
	start: number;
	end: number;
	full: string;
	commands: string[];
	script: string;
};

type BashRule =
	| { kind: "all" }
	| {
			kind: "pattern";
			pattern: string;
			regex: RegExp;
	  };

function unquoteYamlScalar(value: string): string {
	return value.trim().replace(/^(["'])(.*)\1$/, "$2");
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
	const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	if (!normalized.startsWith("---\n")) return { frontmatter: {}, body: normalized };

	const endIndex = normalized.indexOf("\n---", 4);
	if (endIndex === -1) return { frontmatter: {}, body: normalized };

	const yaml = normalized.slice(4, endIndex);
	const body = normalized.slice(endIndex + 4).trim();
	const frontmatter: Frontmatter = {};
	let listKey: string | null = null;

	for (const line of yaml.split("\n")) {
		if (!line.trim() || line.trimStart().startsWith("#")) continue;

		const listMatch = line.match(/^\s*-\s+(.*)$/);
		if (listMatch && listKey) {
			const current = frontmatter[listKey];
			frontmatter[listKey] = Array.isArray(current) ? [...current, unquoteYamlScalar(listMatch[1])] : [unquoteYamlScalar(listMatch[1])];
			continue;
		}

		const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
		if (!keyMatch) continue;

		const [, key, value] = keyMatch;
		listKey = key;
		frontmatter[key] = value ? unquoteYamlScalar(value) : [];
	}

	return { frontmatter, body };
}

function splitAllowedTools(value: unknown): string[] {
	const raw = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join(" ") : typeof value === "string" ? value : "";
	const tokens: string[] = [];
	let current = "";
	let depth = 0;

	for (const char of raw) {
		if (/\s/.test(char) && depth === 0) {
			if (current.trim()) tokens.push(current.trim());
			current = "";
			continue;
		}

		if (char === "(") depth++;
		if (char === ")" && depth > 0) depth--;
		current += char;
	}

	if (current.trim()) tokens.push(current.trim());
	return tokens;
}

function normalizePattern(pattern: string): string {
	const trimmed = pattern.trim();
	if (trimmed.endsWith(":*")) {
		return `${trimmed.slice(0, -2)} *`;
	}
	return trimmed;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globToRegExp(pattern: string): RegExp {
	const normalized = pattern.replace(/\s+/g, " ").trim();
	let source = "^";
	for (const char of normalized) {
		source += char === "*" ? ".*" : escapeRegExp(char);
	}
	source += "$";
	return new RegExp(source);
}

function parseBashRules(allowedTools: unknown): BashRule[] {
	const rules: BashRule[] = [];
	for (const token of splitAllowedTools(allowedTools)) {
		if (token === "Bash") {
			rules.push({ kind: "all" });
			continue;
		}

		const match = token.match(/^Bash\((.*)\)$/);
		if (!match) continue;

		const pattern = normalizePattern(match[1]);
		if (!pattern || pattern === "*") {
			rules.push({ kind: "all" });
			continue;
		}

		rules.push({ kind: "pattern", pattern, regex: globToRegExp(pattern) });
	}
	return rules;
}

function normalizeCommand(command: string): string {
	return command.replace(/\s+/g, " ").trim();
}

function unsafeReason(command: string): string | null {
	if (command.includes("\n") || command.includes("\r")) return "inline commands must be single-line; use a ```! block";
	if (command.endsWith("\\")) return "line continuations are not allowed";
	if (/`|\$\(/.test(command)) return "command substitution is not allowed";
	if (/[;&|<>]/.test(command)) return "shell control operators and redirection are not allowed";
	return null;
}

function commandAllowed(command: string, rules: BashRule[]): { allowed: boolean; reason?: string } {
	const normalized = normalizeCommand(command);
	if (!normalized) return { allowed: false, reason: "empty command" };

	const unsafe = unsafeReason(normalized);
	if (unsafe) return { allowed: false, reason: unsafe };

	if (rules.length === 0) return { allowed: false, reason: "no Bash(...) rules in allowed-tools" };

	for (const rule of rules) {
		if (rule.kind === "all") return { allowed: true };
		if (rule.regex.test(normalized)) return { allowed: true };
	}

	return { allowed: false, reason: `not matched by allowed-tools: ${rules.map(describeRule).join(" ")}` };
}

function describeRule(rule: BashRule): string {
	return rule.kind === "all" ? "Bash" : `Bash(${rule.pattern})`;
}

function errorText(command: string, reason: string): string {
	return `[error: \`${command.trim()}\` not executed: ${reason}]`;
}

function collectInterpolations(content: string): InterpolationMatch[] {
	const matches: InterpolationMatch[] = [];
	const fencedRanges: Array<{ start: number; end: number }> = [];
	const fencedPattern = /^```![ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm;

	for (const match of content.matchAll(fencedPattern)) {
		const full = match[0];
		const script = match[1];
		const start = match.index ?? 0;
		const end = start + full.length;
		const commands = script
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("#"));

		matches.push({ start, end, full, script: commands.join("\n"), commands });
		fencedRanges.push({ start, end });
	}

	const inlinePattern = /!`([^`]+)`/g;
	for (const match of content.matchAll(inlinePattern)) {
		const full = match[0];
		const command = match[1].trim();
		const start = match.index ?? 0;
		const end = start + full.length;

		if (fencedRanges.some((range) => start >= range.start && end <= range.end)) continue;
		matches.push({ start, end, full, script: command, commands: [command] });
	}

	return matches.sort((a, b) => a.start - b.start);
}

async function runScript(pi: ExtensionAPI, script: string, cwd: string, signal?: AbortSignal): Promise<string> {
	const result = await pi.exec("bash", ["-lc", script], { cwd, timeout: TIMEOUT_MS, signal });
	const output = (result.stdout || result.stderr || "").trimEnd();
	if (result.code !== 0) {
		const detail = output ? `: ${output.slice(0, 500)}` : "";
		return `[error: command failed with exit code ${result.code}${detail}]`;
	}
	return output;
}

async function renderInterpolations(
	pi: ExtensionAPI,
	content: string,
	frontmatter: Frontmatter,
	cwd: string,
	signal?: AbortSignal,
): Promise<string> {
	const matches = collectInterpolations(content);
	if (matches.length === 0) return content;

	const rules = parseBashRules(frontmatter["allowed-tools"]);
	let rendered = "";
	let cursor = 0;

	for (const match of matches) {
		rendered += content.slice(cursor, match.start);
		cursor = match.end;

		const denied = match.commands
			.map((command) => ({ command, result: commandAllowed(command, rules) }))
			.find(({ result }) => !result.allowed);

		if (denied) {
			rendered += errorText(denied.command, denied.result.reason ?? "not allowed");
			continue;
		}

		rendered += await runScript(pi, match.script, cwd, signal);
	}

	rendered += content.slice(cursor);
	return rendered;
}

function getSkillCommand(pi: ExtensionAPI, skillName: string) {
	return pi.getCommands().find((command) => command.source === "skill" && (command.name === `skill:${skillName}` || command.name === skillName));
}

function isKnownSkillPath(pi: ExtensionAPI, path: string): boolean {
	const resolvedPath = resolve(path);
	return pi.getCommands().some((command) => command.source === "skill" && command.sourceInfo?.path && resolve(command.sourceInfo.path) === resolvedPath);
}

async function renderSkillFile(pi: ExtensionAPI, filePath: string, signal?: AbortSignal): Promise<string> {
	const raw = readFileSync(filePath, "utf-8");
	const { frontmatter, body } = parseFrontmatter(raw);
	return renderInterpolations(pi, body.trim(), frontmatter, dirname(filePath), signal);
}

export default function skillInterpolation(pi: ExtensionAPI) {
	pi.on("input", async (event, ctx) => {
		if (event.source === "extension" || !event.text.startsWith("/skill:")) {
			return { action: "continue" as const };
		}

		const spaceIndex = event.text.indexOf(" ");
		const skillName = spaceIndex === -1 ? event.text.slice(7) : event.text.slice(7, spaceIndex);
		const args = spaceIndex === -1 ? "" : event.text.slice(spaceIndex + 1).trim();
		const command = getSkillCommand(pi, skillName);
		const skillFile = command?.sourceInfo?.path;
		if (!skillFile) return { action: "continue" as const };

		const rendered = await renderSkillFile(pi, skillFile, ctx.signal);
		const baseDir = dirname(skillFile);
		const block = `<skill name="${skillName}" location="${skillFile}">\nReferences are relative to ${baseDir}.\n\n${rendered}\n</skill>`;

		return { action: "transform" as const, text: args ? `${block}\n\n${args}` : block, images: event.images };
	});

	pi.on("tool_result", async (event, ctx) => {
		if (event.toolName !== "read") return;

		const path = (event as any).input?.path as string | undefined;
		if (!path || !isKnownSkillPath(pi, path)) return;

		let changed = false;
		const content = [];
		for (const piece of event.content ?? []) {
			if (piece.type !== "text" || typeof piece.text !== "string") {
				content.push(piece);
				continue;
			}

			const { frontmatter } = parseFrontmatter(piece.text);
			const rendered = await renderInterpolations(pi, piece.text, frontmatter, dirname(path), ctx.signal);
			changed = changed || rendered !== piece.text;
			content.push({ ...piece, text: rendered });
		}

		if (changed) return { content };
	});
}
