import http from 'http';

const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

function check() {
  return new Promise((resolve, reject) => {
    const req = http.request({ host, port, path: '/api/health', method: 'GET', timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(true); else reject(new Error('health failed'));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

check().then(() => { console.log('health ok'); process.exit(0); }).catch((e) => { console.error('healthcheck failed', e); process.exit(2); });
