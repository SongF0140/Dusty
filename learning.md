# 博客项目学习笔记

## 一、项目概述

本项目是一个基于 **Astro 6.4** 框架构建的现代静态博客系统，版本 6.12.3。它从 **Fuwari** 主题衍生而来，支持多语言(i18n)、多种壁纸模式、音乐播放器、Live2D/Spine 看板娘、评论系统集成等丰富功能。

- **技术栈**: Astro + Svelte + TailwindCSS v4
- **包管理器**: pnpm
- **部署目标**: Vercel / Cloudflare Workers
- **UI框架混搭**: 静态渲染用 Astro，交互组件用 Svelte

---

## 二、项目目录结构

```
blog/
├── astro.config.mjs          # Astro 核心配置：集成、Markdown 插件、Vite 设置
├── src/
│   ├── content.config.ts     # 内容集合定义（posts、spec）
│   ├── content/
│   │   ├── posts/            # 文章目录（按子目录分类：knowledge/、guide/）
│   │   └── spec/             # 特殊页面（about、friend、guestbook）
│   ├── pages/                # 路由页面
│   │   ├── [...page].astro   # 首页/分页（动态路由）
│   │   ├── posts/[...slug].astro  # 文章详情页
│   │   ├── archive.astro     # 归档页
│   │   ├── tags/             # 标签页
│   │   ├── categories/       # 分类页
│   │   ├── search.astro      # 搜索页
│   │   ├── gallery/          # 相册页
│   │   ├── bangumi.astro     # 番组计划页
│   │   ├── about.astro       # 关于页
│   │   ├── friends.astro     # 友链页
│   │   ├── guestbook.astro   # 留言板
│   │   ├── sponsor.astro     # 打赏页
│   │   ├── 404.astro         # 404 页
│   │   └── api/              # API 路由（文章元数据、OpenGraph 图片）
│   ├── layouts/
│   │   ├── Layout.astro      # 基础 HTML 骨架（SEO、字体、主题初始化）
│   │   └── MainGridLayout.astro  # 页面主布局（导航栏+壁纸+侧边栏+网格）
│   ├── components/
│   │   ├── common/           # 通用组件（Markdown、图片、分页、下拉面板等）
│   │   ├── layout/           # 布局组件（导航栏、侧边栏、页脚、文章卡片）
│   │   ├── features/         # 功能组件（音乐播放器、背景播放、加密、KaTeX等）
│   │   ├── controls/         # 控制组件（搜索、主题切换、显示设置等）
│   │   ├── widget/           # 侧边栏微件（资料卡、公告、标签云、日历等）
│   │   ├── comment/          # 评论系统（Giscus、Waline、Twikoo、Artalk、Disqus）
│   │   ├── analytics/        # 分析（Google Analytics、Umami、Clarity 等）
│   │   ├── misc/             # 杂项（分享海报、相关推荐、许可证）
│   │   └── pages/            # 页面专用组件（相册、番组计划、高级搜索）
│   ├── config/               # 配置文件（所有自定义从这开始）
│   │   ├── siteConfig.ts     # 站点核心配置（标题、关键词、主题色、页面开关）
│   │   ├── profileConfig.ts  # 个人资料（头像、名字、签名、社交链接）
│   │   ├── navBarConfig.ts   # 导航栏配置（菜单结构、自定义链接）
│   │   ├── backgroundWallpaper.ts  # 背景壁纸配置（模式、图片、横幅文字）
│   │   ├── musicConfig.ts    # 音乐播放器配置（平台、歌曲ID、API）
│   │   ├── commentConfig.ts  # 评论系统配置
│   │   ├── sidebarConfig.ts  # 侧边栏微件配置（左/右侧栏组件顺序）
│   │   ├── sponsorConfig.ts  # 打赏配置
│   │   ├── friendsConfig.ts  # 友链配置
│   │   ├── galleryConfig.ts  # 相册配置
│   │   ├── fontConfig.ts     # 字体配置（子集化等）
│   │   └── index.ts          # 统一导出所有配置
│   ├── types/                # TypeScript 类型定义
│   ├── utils/                # 工具函数
│   │   ├── content-utils.ts  # 内容处理（排序、标签/分类统计、相关推荐）
│   │   ├── layout-utils.ts   # 布局工具（首页判断、壁纸图片获取）
│   │   ├── image-utils.ts    # 图片工具（封面处理、CDN 识别）
│   │   ├── url-utils.ts      # URL 生成（文章链接、标签链接等）
│   │   └── ...               # 日期、加密、响应式等
│   ├── plugins/              # Markdown 处理插件
│   │   ├── remark-*          # Remark 插件（阅读时间、图片网格、数学公式、Mermaid 等）
│   │   └── rehype-*          # Rehype 插件（外部链接、邮件保护、PlantUML、GitHub 卡片等）
│   ├── i18n/                 # 国际化
│   │   ├── i18nKey.ts        # 翻译键定义
│   │   ├── translation.ts    # 翻译函数
│   │   └── languages/        # 各语言翻译文件（en, zh_CN, zh_TW, ja, ru）
│   ├── constants/            # 常量（CSS 变量值、图标配置）
│   └── styles/               # 全局样式（main.css, variables.styl, markdown.css 等）
├── public/                   # 静态资源（favicon、Live2D/Spine 模型、音乐封面等）
├── scripts/                  # 构建脚本（图标生成、LQIP 生成、字体子集化）
├── docs/                     # 文档（多语言 README）
└── .github/                  # CI/CD 工作流
```

