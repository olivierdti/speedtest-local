const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const localIP = getLocalIP();
  
  const isLocalhost = clientIP === '::1' || 
                      clientIP === '127.0.0.1' || 
                      clientIP === '::ffff:127.0.0.1' ||
                      clientIP === `::ffff:${localIP}` ||
                      clientIP === localIP;
  
  res.render('index', { isLocalhost, serverIP: localIP });
});

app.get('/ping', (req, res) => {
  res.json({ t: Date.now() });
});

app.get('/download', (req, res) => {
  const size = Math.max(0, parseInt(req.query.size, 10) || 5 * 1024 * 1024);
  try {
    const buf = Buffer.allocUnsafe(size).fill('a');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
  } catch (err) {
    console.error('Erreur allocation buffer download:', err.message);
    res.status(500).json({ error: 'serveur ne peut pas allouer le buffer demandé' });
  }
});

app.get('/download-stream', (req, res) => {
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Content-Encoding', 'identity');

  const chunk = Buffer.alloc(1024 * 1024, 'a');
  let destroyed = false;

  req.on('close', () => {
    destroyed = true;
    try { res.end(); } catch (e) { }
  });

  function writeLoop() {
    if (destroyed) return;
    const ok = res.write(chunk);
    if (ok) {
      setImmediate(writeLoop);
    } else {
      res.once('drain', writeLoop);
    }
  }

  writeLoop();
});

app.post('/upload', express.raw({ limit: '500mb', type: '*/*' }), (req, res) => {
  const bytes = req.body ? req.body.length : 0;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ received: bytes }));
});

app.listen(port, () => {
  const localIP = getLocalIP();
  console.log(`\n╔════════════════════════════════════════════════════════╗`);
  console.log(`║  Speedtest Local Server                                ║`);
  console.log(`╠════════════════════════════════════════════════════════╣`);
  console.log(`║  Local:   http://localhost:${port.toString().padEnd(31)}║`);
  console.log(`║  Network: http://${localIP}:${port.toString().padEnd(31 - localIP.length)}║`);
  console.log(`╚════════════════════════════════════════════════════════╝\n`);
});
