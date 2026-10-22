/** Split Postgres scripts at top-level semicolons, preserving PL/pgSQL dollar bodies. */
export function splitSqlCommands(sql: string): string[] {
	const commands: string[] = [];
	let start = 0;
	let quote = "";
	let dollar = "";
	let line = false;
	let block = 0;
	for (let i = 0; i < sql.length; i++) {
		const c = sql[i];
		const next = sql[i + 1];
		if (line) {
			if (c === "\n") line = false;
			continue;
		}
		if (block) {
			if (c === "/" && next === "*") {
				block++;
				i++;
			} else if (c === "*" && next === "/") {
				block--;
				i++;
			}
			continue;
		}
		if (dollar) {
			if (sql.startsWith(dollar, i)) {
				i += dollar.length - 1;
				dollar = "";
			}
			continue;
		}
		if (quote) {
			if (c === quote) {
				if (next === quote) i++;
				else quote = "";
			}
			continue;
		}
		if (c === "-" && next === "-") {
			line = true;
			i++;
			continue;
		}
		if (c === "/" && next === "*") {
			block = 1;
			i++;
			continue;
		}
		if (c === "'" || c === '"') {
			quote = c;
			continue;
		}
		if (c === "$") {
			const marker = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
			if (marker) {
				dollar = marker[0];
				i += dollar.length - 1;
				continue;
			}
		}
		if (c === ";") {
			commands.push(sql.slice(start, i).trim());
			start = i + 1;
		}
	}
	if (quote || dollar || block) throw new Error("Incomplete SQL migration");
	commands.push(sql.slice(start).trim());
	return commands
		.map((command) => command.replace(/^(?:\s*--[^\n]*(?:\n|$))*/, "").trim())
		.filter((command) => command && !/^(BEGIN|COMMIT)$/i.test(command));
}
