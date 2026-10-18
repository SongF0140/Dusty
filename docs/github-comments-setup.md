# GitHub 登录评论

文章页和友链页已接入 Giscus，每个页面按固定路径匹配独立讨论。仓库为 `SongF0140/Dusty`，仓库 ID 已核实为 `R_kgDOTBBh6w`。

当前已使用站长提供的 Announcements 分类：`DIC_kwDOTBBh684DI0t3`，默认配置已写入项目，无需另建环境变量。以后更换仓库或分类时，可按以下步骤重新配置：

1. 登录 GitHub，打开 [Dusty 仓库设置](https://github.com/SongF0140/Dusty/settings)，在 Features 中开启 Discussions。
2. 在 [Giscus GitHub App](https://github.com/apps/giscus) 点击 Install，只选择 `SongF0140/Dusty` 仓库。此步骤会授权 Giscus 读写这个仓库的 Discussions。
3. 打开 [Giscus 配置页](https://giscus.app/zh-CN)，填写 `SongF0140/Dusty`，选择 Announcements（公告）分类。从生成代码中复制 `data-category` 与 `data-category-id`。
4. 在项目根目录新建 `.env.local`，填写：

   ```dotenv
   PUBLIC_GISCUS_CATEGORY=Announcements
   PUBLIC_GISCUS_CATEGORY_ID=DIC_实际分类ID
   ```

5. 重启本地预览；部署时将这两个公开配置填写到构建环境变量中，重新构建站点。

这些是公开标识，不需要提供 GitHub 密码、访问令牌或 client secret。读者在评论框中通过 GitHub OAuth 登录后留言。未完成配置时，页面显示“GitHub 评论暂未开放”，不会加载带示例 ID 的无效登录框。

## 本地阅读便签

右侧 Tips 只存储在读者浏览器的 localStorage 中，按文章路径隔离。输入后 300 毫秒自动保存，离开页面时补存；清空便签也会删除对应记录。便签不会发送至 GitHub。
