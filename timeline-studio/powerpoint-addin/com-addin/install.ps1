$ErrorActionPreference = 'Stop'
$manifest = Get-ChildItem $PSScriptRoot -Filter '*.vsto' -File -Recurse | Select-Object -First 1
if (-not $manifest) { throw "找不到 VSTO 部署清单：$PSScriptRoot。请先在 Windows Visual Studio 中发布插件。" }
$paths = @(
    (Join-Path ([Environment]::GetEnvironmentVariable('CommonProgramFiles')) 'Microsoft Shared\VSTO\10.0\VSTOInstaller.exe'),
    (Join-Path ([Environment]::GetEnvironmentVariable('CommonProgramFiles(x86)')) 'Microsoft Shared\VSTO\10.0\VSTOInstaller.exe')
)
foreach ($key in @('HKLM:\SOFTWARE\Microsoft\VSTO Runtime Setup\v4', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\VSTO Runtime Setup\v4')) {
    try { $paths += (Get-ItemProperty -Path $key -Name InstallerPath -ErrorAction Stop).InstallerPath } catch { }
}
$installer = $paths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $installer) { throw '未检测到 VSTO Runtime。请安装 Microsoft Office VSTO Runtime 后重试。' }
& $installer /Install $manifest.FullName
if ($LASTEXITCODE -ne 0) { throw "VSTO 安装器返回错误代码 $LASTEXITCODE。" }
Write-Host 'Tempo PowerPoint 时间线加载项安装完成。请重启 PowerPoint。'