---

## 三、架构深入分析

### 3.1 配置驱动架构

项目的核心设计理念是 **配置驱动**。几乎所有的外观、功能、布局都由 `src/config/` 下的 TypeScript 文件控制：

| 配置文件 | 控制范围 |
|---------|---------|
| `siteConfig.ts` | 站点标题、描述、关键词、主题色、页面开关、分页、SEO |
| `backgroundWallpaper.ts` | 壁纸模式(banner/fullscreen/overlay/none)、图片URL、横幅文字 |
| `profileConfig.ts` | 头像、昵称、个人签名、社交链接 |
| `navBarConfig.ts` | 导航栏菜单结构、自定义链接 |
| `musicConfig.ts` | 音乐播放器平台、歌曲ID、API地址 |
| `commentConfig.ts` | 评论系统选择与配置 |
| `sidebarConfig.ts` | 侧边栏微件的排列和开关 |

**关键点**: 修改外观和功能不需要深入组件代码，只需修改对应的配置文件即可。

### 3.2 双层布局系统

```
Layout.astro (基础 HTML + <head> + SEO)
  └── MainGridLayout.astro (导航栏 + 壁纸 + 网格布局)
        ├── Navbar.astro
        ├── Wallpaper (背景图片/视频 + 横幅文字)
        ├── 主内容区域 (CSS Grid 两栏/三栏)
        │   ├── SideBar (left)  - 侧边栏微件
        │   ├── <slot />        - 页面内容
        │   └── SideBar (right) - 对侧边栏
        └── Footer.astro
```

- **Layout.astro**: 输出 HTML 骨架，注入 SEO 元数据、主题初始化脚本、字体加载等
- **MainGridLayout.astro**: 负责页面主要布局，包含导航栏、背景壁纸系统、响应式网格布局

### 3.3 壁纸系统

四种壁纸模式，通过 `backgroundWallpaper.mode` 控制：

| 模式 | 说明 |
|------|------|
| `banner` | 横幅壁纸（默认），仅在页面顶部以 banner 形式展示 |
| `fullscreen` | 全屏壁纸，背景始终覆盖整个页面 |
| `overlay` | 全屏透明覆盖，壁纸上叠加半透明内容卡片 |
| `none` | 纯色背景，无壁纸 |

**图片来源**: `backgroundWallpaper.src` 支持：
- 本地图片（`src/assets/` 目录，会被 Astro 自动优化）
- 本地图片（`public/` 目录，不优化）
- 远程 URL（需注意防盗链问题）

每种模式在 `src` 下区分 `desktop` 和 `mobile`，支持数组形式多张随机切换。

### 3.4 内容集合系统

使用 Astro 的内容集合（Content Collections）：

```typescript
// src/content.config.ts
const postsCollection = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    published: z.date(),
    draft: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional().default([]),
    category: z.string().optional().nullable().default(""),
    password: z.string().optional().default(""),  // 文章加密
    pinned: z.boolean().optional().default(false), // 置顶
    // ...更多字段
  }),
});
```

- **文章分类**: 通过子目录自然分类（如 `knowledge/`, `guide/`）
- **草稿**: `draft: true` 的文章开发环境可见，生产环境隐藏
- **加密**: 设置 `password` 字段可将文章加密

### 3.5 页面路由

