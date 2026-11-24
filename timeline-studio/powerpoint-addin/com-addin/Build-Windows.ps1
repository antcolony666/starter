param([ValidateSet('Debug','Release')][string]$Configuration = 'Release')
$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot 'TempoTimelineAddin.csproj'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$msbuild = $null
if (Test-Path $vswhere) {
    $msbuild = & $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -find 'MSBuild\**\Bin\MSBuild.exe' | Select-Object -First 1
}
if (-not $msbuild) { $msbuild = (Get-Command msbuild.exe -ErrorAction SilentlyContinue).Source }
if (-not $msbuild) { throw '找不到 MSBuild。请安装 Windows Visual Studio 2022 和 Office/VSTO 开发工具。' }
& $msbuild $project /restore /t:Rebuild "/p:Configuration=$Configuration" '/p:Platform=AnyCPU' '/m'
if ($LASTEXITCODE -ne 0) { throw "MSBuild 失败，代码 $LASTEXITCODE。" }
Write-Host "VSTO 程序集已构建：$(Join-Path $PSScriptRoot "bin\$Configuration")"
Write-Host '这一步不会伪造发布清单。请用 Visual Studio Publish 向导配置签名并生成 .vsto，再运行 Package-Windows.ps1。'
