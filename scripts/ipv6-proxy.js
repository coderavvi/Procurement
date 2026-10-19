const http = require('http');
const net = require('net');
const dnsPromises = require('dns').promises;

const resolver = new dnsPromises.Resolver();
resolver.setServers(['[2a01:4f9:c010:3f02::1]', '[2001:67c:2b0::4]']);

async function resolveHost(hostname) {
  if (net.isIP(hostname)) return hostname;
  try {
    const addresses = await resolver.resolve6(hostname);
    if (addresses && addresses.length > 0) {
      const preferred = addresses.find(a => a.startsWith('2a01:4f9:c010:3f02:'));
      return preferred || addresses[0];
    }
  } catch (e) {
    console.error('DNS resolve error for', hostname, e.message);
  }
  return hostname;
}

const server = http.createServer((req, res) => {
  res.writeHead(501);
  res.end('Only CONNECT is supported');
});

server.on('connect', async (req, clientSocket, head) => {
  const [hostname, portStr] = req.url.split(':');
  const port = parseInt(portStr || '443', 10);

  try {
    const targetIp = await resolveHost(hostname);
    const remoteSocket = net.connect({ host: targetIp, port: port, family: 6 }, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head && head.length > 0) remoteSocket.write(head);
      clientSocket.pipe(remoteSocket);
      remoteSocket.pipe(clientSocket);
    });

    remoteSocket.on('error', (err) => {
      console.error('Remote error:', hostname, err.message);
      clientSocket.destroy();
    });

    clientSocket.on('error', (err) => {
      remoteSocket.destroy();
    });
  } catch (err) {
    console.error('Connect error:', err.message);
    clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
  }
});

const PORT = 7890;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`IPv6 bridge proxy running on http://127.0.0.1:${PORT}`);
});
