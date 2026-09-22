# 雾屿 · Misty Isle

一个会随季节变色的玻璃博客。**零依赖**：没有 npm 包，没有框架，构建脚本只用 Node 内置模块。

**线上：<https://railgun.ltd>** · 仓库：<https://github.com/1099298297/1099298297.github.io>

视觉与交互设计（双维度气候系统、粒子、水膜、雾可擦开）的来龙去脉见 [HANDOFF.md](HANDOFF.md)。

---

## 目录结构

```
content/            内容（你日常只动这里）
  posts/            文章，一篇一个 .md
  fragments/        碎片，一条一个 .md
  gallery/          图集，一张一个 .md
  site.json         站名、域名、关于、社交链接
index.html          页面骨架（结构 + 内联 SVG 滤镜）
assets/
  style.css         全部样式（季节 × 天气的 CSS 变量都在这里）
  app.js            全部逻辑（气候系统、粒子、阅读层、搜索）
  content.js        由 build.mjs 生成，别手改
build.mjs           构建脚本
```

## 写东西

### 最省事的发文章流程（不用装任何东西）

1. 打开 <https://github.com/1099298297/1099298297.github.io> → 进入 `content/posts/`
2. 右上 **Add file → Create new file**，文件名写成 `2026-09-21-my-post.md`（**日期前缀 + 英文短名**）
3. 粘贴下面的模板，改标题和正文
4. 底下 **Commit changes** —— 等 1~2 分钟，<https://railgun.ltd> 就更新了

本地写也一样：`node build.mjs --serve` 起预览，满意了再 `git add . && git commit -m "新文章" && git push`。
新建文章的模板可以用脚本生成：

```powershell
pwsh -File scripts\new-post.ps1 -Title "模拟退火怎么调参" -Category 技术 -Tags 算法,笔记 -Slug annealing-tuning
```

### 新文章

在 `content/posts/` 新建 `2026-09-21-my-post.md`：

````markdown
---
title: 标题
date: 2026-09-21 20:30
category: 技术          # 技术 / 生活 / 观察 / 随笔，随便写
tags: [算法, 笔记]
cover: img-3            # 可选，内置渐变图 img-1 ~ img-7；也可以写 assets/img/xx.jpg
summary: 列表页的摘要，不写就自动取正文第一段
---

正文用 Markdown 写。支持标题、列表、引用、表格、代码块、链接、图片，
行内公式 $E=mc^2$，以及：

```math
P(接受新解)=e^{-\Delta E/T}
```
````

文件名里的日期前缀只用来排序去重，标题以 front matter 为准（不写 title 就用文件名）。加 `draft: true` 可以撤下一篇文章。

### 碎片 / 图集

同样是一篇一个 `.md`，字段见 `content/fragments/` 和 `content/gallery/` 里现成的例子。

## 图片

`assets/img/` 里现在有 21 张照片，**都是 Wikimedia Commons 上自由版权（CC / 公有领域）的图**，
作者、许可、原始链接都写在每张图的 front matter 里，站内 `/credits.html` 也列了全表。
它们只是先垫着好看，**换成你自己的照片只需要两步**：

1. 把照片放进 `assets/img/`（建议先压到 300KB 以内、长边 1400px 左右）
2. 改 `content/gallery/*.md` 里的 `img:` 字段，例如 `img: assets/img/my-photo.jpg`；
   文章封面同理，改 `content/posts/*.md` 的 `cover:`

不想用图也行：`cover:` 留成 `img-1` ~ `img-7` 就用内置的渐变图，断网也好看。

## 示例内容

`content/posts/` 里有 30 篇、`content/fragments/` 里有 16 条**示例内容**（都带 `示例` 标签），
是为了测试列表、分页、归档面板和阅读层滚动用的。写完自己的东西之后可以直接删掉：

