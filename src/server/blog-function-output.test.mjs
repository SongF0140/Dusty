import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

test("compiled Vercel functions load and serve status without TypeScript sources", async () => {
	const root = fileURLToPath(new URL("../../", import.meta.url));
	await mkdir(join(root, "artifacts"), { recursive: true });
	const output = await mkdtemp(join(root, "artifacts/function-output-"));
	try {
		const config = ts.readConfigFile(
			join(root, "tsconfig.json"),
			ts.sys.readFile,
		);
		const { options } = ts.parseJsonConfigFileContent(
			config.config,
			ts.sys,
			root,
		);
		const files = [
			"api/blog-auth.ts",
			"api/blog-chat.ts",
			"api/blog-worker.ts",
			...[
				"blog-auth",
				"blog-chat",
				"blog-node-adapter",
				"blog-agent-runtime",
				"blog-queue",
				"blog-diagnostics",
				"blog-model-fetch",
			].map((name) => `src/server/${name}.ts`),
		];
		for (const file of files) {
			const target = join(output, file.replace(/\.ts$/, ".js"));
			await mkdir(dirname(target), { recursive: true });
			const result = ts.transpileModule(
				await readFile(join(root, file), "utf8"),
				{
					fileName: file,
					compilerOptions: { ...options, module: ts.ModuleKind.ESNext },
				},
			);
			await writeFile(target, result.outputText);
		}
		await writeFile(join(output, "package.json"), '{"type":"module"}');
		await symlink(join(root, "vendor"), join(output, "vendor"), "junction");
		const env = { ...process.env };
		for (const key of Object.keys(env))
			if (
				key.startsWith("BLOG_") ||
				["DATABASE_URL", "POSTGRES_URL"].includes(key)
			)
				delete env[key];
		const result = execFileSync(
			process.execPath,
			[
				"--input-type=module",
				"-e",
				`
			for (const name of ['auth', 'chat', 'worker']) {
				const {default: handler} = await import('./api/blog-' + name + '.js');
				const response = {statusCode: 0, setHeader() {}, end(body) { this.body = body; }};
				await handler({method:'GET', url:'/api/blog-' + name, headers:{}}, response);
				console.log(JSON.stringify({name, status:response.statusCode, body:response.body}));
			}
		`,
			],
			{ cwd: output, env, encoding: "utf8" },
		);
		const rows = result
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line));
		assert.deepEqual(
			rows.map((row) => row.status),
			[200, 200, 403],
		);
		assert.equal(JSON.parse(rows[0].body).configured, false);
		assert.equal(JSON.parse(rows[1].body).engine, "StarryLin");
	} finally {
		await rm(join(output, "vendor"), { recursive: true, force: true });
		await rm(output, { recursive: true, force: true });
	}
});
