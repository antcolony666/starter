param(
    [Parameter(Mandatory=$true)][string]$PublishDirectory,
    [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'dist\TempoTimeline-VSTO')
)
$ErrorActionPreference = 'Stop'
$publish = (Resolve-Path $PublishDirectory).Path
$vsto = Get-ChildItem $publish -Filter '*.vsto' -File -Recurse | Select-Object -First 1
if (-not $vsto) { throw "发布目录未找到 .vsto 部署清单：$publish。请先通过 Visual Studio Publish 向导发布并签名。" }
if (Test-Path $OutputDirectory) { Remove-Item $OutputDirectory -Recurse -Force }
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
Copy-Item (Join-Path $publish '*') $OutputDirectory -Recurse -Force
Copy-Item (Join-Path $PSScriptRoot 'install.ps1') $OutputDirectory -Force
Copy-Item (Join-Path $PSScriptRoot 'uninstall.ps1') $OutputDirectory -Force
Copy-Item (Join-Path $PSScriptRoot 'README-COM.md') $OutputDirectory -Force
$manifestName = [IO.Path]::GetFileName($vsto.FullName)
$zip = "$OutputDirectory.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $OutputDirectory '*') -DestinationPath $zip -CompressionLevel Optimal
Write-Host "已打包签名的 VSTO 发布内容（入口：$manifestName）：$zip"
