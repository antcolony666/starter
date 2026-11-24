# Tempo PowerPoint 时间线 — VSTO / COM 加载项

本项目已从 Office.js 网页加载项重构为 **Windows PowerPoint VSTO 加载项**（托管式 COM Add-in）。Ribbon 按钮打开 WebView2 本地任务窗格；网页编辑器与 C# 通过 JSON 消息桥通信，C# 再通过 PowerPoint Interop 插入可独立编辑的原生形状。

## 当前结构

- `com-addin/TempoTimelineAddin.csproj`：.NET Framework 4.8 VSTO 项目。
- `com-addin/ThisAddIn.cs`、`ThisAddIn.Designer.cs`、`Ribbon1.cs`：VSTO 加载生命周期、PowerPoint 宿主包装、功能区入口与自定义任务窗格。
- `com-addin/TimelineTaskPaneControl.cs`：WebView2 初始化、本地资源映射、JSON 请求/响应。
- `com-addin/TimelineModel.cs`、`TimelineLayout.cs`：C# 数据校验和时间线排版。
- `com-addin/PowerPointTimelineRenderer.cs`：PowerPoint Interop 原生形状绘制，并按演示文稿实际宽高缩放坐标。
- `src/`、`taskpane.html`、`taskpane.css`：原有时间线编辑器、实时预览与纯逻辑模块；部署时作为插件内的本地文件，不需要 localhost。
- `tests/`：Node.js 自动化测试与可单独编译的 C# 核心冒烟测试。
- `legacy-officejs/`：旧 Office.js 侧载清单、服务器与图标归档，不属于新插件的安装入口。

## 插件的交付类型

**目标交付是 VSTO ClickOnce 发布包**：发布目录包含 `.vsto` 部署清单、应用清单及托管程序集；可连同依赖文件打成 ZIP 分发。`.vsto` 是安装清单，不是可独立运行的 DLL；安装由 Microsoft VSTO Installer 完成。正式分发需要发布者代码签名证书，并应使用 Visual Studio 的 VSTO Publish 流程生成/签署清单。项目还依赖 .NET Framework 4.8、VSTO Runtime 和 Microsoft Edge WebView2 Runtime。

当前执行环境是 Linux，没有 Visual Studio VSTO Build Tools、Windows PowerPoint 或对应运行时，因此这里无法生成签名后的 `.vsto` 发布包，也无法完成实际安装/COM 宿主验收。Windows 构建入口在 `com-addin/Build-Windows.ps1`；真实签名发布目录打包入口在 `com-addin/Package-Windows.ps1`。不能把归档的 Office.js `manifest.xml` 当作 VSTO 插件安装。

## 开发环境、构建与发布

需要 Windows、Visual Studio 2022（包含 Office/SharePoint 开发工具与 VSTO）、.NET Framework 4.8 Developer Pack，以及 PowerPoint 桌面版。WebView2 SDK 由 NuGet 还原；运行机器需要 WebView2 Evergreen Runtime。

在 PowerShell 中先编译：

```powershell
cd com-addin
.\Build-Windows.ps1 -Configuration Release
```

然后在 Visual Studio 打开 `TempoTimelineAddin.csproj`，配置代码签名证书及目标发布位置，使用 **Publish** 向导发布。最后把发布目录传给打包脚本：

```powershell
.\Package-Windows.ps1 -PublishDirectory .\bin\Release\app.publish
```

实际的 Publish 输出路径以 Visual Studio 发布设置为准；脚本会要求目录中存在真实的 `.vsto` 清单，避免制作不可安装的伪包。将生成的 ZIP 解压后运行 `install.ps1`；卸载时运行 `uninstall.ps1`。先在干净 Windows 测试机验证安装与卸载，再分发给用户。

## 本地逻辑测试

```bash
node --test tests/*.test.js
bash tests/run-csharp-core-tests.sh  # 需要 Mono；仅编译数据/排版核心
```

当前测试通过情况：15 项 Node.js 测试通过；C# 核心冒烟测试可在 Mono 编译运行。它们不等同于 Windows VSTO 构建或 PowerPoint 宿主测试。

## 安装与卸载

在已签名的发布目录中运行：

```powershell
.\install.ps1
.\uninstall.ps1
```

安装脚本调用 VSTO Runtime 的 `VSTOInstaller.exe` 加载 `.vsto` 清单。组织内发布需确认信任策略允许相应签名证书；请勿为绕过信任策略而关闭 Office 安全设置。

## Windows 验收清单

- 安装、首次启动、升级、卸载与重复安装；确认 Office 不会因加载失败而禁用插件。
- 32 位与 64 位 PowerPoint（VSTO 托管项目按宿主位数加载）；不同的 VSTO Runtime 与 WebView2 Runtime 状态。
- 测试时间线、泳道、长标题、跨月/跨年任务、里程碑、详细/概览密度。
- 测试 16:9、4:3 和自定义幻灯片尺寸上的实际坐标、字体、文字溢出与滚动/缩放。
- 测试未选中幻灯片、只读演示文稿和 PowerPoint COM 异常时的错误提示。
- 确认插件包仅访问随包本地前端，不启动 localhost 服务，也不向外部服务器发送时间线数据。
