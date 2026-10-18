export interface ShellFile {
	path: string;
	title: string;
	url?: string;
	contentUrl?: string;
	content?: string;
	locked?: boolean;
}
export interface ShellState { cwd: string; previous: string }
export interface ShellResult {
	lines?: string[];
	entries?: { name: string; path: string; directory: boolean; title?: string }[];
	error?: string;
	read?: ShellFile[];
	lineLimit?: number;
	tail?: boolean;
	navigate?: string;
	clear?: boolean;
	close?: boolean;
}
export const shellCommands = ["pwd", "cd", "ls", "cat", "head", "tail", "open", "help", "/help", "clear", "history", "echo", "whoami", "date", "uname", "exit"];
export const shellHelp = [
	"DUSTY SHELL — HELP",
	"Browse the blog as a virtual filesystem.",
	"pwd                  Print the current directory",
	"cd /blog             Browse article categories",
	"cd /blog/Git         Enter a category (not a tag)",
	"cd .. / cd -         Parent / previous directory",
	"ls [path]            List files and directories",
	"ls -la               Include details and dot entries",
	"cat <file>           Open the article in the page",
	"head [-n 10] <file>   Read the first lines",
	"tail [-n 10] <file>   Read the last lines",
	"open <file|path>     Open an article or site page",
	"echo <text>          Print text",
	"history              Show command history",
	"whoami / date / uname",
	"clear / Ctrl+L       Clear the terminal",
	"exit / Esc           Close the terminal",
	"/blog                Shortcut for cd /blog",
	"/home, /archive, ... Open a site page",
	"Tab / Shift+Tab      Complete commands and paths",
	"↑ / ↓                Browse command history",
	"Quote paths with spaces, or use Tab to escape them.",
	"Example: cd /blog → ls → cd Git → ls → cat <Tab> → Enter",
];

export function normalizeShellPath(value: string, cwd = "/") {
	const expanded = value === "~" ? "/" : value.startsWith("~/") ? value.slice(1) : value;
	const parts: string[] = [];
	for (const part of (expanded.startsWith("/") ? expanded : `${cwd}/${expanded}`).split("/")) {
		if (!part || part === ".") continue;
		if (part === "..") parts.pop();
		else parts.push(part);
	}
	return `/${parts.join("/")}`;
}

function tokenize(value: string, partial = false): string[] {
	const words: string[] = [];
	let word = "", quote = "", escaped = false, started = false;
	for (const char of value) {
		if (escaped) { word += char; escaped = false; started = true; continue; }
		if (char === "\\" && quote !== "'") { escaped = true; started = true; continue; }
		if (quote) { if (char === quote) quote = ""; else word += char; continue; }
		if (char === '"' || char === "'") { quote = char; started = true; continue; }
		if (/\s/.test(char)) { if (started) { words.push(word); word = ""; started = false; } }
		else { word += char; started = true; }
	}
	if (!partial && (quote || escaped)) throw new Error("Unclosed quote or incomplete escape.");
	if (started) words.push(word);
	if (partial && /\s$/.test(value) && !quote && !escaped) words.push("");
	return words;
}

