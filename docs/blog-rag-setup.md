# 博文问答（Vercel）

海问香复用 Pagefind 检索，选取最多三篇公开文章。浏览器只提交问题、文章 ID 和最近六条对话；Vercel Function 从本次构建的文章快照读取全文，调用 OpenAI 兼容的 Chat Completions 接口。凭据不会进入静态页面。

## 配置

在 Vercel 项目 Settings → Environment Variables 中设置，并重新部署：

| 名称 | 内容 |
| --- | --- |
| `BLOG_LLM_BASE_URL` | 供应商 API 根地址，通常以 `/v1` 结尾；不要包含 `/chat/completions` |
| `BLOG_LLM_MODEL` | 供应商支持的准确模型 ID |
| `BLOG_LLM_API_KEY` | API Key，仅在服务端设置 |

分别为需要的 Production / Preview 环境配置。不设置时，助手显示等待模型配置，保留草稿功能。无需修改 GitHub Pages 或 Cloudflare 配置。

## 本地验证

先执行 `pnpm build` 生成 `dist` 和 Pagefind 索引。`pnpm preview` 只提供静态站点，不能执行根目录 `api/blog-chat.ts`。完整本地验证需要 Vercel CLI 的 `vercel dev`，并配置本地服务端环境变量。不要将凭据写进代码、提交到 Git 或使用 `PUBLIC_` 前缀。

自动化测试不消耗模型额度：

```sh
node --test src/utils/blog-rag.test.mjs src/utils/blog-assistant.test.mjs src/utils/blog-assistant-policy.test.mjs src/server/blog-chat.test.mjs src/utils/navigation-assistant-state.test.mjs
```

## 行为与限制

- 仅公开博文进入目录与全文快照；草稿、密码文章、关于页等不作为问答证据。
- 提问“这篇文章”时优先读取当前博文。其他问题先搜索原问题，无匹配时去除常见提问用语，以关键词补查。
- 允许寒暄和阅读引导。知识回答优先依据博文，无相关证据时明确说明未找到，再允许模型提供有把握的通用知识，服务端统一加上“【扩展说明】”。有博文证据时，提示词要求额外补充内容也使用该标记。
- 阅读推荐从提供给模型的公开文章目录中选择；不会将目录摘要当作正文证据。
- 不给外部链接。提示词禁止外链，前后端输出处理同时删除外部 Markdown 链接、HTML 链接、裸网址及不在公开目录中的站内文章链接。
- 全文上下文暂设 48000 字符预算（不是 token 计数），超出则提示缩小范围，不静默截断。供应商模型的上下文窗口需要能容纳正文、历史和回答；较小窗口应调低预算。
- 最多 1600 输出 token，45 秒模型请求超时。当前使用非流式回答。
- 公开目录中的站内博文链接可点击；回答其余内容按文本呈现，不执行模型返回的 HTML。
- 对话只保存在当前浏览器。失败保留问题草稿，清空对话会取消当前请求。
- 当前仅做同源检查和输入限制，不提供用户认证或全局限流；如向公众开放，请在 Vercel 或模型供应商侧设置额度与调用限制。同源检查不能阻止脚本直接调用接口。
- `vercel.json` 把 `dist/api/rag/*.json` 打包进函数，文章快照随网站重新构建而更新。

配置完成并部署后，访问 `/api/blog-chat` 应返回 `{"configured":true}`。再通过海问香提问一篇已发表博文，检查回答及其来源。未配置真实供应商前，自动化测试只能确认协议与应用逻辑，不能证明真实供应商可用。
