/**
 * PowerPoint VSTO / WebView2 bridge.
 * 前端通过本地 WebView2 的 JSON 消息调用托管式 COM 加载项；不使用 Office.js 或 localhost 服务。
 */
const pendingRequests = new Map();
let requestCounter = 0;
let bridgeInstalled = false;

function getWebView() {
  return typeof window !== 'undefined' && window.chrome && window.chrome.webview ? window.chrome.webview : null;
}

function installBridgeListener() {
  const webview = getWebView();
  if (!webview || bridgeInstalled) return;
  bridgeInstalled = true;
  webview.addEventListener('message', (event) => {
    let message = event.data;
    if (typeof message === 'string') {
      try { message = JSON.parse(message); } catch (_) { return; }
    }
    if (!message || typeof message !== 'object') return;
    if (message.type === 'hostStatus') {
      window.__tempoPowerPointBridgeAvailable = Boolean(message.available);
      window.dispatchEvent(new CustomEvent('tempo-host-status'));
    }
    if (message.type === 'insertResult' && pendingRequests.has(message.requestId)) {
      const request = pendingRequests.get(message.requestId);
      pendingRequests.delete(message.requestId);
      clearTimeout(request.timeout);
      if (message.success) request.resolve({ success: true, insertedCount: message.insertedCount, message: message.message });
      else request.reject(new Error(message.message || '插入时间线失败。'));
    }
  });
}

export function checkOfficeHostStatus() {
  installBridgeListener();
  const available = Boolean(getWebView() && window.__tempoPowerPointBridgeAvailable !== false);
  return {
    available,
    isPowerPoint: available,
    hasApi14: available,
    message: available
      ? 'PowerPoint VSTO 已连接（WebView2 本地任务窗格）。'
      : '未检测到 PowerPoint VSTO 宿主；当前仅为浏览器预览。'
  };
}

export function insertTimelineToPowerPoint(timelineData, density = 'detailed') {
  installBridgeListener();
  const webview = getWebView();
  if (!webview) {
    return Promise.reject(new Error('未连接 PowerPoint VSTO 插件。请从 PowerPoint 功能区打开 Tempo 时间线工作台。'));
  }
  const requestId = `timeline-${Date.now()}-${++requestCounter}`;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('PowerPoint 插件响应超时，请检查当前演示文稿是否仍可编辑。'));
    }, 30000);
    pendingRequests.set(requestId, { resolve, reject, timeout });
    try {
      webview.postMessage(JSON.stringify({ type: 'insertTimeline', requestId, density, data: timelineData }));
    } catch (error) {
      clearTimeout(timeout);
      pendingRequests.delete(requestId);
      reject(new Error(`无法向 PowerPoint 插件发送请求：${error.message}`));
    }
  });
}
