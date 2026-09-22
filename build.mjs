#!/usr/bin/env node
/* 雾屿 · 构建脚本
   零依赖：只用 Node 内置模块。把 content/ 下的 Markdown 变成网站。
   用法：
     node build.mjs            构建到 dist/
     node build.mjs --serve    构建并起一个本地预览服务（默认 4173）
     node build.mjs --serve=5000
*/

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(ROOT, 'content');
const DIST = join(ROOT, 'dist');

/* ============================================================
   0. 小工具
   ============================================================ */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const cjk = (s) => /[\u3000-\u9fff\uff00-\uffef]$/.test(s);

function joinLines(lines) {
  let out = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!out) { out = line; continue; }
    // 中文换行不该补空格，英文单词之间要补
    out += (cjk(out) && /^[\u3000-\u9fff\uff00-\uffef]/.test(line)) ? line : ' ' + line;
  }
  return out;
}

/* ============================================================
   1. Front matter + Markdown
   ============================================================ */
function parseFrontMatter(raw) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!text.startsWith('---')) return { data: {}, body: text };
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { data: {}, body: text };
  const head = text.slice(3, end).trim();
  const body = text.slice(text.indexOf('\n', end + 1) + 1);
  const data = {};
  let lastKey = null;
  for (const line of head.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && lastKey) {
      if (!Array.isArray(data[lastKey])) data[lastKey] = data[lastKey] ? [data[lastKey]] : [];
      data[lastKey].push(unquote(listItem[1].trim()));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    lastKey = kv[1];
    let v = kv[2].trim();
    if (v === '') { data[lastKey] = null; continue; }
    if (/^\[.*\]$/.test(v)) {
      data[lastKey] = v.slice(1, -1).split(',').map((x) => unquote(x.trim())).filter(Boolean);
    } else if (v === 'true' || v === 'false') {
      data[lastKey] = v === 'true';
    } else {
      data[lastKey] = unquote(v);
    }
  }
  return { data, body };
}

