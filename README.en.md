# Dusty Blog

Personal tech blog built with Astro. The site code, articles and image hosting live in three separate GitHub repositories; the site is built by GitHub Actions and published to GitHub Pages.

| Purpose | Repository | Role |
| --- | --- | --- |
| Site | [SongF0140/Firefly](https://github.com/SongF0140/Firefly) | Pages, configuration, build and deployment |
| Articles | [SongF0140/blog_knowledge](https://github.com/SongF0140/blog_knowledge) | Markdown notes and inline images |
| Images | [SongF0140/image_place](https://github.com/SongF0140/image_place) | External images referenced by articles |

## Update Flow

When the article repository receives a push to `main`, its `.github/workflows/trigger-firefly.yml` sends a `content-updated` event to the site repository; an image repository push sends `images-updated`. The site repository's `.github/workflows/deploy.yml` receives those events and rebuilds. A push to `master` on the site repository, a manual workflow run, and an hourly scheduled run also trigger a rebuild.

Every `pnpm run build` starts with `pnpm run sync-content`: it fetches the latest content from the article repository's `main` branch, then hands it to Astro to generate static pages and a Pagefind search index. Articles are not loaded from GitHub live in the visitor's browser — visitors receive already-built pages. An image repository update triggers the same rebuild, but remote images are still loaded by the URLs written in the articles.

For the instant triggers in both source repositories to work, configure `FIREFLY_DISPATCH_TOKEN` in **Settings → Secrets and variables → Actions** of `blog_knowledge` and `image_place`. The token needs permission to call the site repository's repository dispatch API. See [auto-update docs](docs/auto-update.md). All local changes must be pushed to the corresponding repository before GitHub Actions can use them.

## Local Development

Requires Node.js 22 and pnpm 9.

```bash
git clone https://github.com/SongF0140/Firefly.git
cd Firefly
pnpm install
pnpm dev
```

`pnpm dev` and `pnpm build` fetch `blog_knowledge/main` over the network; `pnpm check` also syncs first. Run `pnpm run sync-content` to sync articles alone, and `pnpm preview` to preview the build output. The sync cache lives in the untracked `.content-source/`. The sync aborts if it finds uncommitted article or image changes locally, so as not to overwrite content; commit them in the knowledge repository first and run from a clean blog workspace. Articles staged under `src/content/posts/knowledge/` are kept when the article repository has no directory of the same name.

Key entry points:

- `src/config/siteConfig.ts`: site title, language, theme and page settings.
- `src/config/navBarConfig.ts`: navigation menu.
- `src/content.config.ts`: article frontmatter schema.
- `scripts/sync-content-repo.mjs`: GitHub article sync, directory mapping and default frontmatter for missing metadata.
- `.github/workflows/deploy.yml`: GitHub Pages build and deployment.

Articles should carry `title`, `published`, `category` frontmatter in the knowledge repository wherever possible; new directory articles without frontmatter get default metadata filled in during the build cache, and the source repository files are left untouched.

## Acknowledgments and License

This site is modified from [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly) and [saicaca/fuwari](https://github.com/saicaca/fuwari). See [LICENSE](./LICENSE) for the source license and the original authors' notices.