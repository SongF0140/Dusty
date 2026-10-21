# Curated tags implementation plan

用户已确认：保留领域与主要技术主题，收敛到二十来个标签；删除函数、控件、命令、章节名称和泛词。

**Goal:** 让站点所有标签消费者使用相同的精简词表，后续文章同步不再重新引入细碎标签。

**Architecture:** 在 Astro posts collection schema 中统一规范化标签；正文、分类和源稿内容保持原样。规则集中在纯 TypeScript 模块，支持大小写、别名合并、去重和分类主题补充。

## Steps

- [x] 编写有代表性的回归测试，覆盖重复计数、未知标签、主要技术保留、分类补充和 3 标签上限；先验证失败。
- [x] 新增 `src/utils/post-tags.ts`，提供 `normalizePostTags(tags, category)` 与可维护词表。
- [x] 在 `src/content.config.ts` 对完整文章数据应用标签规范化，统一作用于文章、归档、标签页和推荐。
- [x] 审核现有 123 篇文章的归并结果，确保每篇仍有有意义的标签、分类不变、原始文件不变。
- [x] 验证实际页面计数、主要技术标签筛选及文章标签，运行针对性测试、Astro 检查和差异检查。

不新增依赖，不修改同步脚本，不提交或推送。验证记录写入 `artifacts/tags/`。

## Validation

- 原有 170 个唯一标签收敛为 24 个主题，123 篇文章全部保留有效标签，每篇不超过 3 个且没有重复。
- 8 项 Node 回归测试通过；Astro 检查 177 个文件，0 errors、0 warnings、0 hints。
- `blog_knowledge` 工作区仍干净，原稿与分类未批量改写。
- 浏览器验证：标签页与统计均为 24；Qt 22 篇、ESP32 28 篇、Docker 6 篇、AI Agent 8 篇、数据库 10 篇筛选计数正确；Qt SQLite 文章显示 Qt、C++、数据库。
- 390px 手机视口无横向溢出，浏览器无运行时错误；`git diff --check` 通过。
- 本地开发监听曾发生 Windows EBUSY 和缓存写入冲突，改用当前进程的 Chokidar 轮询环境变量后完成验证，没有改动项目开发配置。