```powershell
# 删掉所有示例文章和碎片（保留你自己写的）
Get-ChildItem content\posts -Filter *-sample-*.md | Remove-Item
Get-ChildItem content\fragments | Where-Object { (Get-Content $_ -Raw) -match '示例' } | Remove-Item
```

### 改站名、邮箱、社交链接

改 `content/site.json`。里面有 `url`（影响 RSS / sitemap / canonical，**换域名时记得改**）、`city`（首页那行字）、`social`（邮件 / RSS / Github / 小红书）。

## 本地预览

```powershell
node build.mjs --serve      # 构建 + 起服务，打开 http://localhost:4173/
```

构建产物在 `dist/`，直接双击 `dist/index.html` 也能看（相对路径，file:// 可用）。
只想构建不上服务：`node build.mjs`。

## 部署

### 一、GitHub Pages（仓库里已配好）

站点就在 <https://railgun.ltd> 根路径，仓库是 `1099298297/1099298297.github.io`。
推送到 `main` 后 `.github/workflows/deploy.yml` 自动构建发布，不需要改任何东西
（Pages 的 Source 已设为 **GitHub Actions**，自定义域名已绑定 railgun.ltd）。

旧的 Hexo 站点：构建产物快照在 tag `legacy-hexo-2026-09-20`，Hexo 源码在 `code` 分支
（该分支上的自动部署工作流已停用，避免它把新站覆盖回去）。

### 二、自己的服务器

```powershell
pwsh -File scripts\deploy-server.ps1            # 构建 + 上传到 /www/wwwroot/misty-isle
pwsh -File scripts\deploy-server.ps1 -DryRun    # 先看要做什么
```

上传完在宝塔里加一个站点，根目录指向 `/www/wwwroot/misty-isle`，端口挑一个安全组已放行的即可。
脚本只写这个目录，不动服务器上已有的站点。

## 设计与性能红线（改代码前先看）

来自上一版的血泪教训，改动时请守住：

1. **先造光，再贴玻璃**。玻璃好不好看取决于背后有没有光，不要凭空加 blur。
2. **SVG 滤镜绝不碰小号文字**。`initWet()` 是白名单制，只有 Hero 标题和大号 lede 两个元素带 `data-wet`。
3. **`backdrop-filter` 别叠超过三层**；模糊档位即层级：导航 22px / 卡片 14px / 阅读层 40px。
4. **颜色一律走 CSS 变量**。季节管色（`--orb-*` / `--ink` / `--accent`），天气管质（`--gw` / `--wg` / `--sat` / `--orb-blur`）。
5. 新增的玻璃元素要能吃到 `--gw` / `--wg`，交互元素记得加进 `bindHover()` / `initFilm()` 的选择器，否则切天气时会「浮」在氛围之外。
6. 保命机制不要删：`prefers-reduced-motion`、`visibilitychange` 暂停、掉帧自动降级 `data-fx="low"`、粒子数按面积自适应。

## 快捷键

| 按键 | 作用 |
|---|---|
| `/` 或 `Ctrl/Cmd + K` | 打开搜索 / 标签 / 归档 |
| `Esc` | 关闭阅读层、面板、气候罗盘 |
| `←` `→` | 阅读层里翻上一篇 / 下一篇 |
| 点气候罗盘右下角 `◎` | 拉武汉的真实天气（Open-Meteo，无需 Key；失败就回到按日期切的季节） |

## 已知限制

- **公式是简化渲染**：自己写的小渲染器，支持上下标、`\frac`、`\sqrt` 和常见希腊字母/运算符，不是完整 LaTeX。复杂公式建议直接写 HTML 或后续接 KaTeX。
- **图片**：默认全站配图是 CSS 渐变（所以断网也好看）。要放真实照片，把文件丢进 `assets/img/`，front matter 里 `cover: assets/img/xxx.jpg`。
- **独立文章页**（`/p/<slug>/`）是给搜索引擎和分享用的，正文会内联进 HTML；页面本身仍然是同一套骨架。
