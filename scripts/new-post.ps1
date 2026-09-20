# 新建一篇文章（本地写作时用）
#
# 用法：
#   pwsh -File scripts\new-post.ps1 -Title "模拟退火怎么调参" -Category 技术 -Tags 算法,笔记 -Slug annealing-tuning
#
# 说明：会生成 content/posts/<日期>-<slug>.md，里面是填好的 front matter 模板。
#      标题是中文时请务必用 -Slug 指定一个英文短名（它会成为文章链接 /p/<slug>/）。

param(
  [Parameter(Mandatory = $true)][string]$Title,
  [string]$Category = '随笔',
  [string[]]$Tags = @(),
  [string]$Slug = '',
  [string]$Cover = 'img-3'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$postsDir = Join-Path $root 'content\posts'

if (-not $Slug) {
  $Slug = ($Title -replace '[^\w\-]+', '-').Trim('-').ToLower()
}
if (-not $Slug -or $Slug -notmatch '^[a-z0-9][a-z0-9\-]*$') {
  throw "请用 -Slug 指定英文短名（小写字母、数字、连字符），例如 -Slug annealing-tuning"
}

$date = Get-Date
$file = Join-Path $postsDir ("{0}-{1}.md" -f $date.ToString('yyyy-MM-dd'), $Slug)
if (Test-Path $file) { throw "已存在：$file" }

$tagLine = if ($Tags.Count) { '[' + ($Tags -join ', ') + ']' } else { '[]' }
$template = @"
---
title: $Title
date: $($date.ToString('yyyy-MM-dd HH:mm'))
category: $Category
tags: $tagLine
cover: $Cover
summary:
---

在这里写正文。支持 Markdown：标题、列表、引用、代码块、表格、图片。

```math
E = mc^2
```
"@

Set-Content -LiteralPath $file -Value $template -Encoding utf8
Write-Host "已创建：$file" -ForegroundColor Green
Write-Host "预览：node build.mjs --serve  然后打开 http://localhost:4173/" -ForegroundColor Cyan
