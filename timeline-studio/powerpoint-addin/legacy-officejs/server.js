/**
 * 本地开发静态服务器 (Local Development Static Server)
 * 纯 Node.js 内建模块实现，零外部依赖。
 * 支持 HTTP 与 HTTPS (当本地存在 certs/cert.pem 与 certs/key.pem 时自动开启)。
 */

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// MIME 类型映射表
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.ico': 'image/x-icon'
};

function handleRequest(req, res) {
  // 设置 CORS 与跨域隔离头，满足 Office.js 任务窗格安全需求
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 解析并规范化请求路径
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;
  if (pathname === '/' || pathname === '') {
    pathname = '/taskpane.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 未找到资源: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// 检查是否存在 HTTPS 自签名证书
const certPath = path.join(__dirname, 'certs', 'cert.pem');
const keyPath = path.join(__dirname, 'certs', 'key.pem');

let server;
let isHttps = false;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  try {
    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    server = https.createServer({ key, cert }, handleRequest);
    isHttps = true;
  } catch (e) {
    console.warn('读取 HTTPS 证书失败，降级为 HTTP 模式:', e.message);
    server = http.createServer(handleRequest);
  }
} else {
  server = http.createServer(handleRequest);
}

server.listen(PORT, '0.0.0.0', () => {
  const protocol = isHttps ? 'https' : 'http';
  console.log(`\n======================================================`);
  console.log(`🚀 Tempo PowerPoint 时间线加载项 本地开发服务器已启动:`);
  console.log(`   访问地址: ${protocol}://localhost:${PORT}/taskpane.html`);
  console.log(`   Manifest: ${protocol}://localhost:${PORT}/manifest.xml`);
  if (!isHttps) {
    console.log(`\n💡 提示: Office.js 加载项在生产与部分桌面端 PowerPoint 中要求 HTTPS。`);
    console.log(`   如需 HTTPS，请执行 openssl 生成证书到 ./certs/ 目录 (详见 README.md)。`);
  }
  console.log(`======================================================\n`);
});
