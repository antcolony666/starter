# VSTO PowerPoint 加载项：Windows 构建与发布

## 目标和文件类型

该项目生成托管式 PowerPoint COM 加载项。开发产物是 .NET Framework 程序集；面向用户的 VSTO ClickOnce 发布包包含 `.vsto` 部署清单、应用程序清单、程序集和 `web/` 下的本地任务窗格资源。安装使用 `VSTOInstaller.exe`，不是 Office.js `manifest.xml` 侧载，也不是 VBA `.ppam`。

## 必需组件

- Windows 与桌面版 Microsoft PowerPoint。
- Visual Studio 2022 的 Office/SharePoint 开发工具（VSTO）及 .NET Framework 4.8 Developer Pack。
- Microsoft Office VSTO Runtime。
- Microsoft Edge WebView2 Evergreen Runtime；大多数现代 Windows 环境已安装，但应在干净机器上检查。
- 正式发布使用组织/发布者代码签名证书，并满足目标 Office 的信任中心策略。

## 构建与发布

1. 在 Visual Studio 中打开 `TempoTimelineAddin.csproj`，通过 NuGet 还原 `Microsoft.Web.WebView2`。
2. 选择 Release，执行 `Build-Windows.ps1` 编译。VSTO 的 `ThisAddIn` 宿主类型、CustomTaskPanes 集合和 `Globals` 入口均需与 Visual Studio VSTO 工具链配套。
3. 在 Visual Studio 的 VSTO **Publish** 向导中配置签名证书和发布位置，生成真实的 `.vsto` ClickOnce 部署清单及应用程序清单。
4. 将发布目录传给 `Package-Windows.ps1`。脚本会检查真实 `.vsto` 清单存在，再将发布目录、安装/卸载脚本打成 ZIP；不要只拷贝 DLL，也不要破坏清单引用的目录结构。
5. 在测试机运行 `install.ps1`；卸载时运行 `uninstall.ps1`。VSTO Installer 会读取清单并注册/卸载加载项。

VSTO ClickOnce 清单需要签名和受信任的发布者；脚本不会自行伪造清单或证书。发布位置、更新策略、Office 32/64 位、VSTO Runtime/WebView2 Runtime 都需要在目标 Windows 环境验证。

## 资源和数据流

- 前端 HTML/CSS/ES Modules 随 VSTO 程序集部署到 `web/`，通过 WebView2 的虚拟主机映射加载，不启本地 HTTP 服务。
- 前端发送 JSON `insertTimeline` 消息；VSTO 检查请求后调用 PowerPoint Interop，在当前幻灯片插入矩形、圆角矩形、菱形和文本框。
- 示例和编辑数据沿用浏览器本地存储；消息只在本机 WebView2 与 VSTO 之间流转。

## 尚需 Windows 真机验收

本源代码开发环境是 Linux，无法运行 VSTO 的 MSBuild 目标或启动 PowerPoint。正式交付前需要验证签名发布、安装/卸载/升级、加载失败恢复，以及不同 Office 位数、幻灯片尺寸、字体回退和长文本溢出。