```
/                     → [...page].astro        (首页/分页)
/posts/xxx/           → posts/[...slug].astro   (文章详情)
/archive/             → archive.astro           (归档)
/tags/                → tags/index.astro        (标签)
/categories/          → categories/index.astro  (分类)
/search/              → search.astro            (搜索)
/about/               → about.astro             (关于)
/friends/             → friends.astro           (友链)
/guestbook/           → guestbook.astro         (留言板)
/gallery/             → gallery/index.astro     (相册)
/gallery/:album/      → gallery/[album].astro   (相册详情)
/bangumi/             → bangumi.astro           (番组计划)
/sponsor/             → sponsor.astro           (打赏)
```

### 3.6 Markdown 处理管道

项目使用了丰富的 Markdown 插件：

**Remark 插件**:
- `remark-math` / `rehype-katex`: 数学公式（KaTeX）
- `remark-reading-time`: 阅读时间估算
- `remark-image-grid`: 图片网格布局
- `remark-excerpt`: 文章摘要提取
- `remark-directive`: 指令语法（如 `:github-card` 等）
- `remark-sectionize`: 章节化
- `remark-mermaid` / `rehype-mermaid`: Mermaid 图表
- `remark-plantuml` / `rehype-plantuml`: PlantUML 图表
- `remark-admonition-to-blockquote-callout`: 提示框

**Rehype 插件**:
- `rehype-slug` + `rehype-autolink-headings`: 标题锚点链接
- `rehype-external-links`: 外部链接处理（添加 `target="_blank"`）
- `rehype-email-protection`: 邮箱混淆保护
- `rehype-figure`: 图片包裹为 `<figure>`
- `rehype-callouts`: 提示框（callout/admonition）样式

**自定义语法**:
- `:github-card[user/repo]`: GitHub 仓库卡片
- `:::grid` / `:::grid-item`: 图片网格
- `:::note` / `:::warning` 等: 提示框

### 3.7 国际化 (i18n)

```
src/i18n/
├── i18nKey.ts          # 定义所有翻译键（枚举类型）
├── translation.ts      # 翻译查找函数
└── languages/
    ├── en.ts
    ├── zh_CN.ts
    ├── zh_TW.ts
    ├── ja.ts
    └── ru.ts
```

在组件中使用：
```astro
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
// {i18n(I18nKey.home)}  → 根据 siteConfig.lang 返回对应语言文本
```

### 3.8 客户端交互 (Svelte)

动态交互组件使用 **Svelte 5**（runes 模式）：

| 组件 | 功能 |
|------|------|
| `LightDarkSwitch.svelte` | 明暗主题切换 |
| `DisplaySettings.svelte` | 显示设置面板（布局、壁纸、动画等） |
| `WallpaperSwitch.svelte` | 壁纸模式切换 |
| `Search.svelte` | 全文搜索（Pagefind） |
| `ClientPagination.svelte` | 客户端分页 |
| `LayoutSwitchButton.svelte` | 列表/网格视图切换 |
| `SharePoster.svelte` | 分享海报生成 |
| `AdvancedSearch.svelte` | 高级搜索 |
| `BangumiSection.svelte` | 番组计划展示 |
| `ArchivePanel.svelte` | 归档面板 |

### 3.9 响应式设计策略

- **桌面端 (≥1024px)**: 完整的侧边栏 + 内容 + 对侧边栏三栏布局
- **平板端 (768-1023px)**: 简化布局，侧边栏可能折叠
- **移动端 (<768px)**: 单栏布局，侧边栏微件移至底部或隐藏
- 通过 `utils/responsive-utils.ts` 动态计算 CSS Grid 列配置
- 移动端非首页自动隐藏 banner，优化加载性能

### 3.10 构建流程

```bash
pnpm build
# 等价于:
# 1. node scripts/generate-icons.js    → 生成图标
# 2. npx tsx scripts/generate-lqips.ts → 生成低质量图像占位符(LQIP)
# 3. astro build                        → Astro 静态构建
# 4. npx tsx scripts/subset-fonts.ts    → 字体子集化（减小体积）
# 5. pagefind --site dist               → 生成全文搜索索引
```

---

## 四、关键技术细节

### 4.1 Swup 页面过渡

使用 `@swup/astro` 实现 SPA-like 的页面切换体验。页面切换时：
- 壁纸保持不变（避免闪烁）
- 主内容区域通过 CSS transition 平滑过渡
- 侧边栏、TOC 等通过 `containers` 配置选择性更新

### 4.2 主题色系统

