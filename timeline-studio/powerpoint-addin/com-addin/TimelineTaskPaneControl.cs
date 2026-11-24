using System;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Tempo.TimelineAddin
{
    [DataContract]
    internal sealed class TimelineBridgeRequest
    {
        [DataMember(Name = "type")] public string Type { get; set; }
        [DataMember(Name = "requestId")] public string RequestId { get; set; }
        [DataMember(Name = "density")] public string Density { get; set; }
        [DataMember(Name = "data")] public TimelineData Data { get; set; }
    }

    internal sealed class TimelineTaskPaneControl : UserControl
    {
        private readonly WebView2 _webView = new WebView2 { Dock = DockStyle.Fill };
        private readonly Label _error = new Label { Dock = DockStyle.Fill, TextAlign = System.Drawing.ContentAlignment.MiddleCenter, Padding = new Padding(18), Visible = false };
        private bool _ready;

        public TimelineTaskPaneControl()
        {
            Controls.Add(_webView);
            Controls.Add(_error);
            Load += InitializeWebView;
        }

        private async void InitializeWebView(object sender, EventArgs e)
        {
            try
            {
                string assemblyDirectory = Path.GetDirectoryName(typeof(TimelineTaskPaneControl).Assembly.Location);
                string webRoot = Path.Combine(assemblyDirectory, "web");
                string page = Path.Combine(webRoot, "taskpane.html");
                if (!File.Exists(page)) throw new FileNotFoundException("找不到随加载项部署的前端文件。", page);

                string userData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Tempo", "PowerPointTimeline", "WebView2");
                if (!Directory.Exists(userData)) Directory.CreateDirectory(userData);
                CoreWebView2Environment environment = await CoreWebView2Environment.CreateAsync(null, userData);
                await _webView.EnsureCoreWebView2Async(environment);
                _webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
                _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                _webView.CoreWebView2.SetVirtualHostNameToFolderMapping("tempo.local", webRoot, CoreWebView2HostResourceAccessKind.Allow);
                _webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
                _webView.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
                _webView.Source = new Uri("https://tempo.local/taskpane.html");
            }
            catch (Exception ex)
            {
                _webView.Visible = false;
                _error.Visible = true;
                _error.Text = "无法启动 Tempo 时间线工作台。\r\n请确认 Microsoft Edge WebView2 Runtime 已安装，并重新安装插件。\r\n\r\n" + ex.Message;
            }
        }

        private void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            if (!e.IsSuccess) return;
            _ready = true;
            _webView.CoreWebView2.PostWebMessageAsJson("{\"type\":\"hostStatus\",\"available\":true}");
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            if (!String.Equals(e.Source, "https://tempo.local/taskpane.html", StringComparison.OrdinalIgnoreCase)) return;
            string json;
            try { json = e.TryGetWebMessageAsString(); }
            catch { return; }
            if (String.IsNullOrWhiteSpace(json)) return;

            TimelineBridgeRequest request;
            try
            {
                using (var stream = new MemoryStream(Encoding.UTF8.GetBytes(json)))
                    request = new DataContractJsonSerializer(typeof(TimelineBridgeRequest)).ReadObject(stream) as TimelineBridgeRequest;
            }
            catch (Exception ex)
            {
                PostResult(null, false, 0, "无法读取时间线请求：" + ex.Message);
                return;
            }
            if (request == null || request.Type != "insertTimeline" || request.Data == null)
            {
                PostResult(request == null ? null : request.RequestId, false, 0, "时间线请求格式无效。");
                return;
            }
            try
            {
                request.Data.Density = request.Density ?? request.Data.Density;
                int count = PowerPointTimelineRenderer.Insert(Globals.ThisAddIn.Application, request.Data);
                PostResult(request.RequestId, true, count, "成功插入 " + count + " 个 PowerPoint 原生可编辑形状。");
            }
            catch (Exception ex)
            {
                PostResult(request.RequestId, false, 0, ex.Message);
            }
        }

        private void PostResult(string requestId, bool success, int count, string message)
        {
            if (!_ready || _webView.CoreWebView2 == null) return;
            var response = new { type = "insertResult", requestId = requestId, success = success, insertedCount = count, message = message };
            string json = new JavaScriptSerializer().Serialize(response);
            _webView.CoreWebView2.PostWebMessageAsJson(json);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing && _webView != null)
            {
                try { if (_webView.CoreWebView2 != null) _webView.CoreWebView2.WebMessageReceived -= OnWebMessageReceived; } catch { }
                _webView.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
