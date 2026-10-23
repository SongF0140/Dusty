import assert from "node:assert/strict";
import test from "node:test";
import { needsArticleClarification, refersToArticle } from "./blog-reading-context.ts";
const posts = [{ id:'git',title:'Git 撤销与回退',url:'/posts/git/' }];
test('ambiguous reading needs an article, while named articles and general knowledge remain usable',()=>{
    for(const question of ['这篇文章的核心观点是什么？','陪我读读这篇文章','解析文章','这个判断为什么成立？'])
        assert.equal(needsArticleClarification(question,[],posts),true,question);
    assert.equal(needsArticleClarification('这篇文章的核心观点',['git'],posts),false);
    assert.equal(needsArticleClarification('这篇《Git 撤销与回退》讲了什么？',[],posts),false);
    assert.equal(needsArticleClarification('分析这篇 /posts/git/',[],posts),false);
    assert.equal(needsArticleClarification('Git 如何撤销提交？',[],posts),false);
    assert.equal(needsArticleClarification('推荐几篇文章吧',[],posts),false);
    assert.equal(refersToArticle('你好呀'),false);
});
