// 无需额外依赖的本地预览服务器：node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const initialPort = Number(process.env.PORT || 4173);
let port = initialPort;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch (_) { res.writeHead(400); res.end('Bad Request'); return; }
  const target = path.resolve(root, '.' + urlPath.replace(/\//g, path.sep));
  if (target !== root && !target.startsWith(root + path.sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  const file = target === root ? path.join(root, 'index.html') : target;
  fs.readFile(file, (error, buffer) => {
    if (error) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buffer);
  });
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE' && !process.env.PORT && port < initialPort + 20) {
    port += 1;
    server.listen(port, '127.0.0.1');
  } else {
    console.error(`启动失败：${error.message}`);
    process.exitCode = 1;
  }
});
server.on('listening', () => console.log(`星芽学堂： http://127.0.0.1:${port}`));
server.listen(port, '127.0.0.1');
