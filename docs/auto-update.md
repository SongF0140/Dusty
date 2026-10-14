# 自动更新

站点代码位于 `SongF0140/Firefly` (`master`)，文章位于 `SongF0140/blog_knowledge` (`main`)，图床位于 `SongF0140/image_place` (`main`)。

## 即时触发

文章仓库和图床仓库的 `.github/workflows/trigger-firefly.yml` 在推送 `main` 后，调用 Firefly 的 repository dispatch API，分别发送 `content-updated`、`images-updated`。在这**两个源仓库**的 Settings → Secrets and variables → Actions 中分别添加同名 secret `FIREFLY_DISPATCH_TOKEN`，不要把 token 写进代码或文档。

fine-grained PAT 仅需选中 `SongF0140/Firefly` 并授予 `Contents: Read and write`；classic PAT 则需要 `repo` 权限。源仓库的 workflow 若提示 secret 缺失或 API 请求失败，先检查 token 和权限。

## 构建与兜底

Firefly 的 Pages 工作流也在 `master` 推送、手动触发和每小时定时运行。执行 `pnpm run build` 时，脚本先拉取 `blog_knowledge/main` 到 `.content-source/`，将知识库文章映射到 Astro 内容目录，再构建 `dist` 和 Pagefind 索引，最后部署 GitHub Pages。缓存如果以前指向 GitCode，同步脚本会切换 origin 至 GitHub。文章源仓库暂没有 `knowledge/` 时，网站内已有的知识文章保持不变。

代码提交到网站仓库、触发器提交到源仓库并配置 secret 后，才能验证远程自动更新；仅在本地修改不会触发 GitHub Actions。定时任务是兜底，不保证准点执行。
