import test from 'node:test';
import assert from 'node:assert/strict';
import { checkOfficeHostStatus, insertTimelineToPowerPoint } from '../src/office-powerpoint.js';

function setBridge(bridge) {
  const handlers = {};
  bridge.addEventListener = (name, handler) => { handlers[name] = handler; };
  globalThis.window = {
    chrome: { webview: bridge },
    dispatchEvent() {}
  };
  return handlers;
}

test('WebView2 bridge reports the local VSTO host and resolves insert responses', async () => {
  let sent;
  const bridge = { postMessage(message) { sent = JSON.parse(message); } };
  const handlers = setBridge(bridge);
  const host = checkOfficeHostStatus();
  assert.equal(host.isPowerPoint, true);
  assert.match(host.message, /VSTO/);

  const promise = insertTimelineToPowerPoint({ title: '测试', lanes: [], tasks: [] }, 'overview');
  assert.equal(sent.type, 'insertTimeline');
  assert.equal(sent.density, 'overview');
  handlers.message({ data: { type: 'insertResult', requestId: sent.requestId, success: true, insertedCount: 12, message: 'done' } });
  const result = await promise;
  assert.equal(result.insertedCount, 12);
  assert.equal(result.message, 'done');
});

test('inserting outside WebView2 rejects with a helpful host message', async () => {
  globalThis.window = {};
  assert.equal(checkOfficeHostStatus().isPowerPoint, false);
  await assert.rejects(insertTimelineToPowerPoint({}, 'detailed'), /未连接 PowerPoint VSTO 插件/);
});
