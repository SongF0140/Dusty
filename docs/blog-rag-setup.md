# 博文问答（Vercel）

博客保持 Astro 静态页面，海问香通过 Vercel Node.js Functions 调用 StarryLin 的 Pi Agent。运行包在 `vendor/starrylin`，部署不依赖旁边的 StarryLin 仓库。凭据只保存在服务端。

## 配置

在 Vercel Settings → Environment Variables 配置 Production，再重新部署：

| 名称 | 类型 | 内容 |
| --- | --- | --- |
| `BLOG_LLM_BASE_URL` | Config | OpenAI 兼容 API 根地址，通常以 `/v1` 结尾，不含 `/chat/completions` |
| `BLOG_LLM_MODEL` | Config | 供应商支持的模型 ID |
| `BLOG_LLM_API_KEY` | Secret | 模型 API Key |
| `DATABASE_URL` | Secret | Neon 完整连接串，也支持 `POSTGRES_URL` |
| `BLOG_GITHUB_CLIENT_ID` | Config | 博客专用 GitHub OAuth App 的 Client ID |
| `BLOG_GITHUB_CLIENT_SECRET` | Secret | 该 App 的 Client Secret |
| `BLOG_SESSION_SECRET` | Secret | 至少 32 字符的随机会话密钥 |
| `BLOG_SITE_URL` | Config | `https://mjzy.tech`，不带路径 |
| `BLOG_SUMMARY_ENABLED` | Config | `true`（默认）；`false` 暂停正文变化后的模型摘要生成 |

创建 GitHub OAuth App：

1. 打开 [GitHub Developer settings](https://github.com/settings/developers)，选择 OAuth Apps → New OAuth App。
2. Application name 可填 `海问香博客助手`，Homepage URL 填 `https://mjzy.tech`。
3. Authorization callback URL 填 `https://mjzy.tech/api/blog-auth`。
4. 将创建后的 Client ID 和生成的 Client Secret 分别保存为上表变量，不要提交到 Git。
5. 本机运行 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`，输出保存为 `BLOG_SESSION_SECRET`，不要发到聊天里。更换它会使现有登录失效。
6. 保存后重新部署。登录只获取公开账号身份，不申请仓库权限，不保存 GitHub access token。会话 Cookie 为 HttpOnly、Secure、SameSite=Lax，有效七天。

Preview / 本地验证使用单独 OAuth App、对应回调和 `BLOG_SITE_URL`。受 Vercel Deployment Protection 保护的部署需要平台提供的 `VERCEL_AUTOMATION_BYPASS_SECRET`，让内部 worker 请求通过保护，否则任务无法执行。

## Neon 与摘要

通过 Vercel Storage / Marketplace 关联 Neon，确认连接串变量名。初次执行 `migrations/003-seed-existing-summaries.sql`，包含建表及 123 篇公开博文的现有简介和正文哈希；已成功导入无需再次导入。

构建自动执行 `004-blog-agent.sql`、`005-blog-queue.sql`，创建会话、调用日志、配额和队列表。每个 SQL 命令分别传给 Neon，PL/pgSQL 函数体保持完整，避免“预处理语句中插入多个命令”。迁移可重复运行，不覆盖摘要；数据库账号需有建表及创建函数权限。

构建也会确保摘要表存在，并执行 `006-align-initial-summary-baselines.sql`：初始 SQL 来自本地旧文章版本，有 13 篇在首次发布前已更新。该迁移仅对匹配旧种子哈希的 `manual` 行对齐正文基准，保留简介文字；不覆盖模型摘要、其他正文版本或后续编辑。之后正文再变化仍会触发模型更新。

现有简介原样入库，只有正文变化后才调用模型更新摘要。标题、模型、更换提示词或重新部署不会重写正文未变的文章；换行形式、首尾空白不算变化。模型失败或暂停生成不提前推进正文基准。

模型摘要由 Astro loader 写入集合 `description`，文章卡片、标题下逐字动画和 RAG 目录共用，不修改 Markdown frontmatter。访客打开文章只播放动画，内容变化需重新构建部署。有 Neon 可跨部署复用；本地无数据库则使用 `cache/blog-summaries-v2.json`。

可验证：`SELECT source,count(*) FROM blog_post_summaries GROUP BY source;`。重新导出初始 SQL 使用 `node scripts/export-summary-seed.ts`，只读取当前 dist，不调用模型。

## RAG 与调用限制

按 Markdown 标题和段落切分，每块最多 1600 字符，长段重叠 120 字符。关键词/BM25 检索，无向量数据库。目录先提供标题、摘要和 ID；`read_post` 按目录 → 相关/指定片段 → 必要时全文渐进披露。草稿和密码文章不进入公开快照。

硬权限只有 `search_posts`、`read_post`、`list_categories`。每次问题最多四次模型请求、六次工具执行、48000 字符的已读取正文预算、50 秒 Agent 时间；单次模型最多输出 1600 token，不隐藏重试。正文预算不是 token 窗口，模型仍需支持足够上下文。

知识回答优先博客，允许寒暄与阅读引导，扩展内容标记“【扩展说明】”。无正文证据时服务端明确标注。仅保留公开目录内的站内文章链接，前后端过滤外链，回答不执行 HTML。事实与扩展标记依赖模型遵守提示词，工具白名单和预算由代码强制执行。

## 队列与会话

GitHub 数字账号 ID 来自服务端签名 Cookie，忽略客户端伪造身份及历史。每人每天最多 20 次，按北京时间；排队先预留额度，开始执行后原子计入用量。模型调用开始后的失败同样计数；模型尚未开始的失败退回执行用量。

每账号同时运行一个任务，全局最多四个。新消息进入待处理队列头，当前回答完成后处理最新等待消息，不打断当前事务。消息 ID 幂等，重复提交不重复调用模型；不同账号不能访问对方会话或结果。

`/api/blog-chat` 入队/查询，签名内部请求唤醒 `/api/blog-worker`。每次 worker 使用 `waitUntil` 完成一个有界任务后唤醒下一个，浏览器轮询也会唤醒。队列持久化在 Neon，无常驻进程。离开页面仅停止轮询，已提交任务继续；同一浏览器登录同一账号可恢复待处理消息。清空按钮只删除本地记录。

Neon 保存任务状态、工具/轮次日志和回答。它不是 Temporal：崩溃或超时后租约到期的任务标为失败，用户以新消息重试，不自动重复付费请求。历史日志目前不自动清理。

## 验证与维护

构建需 Node.js 24。`pnpm build` 生成静态页、Pagefind、公开 RAG 快照并准备数据库表。`pnpm preview` 只提供静态页，完整接口需 `vercel dev` 和本地环境变量。配置不齐时禁用付费提问，仍可阅读博客和保存草稿。

`/api/blog-chat` 返回 `configured`、`authConfigured`、`user`、`engine`、`dailyLimit`，不返回密钥。登录后连续发送两个问题，确认前一条不中断，后一条等待，回答仅有站内链接。模拟测试通过不代表真实 OAuth 或模型供应商已验通。

无付费调用的测试：

```sh
node --test --test-isolation=none src/server/*.test.mjs src/utils/blog-*.test.mjs src/utils/progressive-text.test.mjs src/loaders/*.test.mjs scripts/export-summary-seed.test.mjs
```

从 StarryLin 更新运行包：在其仓库根目录运行 `node packages/blog-agent/scripts/export-vercel.mjs D:/GitHub_Blog/Dusty/vendor/starrylin`，复核声明和运行包测试。manifest 记录版本、工具白名单、bundle SHA256，并保留上游许可证。
