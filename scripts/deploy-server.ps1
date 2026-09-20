# 把 dist/ 同步到自己的服务器（阿里云 47.122.119.199）
# 前提：本机有 ssh/scp，且有私钥 C:\Users\railgun\Downloads\dp.pem
#
# 用法：
#   pwsh -File scripts\deploy-server.ps1                 # 只构建 + 上传到 /www/wwwroot/misty-isle
#   pwsh -File scripts\deploy-server.ps1 -DryRun         # 只看会上传什么
#
# 说明：脚本只写目标目录，不碰服务器上已有的站点配置；
#       nginx 的 server 段需要你自己在宝塔里加（见 README「部署到自己的服务器」）。

param(
  [string]$Key  = "C:\Users\railgun\Downloads\dp.pem",
  [string]$User = "root",
  [string]$Host_ = "47.122.119.199",
  [string]$RemoteDir = "/www/wwwroot/misty-isle",
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host "== 1/3 本地构建 ==" -ForegroundColor Cyan
node (Join-Path $root 'build.mjs')
if ($LASTEXITCODE -ne 0) { throw '构建失败' }

$dist = Join-Path $root 'dist'
if (-not (Test-Path $dist)) { throw "找不到 $dist" }

Write-Host "== 2/3 准备远端目录 $RemoteDir ==" -ForegroundColor Cyan
if ($DryRun) {
  Write-Host "[dry-run] ssh $User@$Host_ mkdir -p $RemoteDir"
} else {
  ssh -i $Key "$User@$Host_" "mkdir -p $RemoteDir"
  if ($LASTEXITCODE -ne 0) { throw 'ssh 连接失败' }
}

Write-Host "== 3/3 上传 dist/ ==" -ForegroundColor Cyan
if ($DryRun) {
  Write-Host "[dry-run] scp -r dist/* -> ${User}@${Host_}:$RemoteDir"
} else {
  # 先传到一个临时目录再覆盖，避免半截文件被访问到
  ssh -i $Key "$User@$Host_" "rm -rf ${RemoteDir}.new && mkdir -p ${RemoteDir}.new"
  scp -i $Key -r "$dist\*" "${User}@${Host_}:${RemoteDir}.new/"
  if ($LASTEXITCODE -ne 0) { throw 'scp 失败' }
  ssh -i $Key "$User@$Host_" "rsync -a --delete ${RemoteDir}.new/ ${RemoteDir}/ && rm -rf ${RemoteDir}.new"
}

Write-Host "完成。远端目录：$RemoteDir" -ForegroundColor Green