export function createBlogShell(files: ShellFile[], routes: { command: string; path: string; label: string }[]) {
	const fileMap = new Map(files.map(file => [file.path, file]));
	const dirs = new Set(["/", "/blog"]);
	const routeMap = new Map(routes.filter(route => route.path).map(route => [route.command, route.path]));
	for (const route of routeMap.keys()) dirs.add(route);
	for (const file of files) {
		let parent = file.path.slice(0, file.path.lastIndexOf("/")) || "/";
		while (parent !== "/") { dirs.add(parent); parent = parent.slice(0, parent.lastIndexOf("/")) || "/"; }
	}
	const entries = (path: string) => {
		const prefix = path === "/" ? "/" : `${path}/`;
		return [
			...[...dirs].filter(dir => dir !== path && dir.startsWith(prefix) && !dir.slice(prefix.length).includes("/")).map(dir => ({ name: `${dir.slice(prefix.length)}/`, path: dir, directory: true, title: "" })),
			...files.filter(file => file.path.startsWith(prefix) && !file.path.slice(prefix.length).includes("/")).map(file => ({ name: file.path.slice(prefix.length), path: file.path, directory: false, title: file.title })),
		].sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name, "zh-CN"));
	};
	function execute(value: string, state: ShellState, history: string[] = []): ShellResult {
		const fail = (message: string): ShellResult => ({ error: `${message} Type /help for usage.` });
		let words: string[];
		try { words = tokenize(value); } catch (error) { return fail((error as Error).message); }
		if (!words.length) return {};
		let [cmd, ...args] = words;
		if (["/help", "/clear", "/close"].includes(cmd)) cmd = cmd === "/close" ? "exit" : cmd.slice(1);
		if (cmd === "/blog") { cmd = "cd"; args = ["/blog", ...args]; }
		else if (routeMap.has(cmd)) { if (args.length) return fail(`${cmd}: unexpected argument.`); return { navigate: routeMap.get(cmd) }; }
		if (["help", "pwd", "clear", "exit", "history", "whoami", "date", "uname"].includes(cmd) && args.length) return fail(`${cmd}: unexpected argument.`);
		if (cmd === "help") return { lines: shellHelp };
		if (cmd === "pwd") return { lines: [state.cwd] };
		if (cmd === "clear") return { clear: true };
		if (cmd === "exit") return { close: true };
		if (cmd === "history") return { lines: history.map((line, i) => `${i + 1}  ${line}`) };
		if (cmd === "whoami") return { lines: ["guest"] };
		if (cmd === "date") return { lines: [new Date().toString()] };
		if (cmd === "uname") return { lines: ["Dusty Web Shell"] };
		if (cmd === "echo") return { lines: [args.join(" ")] };
		if (cmd === "cd") {
			if (args.length > 1) return fail("cd: too many arguments.");
			const path = args[0] === "-" ? state.previous : normalizeShellPath(args[0] || "/", state.cwd);
			if (!dirs.has(path)) return fail(`cd: ${args[0]}: ${fileMap.has(path) ? "not a directory" : "no such directory"}.`);
			state.previous = state.cwd; state.cwd = path;
			return args[0] === "-" ? { lines: [path] } : {};
		}
		if (cmd === "ls") {
			const flags = args.filter(arg => arg.startsWith("-"));
			if (flags.some(flag => !/^-[al]+$/.test(flag))) return fail("ls: unsupported option.");
			args = args.filter(arg => !arg.startsWith("-"));
			if (args.length > 1) return fail("ls: too many paths.");
			const path = normalizeShellPath(args[0] || state.cwd, state.cwd);
			const file = fileMap.get(path);
			if (file) return { entries: [{ name: path.split("/").pop()!, path, directory: false, title: file.title }] };
			if (!dirs.has(path)) return fail(`ls: ${args[0]}: no such file or directory.`);
			const items = entries(path);
			if (flags.some(flag => flag.includes("a"))) items.unshift({ name: "./", path, directory: true, title: "" }, { name: "../", path: normalizeShellPath("..", path), directory: true, title: "" });
			return flags.some(flag => flag.includes("l")) ? { lines: items.map(item => `${item.directory ? "dr-xr-xr-x" : "-r--r--r--"}  guest  ${item.name}`) } : { entries: items };
		}
		if (["cat", "head", "tail", "open"].includes(cmd)) {
			let lineLimit = cmd === "cat" ? undefined : 10;
			if (["head", "tail"].includes(cmd) && args[0] === "-n") {
				if (!/^\d+$/.test(args[1] || "") || Number(args[1]) > 1000) return fail(`${cmd}: invalid line count.`);
				lineLimit = Number(args[1]); args = args.slice(2);
			}
			if (!args.length) return fail(`${cmd}: missing file operand.`);
			if (args.some(arg => arg.startsWith("-"))) return fail(`${cmd}: unsupported option.`);
			if (["cat", "open"].includes(cmd) && args.length > 1) return fail(`${cmd}: too many paths.`);
			const selected: ShellFile[] = [];
			for (const arg of args) {
				const path = normalizeShellPath(arg, state.cwd);
				if (cmd === "open" && (routeMap.has(path) || path === "/")) return { navigate: path === "/" ? routeMap.get("/home") || "/" : routeMap.get(path) };
				if (dirs.has(path)) return fail(`${cmd}: ${arg}: is a directory.`);
				const file = fileMap.get(path);
				if (!file) return fail(`${cmd}: ${arg}: no such file.`);
				if ((cmd === "open" || cmd === "cat") && file.url) return { navigate: file.url };
				if (file.locked) return fail(`${cmd}: this article is password protected.`);
				selected.push(file);
			}
			return { read: selected, lineLimit, tail: cmd === "tail" };
		}
		return fail(`${cmd}: command not found.`);
	}
	function complete(value: string, state: ShellState) {
		const words = tokenize(value, true);
		if (words.length <= 1) return [...new Set([...shellCommands, ...routes.map(route => route.command)])].filter(cmd => cmd.startsWith(words[0] || ""));
		const cmd = words[0];
		if (!["cd", "ls", "cat", "head", "tail", "open"].includes(cmd)) return [];
		const token = words.at(-1)!;
		const slash = token.lastIndexOf("/");
		const prefix = token.slice(0, slash + 1);
		const name = token.slice(slash + 1);
		const parent = normalizeShellPath(prefix || ".", state.cwd);
		const escape = (text: string) => text.replace(/([\s\\"'])/g, "\\$1");
		const before = words.slice(0, -1).map(escape).join(" ");
		return entries(parent).filter(item => (cmd !== "cd" || item.directory) && item.name.toLowerCase().startsWith(name.toLowerCase())).map(item => `${before} ${escape(prefix + item.name)}`);
	}
	return { execute, complete };
}
