const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const os = require('os');

const app = express();
const PORT = 3000;

// 토큰 저장소 (메모리)
const tokens = new Map();

// 만료된 토큰 주기적 정리
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokens.entries()) {
    // 만료 후 5분 뒤 삭제
    if (data.expiresAt + 300000 < now) {
      tokens.delete(token);
    }
  }
}, 60000);

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

app.use(express.static('public'));
app.use(express.json());

// QR 코드 생성
app.get('/api/generate', async (req, res) => {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    const cardNum = Math.floor(Math.random() * 15) + 1;
    // 1/50 확률로 레어
    const isRare = Math.random() < 1 / 50;
    const now = Date.now();

    tokens.set(token, {
      cardNum,
      isRare,
      createdAt: now,
      expiresAt: now + 30000,
      used: false
    });

    // 터널(ngrok/localtunnel) 경유 시 자동으로 해당 도메인 사용
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `${getLocalIP()}:${PORT}`;
    const url = `${proto}://${host}/card.html?token=${token}`;

    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#1a1a2e', light: '#ffffff' }
    });

    res.json({
      success: true,
      token,
      qrCode: qrDataUrl,
      url,
      expiresAt: now + 30000
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 토큰 사용 (카드 클레임)
app.get('/api/claim/:token', (req, res) => {
  const { token } = req.params;
  const data = tokens.get(token);

  if (!data) {
    return res.json({ success: false, error: 'invalid', message: '유효하지 않은 QR 코드입니다.' });
  }

  if (Date.now() > data.expiresAt) {
    return res.json({ success: false, error: 'expired', message: 'QR 코드가 만료되었습니다. 다시 스캔해주세요.' });
  }

  if (data.used) {
    return res.json({ success: false, error: 'used', message: '이미 사용된 QR 코드입니다.' });
  }

  // 첫 번째 클레임 시 사용 처리
  data.used = true;

  res.json({
    success: true,
    cardNum: data.cardNum,
    isRare: data.isRare
  });
});

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n🎴 카드깡 서버 시작!`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📱 로컬:     http://localhost:${PORT}`);
  console.log(`📡 네트워크: http://${ip}:${PORT}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`⚠️  같은 WiFi에 연결된 폰에서 스캔 가능`);
});
