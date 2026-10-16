# Dusty Blog

基于 Astro 的个人技术博客。网站代码、文章和图床分别存放在三个 GitHub 仓库，站点由 GitHub Actions 构建并发布到 GitHub Pages。

| 用途 | 仓库 | 作用 |
| --- | --- | --- |
| 网站 | [SongF0140/Firefly](https://github.com/SongF0140/Firefly) | 页面、配置、构建与部署 |
| 文章 | [SongF0140/blog_knowledge](https://github.com/SongF0140/blog_knowledge) | Markdown 笔记与随文图片 |
| 图床 | [SongF0140/image_place](https://github.com/SongF0140/image_place) | 文章引用的外部图片 |

## 更新流程

文章仓库 `main` 推送后，仓库中的 `.github/workflows/trigger-firefly.yml` 向站点仓库发送 `content-updated` 事件；图床仓库推送后发送 `images-updated`。站点仓库的 `.github/workflows/deploy.yml` 接收事件并重新构建。站点仓库 `master` 推送、手动运行部署工作流，以及每小时的定时任务也会触发重建。

每次运行 `pnpm run build` 都会先执行 `pnpm run sync-content`：从 GitHub 文章仓库的 `main` 分支获取最新内容，再交给 Astro 生成静态页面和 Pagefind 搜索索引。文章并非在访客浏览器中实时从 GitHub 加载；访问者拿到的是已经构建好的页面。图片仓库更新会触发同一次重建，但远程图片仍按文章中的 URL 加载。

要让两个源仓库的即时触发器生效，分别在 `blog_knowledge` 和 `image_place` 的 **Settings → Secrets and variables → Actions** 中配置 `FIREFLY_DISPATCH_TOKEN`。该 token 须有权限调用站点仓库的 repository dispatch API。详情见 [自动更新说明](docs/auto-update.md)。所有本地变更都必须推送到对应仓库，GitHub Actions 才能使用。

## 本地开发

需要 Node.js 22 和 pnpm 9。

```bash
git clone https://github.com/SongF0140/Firefly.git
cd Firefly
pnpm install
pnpm dev
```

`pnpm dev` 和 `pnpm build` 会联网拉取 `blog_knowledge/main`；`pnpm check` 也先同步。可运行 `pnpm run sync-content` 单独同步文章，`pnpm preview` 预览构建结果。同步缓存位于未跟踪的 `.content-source/`。同步遇到本地未提交的文章或图片变更会停止，以免覆盖内容；请在知识库仓库保存并提交后，从干净的博客工作区运行。站点内暂存的 `src/content/posts/knowledge/` 在文章仓库没有同名目录时保留。

主要入口：

- `src/config/siteConfig.ts`：站点标题、语言、主题和页面设置。
- `src/config/navBarConfig.ts`：导航菜单。
- `src/content.config.ts`：文章 frontmatter 结构。
- `scripts/sync-content-repo.mjs`：GitHub 文章同步、目录映射和缺失 frontmatter 的补充。
- `.github/workflows/deploy.yml`：GitHub Pages 构建与部署。

文章应尽量在知识库仓库中提供 `title`、`published`、`category` 等 frontmatter；无 frontmatter 的新目录文章会在构建缓存中补默认元数据，源仓库文件不会因此被修改。

## 致谢与许可

本站基于 [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly) 和 [saicaca/fuwari](https://github.com/saicaca/fuwari) 修改。源码许可及原作者声明见 [LICENSE](LICENSE)。