通过 CSS 变量 `--hue` 控制全局主题色相：
- `siteConfig.themeColor.hue` 设置默认色相（0-360）
- `fixed: true` 时锁定色相，用户无法切换
- 所有 UI 元素的主色（`--primary`）使用 HSL 模型动态计算

### 4.3 主题初始化

`Layout.astro` 内联主题初始化脚本，在页面渲染前执行：
1. 读取 `localStorage` 中的主题模式（light/dark/system）
2. 设置 HTML 的 `dark` 类和 `data-theme` 属性
3. 计算 `--banner-height-extend` CSS 变量
4. 初始化壁纸模式显示/隐藏对应元素
5. **避免页面加载时的主题闪烁**

### 4.4 图片优化

- Astro 自动优化 `src/` 目录下的图片（格式转换、尺寸调整）
- `public/` 目录下的图片不优化（适合 favicon、模型文件等）
- 远程 URL 不经过 Astro 处理（需注意防盗链）
- LQIP（低质量图像占位符）通过构建脚本预生成

### 4.5 文章相关推荐算法

`getRelatedPosts()` 采用多维度评分：
1. **标签匹配** (0-100): Jaccard 相似度
2. **标题相似度** (0-100): 中英文分词 + Jaccard 相似度
3. **时间新鲜度** (0-30): 6 个月半衰期指数衰减
4. **分类加成分** (0/10): 同分类 +10 分

### 4.6 加密文章

通过 `password` frontmatter 字段加密文章：
- 使用 `pako` 库进行 AES 加密
- 客户端输入密码后解密渲染
- 支持密码提示 (`passwordHint`)

### 4.7 音乐播放器

- 支持平台：网易云、QQ音乐、酷狗
- 通过第三方 API（如 `api.injahow.cn`）获取歌曲信息
- 完整的播放器 UI：歌词显示、播放列表、音量控制、播放模式切换
- 可同时配置多个 widget 实例

---

## 五、配置修改指南

### 快速入门要改的文件

1. **站点基本信息**: `src/config/siteConfig.ts`
   - `title`, `subtitle`, `description`, `keywords`, `site_url`
   - `themeColor.hue` → 主题色相
   - `pages` → 页面开关

2. **个人资料**: `src/config/profileConfig.ts`
   - `avatar` → 头像 URL
   - `name` → 显示名称
   - `bio` → 个人签名
   - `links` → 社交链接

3. **导航栏**: `src/config/navBarConfig.ts`
   - 修改菜单名称和结构

4. **背景壁纸**: `src/config/backgroundWallpaper.ts`
   - `mode` → 壁纸模式
   - `src.desktop` / `src.mobile` → 图片 URL 列表
   - `common.homeText` → 横幅文字

5. **音乐**: `src/config/musicConfig.ts`
   - `server` → API 服务器
   - `type` → 平台类型（netease/tencent/kugou）
   - `id` → 歌曲/歌单 ID

6. **页面内容**: `src/content/spec/`
   - `about.md` → 关于页面
   - `friends.mdx` → 友链页面
   - `guestbook.md` → 留言板页面

---

## 六、部署要点

### Vercel 部署
- 生产构建命令: `pnpm build`
- 输出目录: `dist`
- Production 和 Preview 是分开的部署环境
- `mjzy.tech` 域名需在 Vercel → Settings → Domains 中绑定
- **重要**: 重新部署时，确保是 Production 部署（不是 Preview）

### GitHub 图床
- 使用公开的 GitHub 仓库作为图床
- 图片 URL 格式: `https://raw.githubusercontent.com/{user}/{repo}/main/{path}`
- **仓库必须为公开**，否则图片无法访问

### 常见问题
- 防盗链: `wallpaperaccess.com/download/xxx` 是下载页面不是图片直链
- `alphacoders.com` 图片可能也有防盗链
- `csdnimg.cn` 的图片有防盗链，无法跨域加载

---

## 七、架构评价

**优点**:
- 配置驱动，易于定制
- 双框架混搭（Astro + Svelte），兼顾性能与交互
- 壁纸系统灵活多样
- Markdown 插件丰富（数学公式、图表、加密等）
- 国际化设计完善
- 响应式网格布局适应性强

**注意事项**:
- 远程图片 URL 需注意防盗链
- 壁纸切换逻辑较复杂（MainGridLayout 中有大量初始化脚本）
- 构建脚本较多，首次构建时间较长
- pnpm 锁定版本，需注意依赖兼容性
