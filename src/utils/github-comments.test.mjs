import assert from "node:assert/strict";
import test from "node:test";
import { githubCommentTerm, isGithubCommentsConfigured } from "./github-comments.ts";
test("articles and friends use distinct stable discussion identifiers", () => {
    assert.equal(githubCommentTerm("/posts/%E7%AC%94%E8%AE%B0/#section"), "/posts/笔记");
    assert.equal(githubCommentTerm("/friends/"), "/friends");
    assert.notEqual(githubCommentTerm("/posts/a/"), githubCommentTerm("/posts/b/"));
});
test("an incomplete GitHub setup never renders a broken login widget", () => {
    assert.equal(isGithubCommentsConfigured({ repo: "SongF0140/Dusty", repoId: "R_kgDOTBBh6w", categoryId: "" }), false);
    assert.equal(isGithubCommentsConfigured({ repo: "SongF0140/Dusty", repoId: "R_kgDOTBBh6w", categoryId: "DIC_valid" }), true);
});
