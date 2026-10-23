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
| `BLOG_SUMMARY_ENABLED` | Config | `true`（默认）重建100字内 AI 摘要；`false` 暂停生成 |

当前生产模型使用 DeepSeek 官方接口：`BLOG_LLM_BASE_URL=https://api.deepseek.com`、`BLOG_LLM_MODEL=deepseek-flash`。官方地址的问答和摘要请求明确设置 `thinking.type=disabled`，保留现有输出预算，避免短摘要或工具回合依赖思考内容；其他兼容接口保持原协议。API Key 仅配置在服务端环境变量中。

创建 GitHub OAuth App：

1. 打开 [GitHub Developer settings](https://github.com/settings/developers)，选择 OAuth Apps → New OAuth App。
2. Application name 可填 `海问香博客助手`，Homepage URL 填 `https://mjzy.tech`。
3. Authorization callback URL 填 `https://mjzy.tech/api/blog-auth`。
4. 将创建后的 Client ID 和生成的 Client Secret 分别保存为上表变量，不要提交到 Git。
5. 本机运行 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`，输出保存为 `BLOG_SESSION_SECRET`，不要发到聊天里。更换它会使现有登录失效。
6. 保存后重新部署。登录只获取公开账号身份，不申请仓库权限，不保存 GitHub access token。会话 Cookie 为 HttpOnly、Secure、SameSite=Lax，有效七天。

Preview / 本地验证使用单独 OAuth App、对应回调和 `BLOG_SITE_URL`。生产环境通过 `BLOG_SITE_URL`（默认 `https://mjzy.tech`）唤醒签名 worker，避免部署 URL 的 Vercel SSO 保护阻断队列。Preview 通过自身部署 URL 唤醒，受 Deployment Protection 保护时需要平台提供的 `VERCEL_AUTOMATION_BYPASS_SECRET`。

评论使用 Giscus 的独立 GitHub 登录，不能复用助手的会话 Cookie；助手和评论区均会提示分别登录。

问答通过 SSE 渐进显示实际模型文字，不等待最终答案再播放动画。worker 每400毫秒合并一批文字写入 Neon，订阅接口约650毫秒检查一次，并以25秒连接自动续接；刷新页面按消息 ID 恢复，不重新计费或重新提问。`009-streamed-answers.sql` 自动添加中间文本字段。中间文本按账号和有效任务租约写入，只发送正文，不发送思考内容或工具参数；关闭页面只断开订阅，不打断任务。Node 接口直接写出 SSE 数据块，不将整个响应缓存为字符串。

浏览器发送问题前不再重复执行 Pagefind 检索，正文检索由服务端 Pi/RAG 完成；明确询问当前文章时仍传递经过服务端校验的文章 ID。默认回答简短，用户要求详细讲解时再展开。界面与伪终端共用抽屉宽度，采用冰白、水蓝、青绿的清透气泡，深色模式使用深海蓝。用户气泡不显示“你”标签；不显示排队或“正在回答”文案。轻微气泡动效仅放在标题区域，减少动态效果设置下关闭。

界面品牌为 StarryLin/Geek，自我介绍和自称只用 StarryLin。语气参考海问香的温柔、沉静、清澈和一点诗意，技术解释保持自然对话，不强制写成提纲，不靠反复套用海洋意象塑造人设。每轮在 Pi 实际 system 消息中注入该要求，同时保留工具声明、博客依据及不提供外链等约束。

## Neon 与摘要

通过 Vercel Storage / Marketplace 关联 Neon，确认连接串变量名。初次执行 `migrations/003-seed-existing-summaries.sql`，包含建表及 123 篇公开博文的现有简介和正文哈希；已成功导入无需再次导入。

构建自动执行 `004-blog-agent.sql`、`005-blog-queue.sql`，创建会话、调用日志、配额和队列表。每个 SQL 命令分别传给 Neon，PL/pgSQL 函数体保持完整，避免“预处理语句中插入多个命令”。迁移可重复运行，不覆盖摘要；数据库账号需有建表及创建函数权限。

构建也会确保摘要表存在，并执行 `006-align-initial-summary-baselines.sql`：初始 SQL 来自本地旧文章版本，有 13 篇在首次发布前已更新。该迁移仅对匹配旧种子哈希的 `manual` 行对齐正文基准，保留简介文字；不覆盖模型摘要、其他正文版本或后续编辑。之后正文再变化仍会触发模型更新。

当前使用 `blog-summary-v3-ai-100`：公开文章的旧简介、旧模型摘要会在启用模型的下一次构建中重新生成。模型阅读全部正文，长文先分段概括，再重写为40至70字符、严格不超过100字符（含标点）的摘要；不截取文章开头，不截断超长生成结果；首次超过100字符时最多再压缩一次，仍超限则不写入缓存。文章简介、标题下动画和 RAG 目录共用这段摘要。

`007-ai-summary-version.sql` 增加缓存版本字段；只有有效的新摘要生成后才替换原记录。完成一次重建后，同一正文和摘要版本复用缓存；标题、模型变化或重复部署不重复生成。正文变化会更新摘要。调用串行执行，供应商或摘要格式第一次失败后停止本次构建的剩余生成，避免持续打满配额。失败构建不会替换线上网站，已完成的合法摘要保留以供下次续建。

`008-seed-ai-summaries.sql` 提供本地 DeepSeek 真实构建验证过的123篇公开摘要，均不超过100字符。构建自动导入：只替换正文哈希相同的旧版摘要，保留已有新版模型摘要；正文已变化的记录由 loader 正常重建，避免首次上线再重复生成整批摘要。

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

## 没有收到回复时

界面名称为 `StarryLin/Geek`。请求失败会作为一条状态说明保留在问题下方，刷新后仍可查看，不会自动重新提交模型调用。

供应商错误与博客每天20次的配额分开处理：HTTP 429 默认提示限流；错误内容明确说明额度过期、余额不足或配额耗尽时分别提示对应原因，不再统称为余额不足。服务端最多读取8KB错误体进行分类，仅记录有限错误代码和 HTTP 状态，不输出原文或密钥。Intern 平台还需检查墨点有效期、账户共享 RPM/TPM 和模型 ID；修正服务端配置后重新部署。请勿把 Key 发到聊天或提交到仓库。

构建日志中的 `Blog task diagnostics` 只输出最近任务的状态、调用次数、回答长度和有限错误分类，不包含账号、问题、回答正文、供应商原始错误或密钥。源码测试和模拟回复不能证明供应商账户当前有可用额度。
