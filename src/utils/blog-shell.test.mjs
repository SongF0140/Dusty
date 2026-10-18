import assert from "node:assert/strict";
import test from "node:test";
import { createBlogShell, normalizeShellPath } from "./blog-shell.ts";

const files = [
    { path: "/blog/Hello World.md", title: "Hello World", url: "/posts/hello/", content: "line1\nline2" },
    { path: "/blog/中文文章.md", title: "中文文章", contentUrl: "/api/article.json" },
    { path: "/blog/secret.md", title: "secret", locked: true },
];
const shell = createBlogShell(files, [{ command: "/home", path: "/", label: "Home" }, { command: "/blog", path: "/archive/", label: "Blog" }]);
const state = () => ({ cwd: "/", previous: "/" });

test("directory navigation supports /blog, relative paths, parent and previous directory", () => {
    const s = state();
    shell.execute("/blog", s);
    assert.deepEqual(shell.execute("pwd", s).lines, ["/blog"]);
    assert.equal(shell.execute("ls", s).entries.length, 3);
    shell.execute("cd ..", s); assert.equal(s.cwd, "/");
    shell.execute("cd -", s); assert.equal(s.cwd, "/blog");
    assert.equal(normalizeShellPath("../../../../blog/./", s.cwd), "/blog");
    shell.execute("cd ~", s); assert.equal(s.cwd, "/");
});
test("cat/open support quoted and escaped paths without interpreting code", () => {
    const s = state(); shell.execute("cd /blog", s);
    assert.equal(shell.execute('cat "Hello World.md"', s).navigate, "/posts/hello/");
    assert.equal(shell.execute("cat Hello\\ World.md", s).navigate, "/posts/hello/");
    assert.equal(shell.execute('cat "Hello World.md"', s).read, undefined);
    assert.equal(shell.execute('open "Hello World.md"', s).navigate, "/posts/hello/");
    assert.deepEqual(shell.execute('echo "<script>alert(1)</script>"', s).lines, ["<script>alert(1)</script>"]);
    assert.ok(shell.execute("cat secret.md", s).error.includes("password protected"));
    assert.equal(shell.execute("cat secret.md", s).read, undefined);
});

test("category directories list only their articles and completion never navigates", () => {
    const categorized = createBlogShell([
        { path: "/blog/Git/分支.md", title: "分支", url: "/posts/git/branch/" },
        { path: "/blog/Qt学习/窗口.md", title: "窗口", url: "/posts/qt/window/" },
        { path: "/blog/前端/布局.md", title: "布局", url: "/posts/web/layout/" },
    ], []);
    const s = state();
    categorized.execute("cd /blog", s);
    assert.ok(categorized.execute("ls", s).entries.every(entry => entry.directory));
    assert.equal(categorized.execute("ls", s).entries.length, 3);
    categorized.execute("cd Git", s);
    assert.deepEqual(categorized.execute("ls", s).entries.map(entry => entry.name), ["分支.md"]);
    assert.deepEqual(categorized.complete("cat 分", s), ["cat 分支.md"]);
    assert.equal(s.cwd, "/blog/Git");
    assert.equal(categorized.execute("cat 分支.md", s).navigate, "/posts/git/branch/");
    assert.deepEqual(categorized.complete("cat ../前端/布", s), ["cat ../前端/布局.md"]);
});
test("completion covers command names, directories, relative and Chinese article paths", () => {
    const s = state();
    assert.deepEqual(shell.complete("pw", s), ["pwd"]);
    assert.deepEqual(shell.complete("cd /bl", s), ["cd /blog/"]);
    assert.deepEqual(shell.complete("cat /blog/中", s), ["cat /blog/中文文章.md"]);
    shell.execute("cd /blog", s);
    assert.deepEqual(shell.complete('cat "Hello', s), ["cat Hello\\ World.md"]);
    assert.deepEqual(shell.complete("cat ", s).length, 3);
    assert.deepEqual(shell.complete("cd ", s), []);
});
test("errors only suggest /help; help appears on explicit request", () => {
    for (const value of ["badcommand", "cat", "cd missing", "ls -Z", "cat /blog", "cat missing.md", 'cat "bad', "head -n nope file"]) {
        const result = shell.execute(value, state());
        assert.ok(result.error.endsWith("Type /help for usage."), value);
        assert.equal(result.lines, undefined);
    }
    assert.ok(shell.execute("/help", state()).lines.some(line => line.includes("cd /blog")));
});
test("ls flags, head/tail, history and clear have shell semantics", () => {
    const s = { cwd: "/blog", previous: "/" };
    assert.equal(shell.execute("ls -la", s).lines.length, 5);
    assert.equal(shell.execute('head -n 1 "Hello World.md"', s).lineLimit, 1);
    assert.equal(shell.execute('tail -n 0 "Hello World.md"', s).tail, true);
    assert.deepEqual(shell.execute("history", s, ["pwd", "ls"]).lines, ["1  pwd", "2  ls"]);
    assert.equal(shell.execute("clear", s).clear, true);
    assert.equal(shell.execute("exit", s).close, true);
});
