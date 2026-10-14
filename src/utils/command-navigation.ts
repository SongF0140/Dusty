export const navigationCommands = [
	{ command: "/home", path: "/", label: "Home" },
	{ command: "/blog", path: "/archive/", label: "Posts" },
	{ command: "/note", path: "/categories/", label: "Notes" },
	{ command: "/archive", path: "/archive/", label: "Archive" },
	{ command: "/categories", path: "/categories/", label: "Categories" },
	{ command: "/tags", path: "/tags/", label: "Tags" },
	{ command: "/friends", path: "/friends/", label: "Friends", pageKey: "friends" },
	{ command: "/guestbook", path: "/guestbook/", label: "Guestbook", pageKey: "guestbook" },
	{ command: "/bangumi", path: "/bangumi/", label: "Watchlist", pageKey: "bangumi" },
	{ command: "/about", path: "/about/", label: "About" },
	{ command: "/search", path: "/search/", label: "Search" },
	{ command: "/help", path: "", label: "Commands" },
	{ command: "/clear", path: "", label: "Clear" },
	{ command: "/close", path: "", label: "Close" },
] as const;

export function completeCommand(value: string, commands: readonly string[]): string[] {
	const prefix = value.trim().toLowerCase();
	return commands.filter((command) => command.startsWith(prefix));
}

export function resolveCommand<T extends { command: string; path: string }>(
	value: string,
	commands: readonly T[],
) {
	return commands.find((item) => item.command === value.trim().toLowerCase());
}