function unquote(s) {
  const m = String(s).match(/^(['"])([\s\S]*)\1$/);
  return m ? m[2] : s;
}

/* 极简 TeX：上下标 + 常见符号。复杂的公式请直接写 HTML。 */
const TEX_SYM = {
  Delta: 'Δ', delta: 'δ', alpha: 'α', beta: 'β', gamma: 'γ', lambda: 'λ', mu: 'μ',
  pi: 'π', sigma: 'σ', tau: 'τ', theta: 'θ', phi: 'φ', omega: 'ω', Omega: 'Ω', Sigma: '∑',
  times: '×', cdot: '·', div: '÷', pm: '±', le: '≤', leq: '≤', ge: '≥', geq: '≥',
  neq: '≠', approx: '≈', equiv: '≡', infty: '∞', to: '→', rightarrow: '→', sum: '∑',
  prod: '∏', int: '∫', in: '∈', notin: '∉', subset: '⊂', cup: '∪', cap: '∩', forall: '∀',
  exists: '∃', partial: '∂', nabla: '∇', sqrt: '√', log: 'log', ln: 'ln', max: 'max',
  min: 'min', argmax: 'argmax', mod: 'mod', quad: ' ', qquad: '  ',
};

function takeGroup(s, i) {
  // s[i] === '{'，返回 [内容, 结束位置]
  let depth = 0, out = '';
  for (; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') { depth++; if (depth === 1) continue; }
    if (ch === '}') { depth--; if (depth === 0) return [out, i + 1]; }
    out += ch;
  }
  return [out, i];
}

function tex(src) {
  let s = String(src);
  // \text{...} \mathrm{...} 只保留内容
  s = s.replace(/\\(?:text|mathrm|operatorname)\s*\{([^{}]*)\}/g, '$1');
  // \frac{a}{b} / \dfrac
  s = s.replace(/\\(?:d?frac)\s*/g, (m, off, all) => {
    const i = off + m.length;
    if (all[i] !== '{') return m;
    const [a, j] = takeGroup(all, i);
    if (all[j] !== '{') return m;
    const [b, k] = takeGroup(all, j);
    return `\u0001${a}\u0002${b}\u0003`;
  });
  // \sqrt{x}
  s = s.replace(/\\sqrt\s*/g, (m, off, all) => {
    const i = off + m.length;
    if (all[i] !== '{') return '√';
    const [a, j] = takeGroup(all, i);
    return `√(${a})`;
  });
  // 符号
  s = s.replace(/\\([A-Za-z]+)\s*/g, (m, name) => {
    const out = name in TEX_SYM ? TEX_SYM[name] : name;
    // 控制符（Δ ≤ ×）后面的空格在 TeX 里是分隔符，要去掉；\log 这类单词要保留
    return /^[A-Za-z]/.test(out) ? out + ' ' : out;
  });
  // 上下标
  s = s.replace(/\^\{([^{}]*)\}/g, '<sup>$1</sup>').replace(/\^(\S)/g, '<sup>$1</sup>');
  s = s.replace(/_\{([^{}]*)\}/g, '<sub>$1</sub>').replace(/_(\S)/g, '<sub>$1</sub>');
  // 还原 \frac
  s = s.replace(/\u0001([\s\S]*?)\u0002([\s\S]*?)\u0003/g,
    '<span class="frac"><span class="num">$1</span><span class="den">$2</span></span>');
  return s;
}

function inline(text) {
  const stash = [];
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;

  let t = String(text);
  t = t.replace(/`([^`]+)`/g, (m, c) => keep('<code>' + esc(c) + '</code>'));
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (m, alt, src, title) => keep('<img src="' + escAttr(src) + '" alt="' + escAttr(alt) + '"' +
      (title ? ' title="' + escAttr(title) + '"' : '') + ' loading="lazy">'));
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (m, label, href, title) => keep('<a href="' + escAttr(href) + '"' +
      (/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '') +
      (title ? ' title="' + escAttr(title) + '"' : '') + '>' + label + '</a>'));
  t = t.replace(/\$([^$\n]+)\$/g, (m, e) => keep('<span class="tex">' + tex(e) + '</span>'));
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  t = t.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[Number(i)]);
  return t;
}

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const isTableSep = (s) => /^\|?[\s:|-]*-[\s:|-]*\|?$/.test(s.trim()) && s.includes('-');
  const cells = (s) => s.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    // 代码 / 公式块
    const fence = line.match(/^```(\S*)\s*$/);
    if (fence) {
      const lang = (fence[1] || '').toLowerCase();
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      if (lang === 'math' || lang === 'tex' || lang === 'latex') {
        out.push('<div class="math-block">' + tex(buf.join('\n')) + '</div>');
      } else {
        out.push('<pre class="code"' + (lang ? ' data-lang="' + escAttr(lang) + '"' : '') +
          '><code>' + esc(buf.join('\n')) + '</code></pre>');
      }
      continue;
    }

    // 分隔线
    if (/^(\*\s*){3,}$/.test(line.trim()) || /^-{3,}$/.test(line.trim()) || /^_{3,}$/.test(line.trim())) {
      out.push('<hr>'); i++; continue;
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lv = h[1].length >= 3 ? 4 : 3;
      out.push('<h' + lv + '>' + inline(h[2].trim()) + '</h' + lv + '>');
      i++; continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push('<blockquote>' + inline(joinLines(buf)) + '</blockquote>');
      continue;
    }

    // 表格
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push('<div class="table-wrap"><table><thead><tr>' +
        head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) buf.push(lines[i++].replace(/^\s*[-*+]\s+/, ''));
      out.push('<ul>' + buf.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ul>');
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) buf.push(lines[i++].replace(/^\s*\d+\.\s+/, ''));
      out.push('<ol>' + buf.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ol>');
      continue;
    }

    // 段落
    const buf = [];
    while (i < lines.length && lines[i].trim() &&
      !/^```/.test(lines[i]) && !/^(#{1,6})\s/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(\*\s*){3,}$/.test(lines[i].trim())) {
      buf.push(lines[i++]);
    }
    if (buf.length) out.push('<p>' + inline(joinLines(buf)) + '</p>');
  }
  return out.join('\n');
}

/* ============================================================
   2. 读取内容
   ============================================================ */
function readDir(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => extname(f).toLowerCase() === '.md').map((f) => {
    const raw = readFileSync(join(dir, f), 'utf8');
    const { data, body } = parseFrontMatter(raw);
    return { file: f, data, body: body.trim() };
  });
}

function toDate(v, fallbackFile) {
  const src = String(v || '').trim() || (fallbackFile || '').slice(0, 10);
  const m = src.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m) return new Date(0);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 9), Number(m[5] || 0));
}

const pad = (n) => String(n).padStart(2, '0');

function readMinutes(body) {
  const cjkCount = (body.match(/[\u4e00-\u9fff]/g) || []).length;
  const words = (body.replace(/[\u4e00-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return Math.max(1, Math.round(cjkCount / 380 + words / 220));
}

function loadPosts() {
  const files = readDir(join(CONTENT, 'posts'));
  return files.map(({ file, data, body }) => {
    const date = toDate(data.date, file);
    const slug = (data.slug || file.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')).trim();
    const minutes = readMinutes(body);
    const html = mdToHtml(body);
    const firstPara = (html.match(/<p>([\s\S]*?)<\/p>/) || [, ''])[1].replace(/<[^>]+>/g, '');
    return {
      slug,
      title: data.title || file,
      date: date.toISOString(),
      year: date.getFullYear(),
      month: pad(date.getMonth() + 1),
      day: pad(date.getDate()),
      dateText: `${pad(date.getMonth() + 1)} / ${pad(date.getDate())} / ${date.getFullYear()}`,
      category: data.category || '随笔',
      tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
      cover: data.cover || 'img-1',
      summary: data.summary || firstPara.slice(0, 88),
      minutes,
      draft: data.draft === true,
      html,
    };
  }).filter((p) => !p.draft).sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((p, idx, arr) => Object.assign(p, { no: arr.length - idx }));
}

function loadFragments() {
  return readDir(join(CONTENT, 'fragments')).map(({ file, data, body }) => {
    const date = toDate(data.date, file);
    return {
      date: date.toISOString(),
      dateText: `${pad(date.getMonth() + 1)} / ${pad(date.getDate())}`,
      kind: data.kind || '记录',
      sig: data.sig || '✦',
      style: data.style || '',
      tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
      html: mdToHtml(body),
      text: body.replace(/\n+/g, ' '),
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function loadGallery() {
  return readDir(join(CONTENT, 'gallery')).map(({ file, data, body }) => {
    const date = toDate(data.date, file);
    const time = String(data.date || '').match(/\d{1,2}:\d{2}/);
    return {
      date: date.toISOString(),
      title: data.title || file,
      time: time ? time[0] : '',
      exif: data.exif || '',
      img: data.img || data.cover || 'img-1',
      tags: Array.isArray(data.tags) ? data.tags : [],
      credit: data.credit || '',
      license: data.license || '',
      source: data.source || '',
      html: mdToHtml(body),
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* ============================================================
   3. 生成
   ============================================================ */
const site = JSON.parse(readFileSync(join(CONTENT, 'site.json'), 'utf8'));
site.base = (site.base || '').replace(/\/$/, '');
const posts = loadPosts();
const fragments = loadFragments();
const gallery = loadGallery();

const content = {
  built: new Date().toISOString(),
  site,
  posts,
  fragments,
  gallery,
  stats: { posts: posts.length, fragments: fragments.length, gallery: gallery.length },
};

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const s = join(from, name), d = join(to, name);
    if (statSync(s).isDirectory()) copyTree(s, d);
    else copyFileSync(s, d);
  }
}

function build() {
  if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
  mkdirSync(join(DIST, 'assets'), { recursive: true });

  // 页面骨架 + 资源
  const shell = readFileSync(join(ROOT, 'index.html'), 'utf8');
  writeFileSync(join(DIST, 'index.html'), shell, 'utf8');
  copyFileSync(join(ROOT, 'assets', 'app.js'), join(DIST, 'assets', 'app.js'));
  copyFileSync(join(ROOT, 'assets', 'style.css'), join(DIST, 'assets', 'style.css'));
  if (existsSync(join(ROOT, 'assets', 'img'))) copyTree(join(ROOT, 'assets', 'img'), join(DIST, 'assets', 'img'));

  // 站点数据（同时写回源码目录，保证本地双击 index.html 也能看）
  const js = 'window.MISTY_CONTENT = ' + JSON.stringify(content) + ';\n';
  writeFileSync(join(DIST, 'assets', 'content.js'), js, 'utf8');
  writeFileSync(join(ROOT, 'assets', 'content.js'), js, 'utf8');

  // 每篇文章一个真链接：/p/<slug>/
  for (const p of posts) {
    const dir = join(DIST, 'p', p.slug);
    mkdirSync(dir, { recursive: true });
    const prefix = '../../';
    let page = shell
      .replace(/(href|src)="assets\//g, `$1="${prefix}assets/`)
      .replace('<title>', `<link rel="canonical" href="${site.url}/p/${p.slug}/">\n<title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escAttr(p.summary)}">`)
      .replace('</head>', `<meta property="og:type" content="article">
<meta property="og:title" content="${escAttr(p.title)}">
<meta property="og:description" content="${escAttr(p.summary)}">
<meta property="og:url" content="${site.url}/p/${p.slug}/">
<script>window.__MISTY_BASE__=${JSON.stringify(prefix)};window.__MISTY_POST__=${JSON.stringify(p.slug)};</script>
</head>`)
      .replace(/<article class="rp" id="rp"><\/article>/,
        `<article class="rp" id="rp"><div class="rmeta">${esc(p.dateText)} · ${esc(p.category)} · ${p.minutes} MIN</div><h2>${esc(p.title)}</h2><div class="body">${p.html}</div></article>`)
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escAttr(p.title)} — ${escAttr(site.title)}</title>`)
      ;
    writeFileSync(join(dir, 'index.html'), page, 'utf8');
  }

  // RSS —— 只放最近的几篇。全文 feed 在文章多了以后会变成几 MB，阅读器会吃不消。
  const feedPosts = posts.slice(0, site.feedLimit || 20);
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>${esc(site.title)}</title>
<link>${site.url}/</link>
<description>${esc(site.description)}</description>
<language>zh-CN</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${feedPosts.map((p) => `<item>
<title>${esc(p.title)}</title>
<link>${site.url}/p/${p.slug}/</link>
<guid isPermaLink="true">${site.url}/p/${p.slug}/</guid>
<pubDate>${new Date(p.date).toUTCString()}</pubDate>
${p.tags.map((t) => `<category>${esc(t)}</category>`).join('\n')}
<description>${esc(p.summary)}</description>
<content:encoded><![CDATA[${p.html}]]></content:encoded>
</item>`).join('\n')}
</channel>
</rss>
`;
  writeFileSync(join(DIST, 'feed.xml'), rss, 'utf8');

  // sitemap
  const urls = [`${site.url}/`, ...posts.map((p) => `${site.url}/p/${p.slug}/`)];
  writeFileSync(join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') + '\n</urlset>\n', 'utf8');

  // 404
  writeFileSync(join(DIST, '404.html'),
    `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<title>404 — ${esc(site.title)}</title>
<meta http-equiv="refresh" content="0;url=${site.url}/">
</head><body style="font-family:sans-serif"><p>这里没有东西，<a href="${site.url}/">回雾屿</a>。</p></body></html>
`, 'utf8');

  // 图片版权页：自由版权的照片要求署名，这里把作者 / 许可 / 原始页面列全
  const creditItems = gallery.filter((g) => g.credit || g.license);
  if (creditItems.length) {
    writeFileSync(join(DIST, 'credits.html'),
      `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>图片版权 — ${esc(site.title)}</title>
<style>
body{margin:0;padding:48px 22px 80px;background:linear-gradient(160deg,#F7E8D6,#FDF6EC 45%,#EFDAC4);
  color:#5A3E28;font:15px/1.9 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
h1{font-size:24px;font-weight:600;margin:0 0 8px}
p.lead{color:#8A6E58;font-size:13px;margin:0 0 32px;max-width:60ch}
ul{list-style:none;margin:0 auto;padding:0;max-width:820px;display:grid;gap:14px}
li{display:grid;grid-template-columns:150px 1fr;gap:16px;align-items:center;padding:14px;
  background:rgba(255,255,255,.62);border:1px solid rgba(255,255,255,.7);border-radius:18px;
  box-shadow:0 12px 30px -18px rgba(80,55,35,.4)}
li img{width:150px;height:96px;object-fit:cover;border-radius:12px;display:block}
li b{font-weight:600}
li span{display:block;font-size:12.5px;color:#8A6E58}
a{color:#D2691E}
@media (max-width:560px){li{grid-template-columns:1fr}li img{width:100%;height:150px}}
</style></head><body>
<h1>图片版权</h1>
<p class="lead">本站配图来自 Wikimedia Commons 等自由版权来源，作者与许可如下。站内图片未经修改（仅按显示尺寸缩放），
版权归原作者所有。如果你要转载本站文字，请一并保留这里的署名。</p>
<ul>
${creditItems.map((g) => `<li><img src="${esc(g.img)}" loading="lazy" alt=""><div><b>${esc(g.title)}</b>
<span>${esc(g.credit)} · ${esc(g.license)}</span>
<span><a href="${esc(g.source)}" target="_blank" rel="noopener">查看原始页面</a></span></div></li>`).join('\n')}
</ul>
<p style="max-width:820px;margin:28px auto 0"><a href="${site.url}/">← 回到雾屿</a></p>
</body></html>
`, 'utf8');
  }

  // GitHub Pages 相关
  writeFileSync(join(DIST, '.nojekyll'), '', 'utf8');
  if (site.cname) writeFileSync(join(DIST, 'CNAME'), site.cname + '\n', 'utf8');

  const kb = (n) => (n / 1024).toFixed(1) + ' KB';
  console.log(`雾屿 · 构建完成`);
  console.log(`  文章 ${posts.length} · 碎片 ${fragments.length} · 图集 ${gallery.length}`);
  console.log(`  输出 ${relative(process.cwd(), DIST) || DIST}  (content.js ${kb(Buffer.byteLength(js))})`);
  posts.forEach((p) => console.log(`    /p/${p.slug}/  ${p.title}`));
}

/* ============================================================
   4. 本地预览（零依赖静态服务）
   ============================================================ */
async function serve(port) {
  const { createServer } = await import('node:http');
  const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  };
  createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    let file = join(DIST, p);
    if (p.endsWith('/')) file = join(file, 'index.html');
    if (!existsSync(file) && existsSync(file + '.html')) file += '.html';
    if (!existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end('404');
      return;
    }
    res.writeHead(200, { 'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(file));
  }).listen(port, () => console.log(`\n  预览：http://localhost:${port}/   (Ctrl+C 结束)\n`));
}

build();
const serveArg = process.argv.find((a) => a.startsWith('--serve'));
if (serveArg) serve(Number(serveArg.split('=')[1]) || 4173);
