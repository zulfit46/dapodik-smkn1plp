export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const botToken = (body.botToken || process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = (body.chatId || process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID || '').trim();
    const message = body.message;

    if (!message) {
      return res.status(400).json({ status: 'error', message: 'Pesan tidak boleh kosong' });
    }

    if (!botToken || !chatId) {
      return res.status(400).json({
        status: 'error',
        message: 'Bot Token atau Chat ID belum ditentukan di konfigurasi aplikasi / Environment Variables Vercel',
      });
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const tgRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data: any = await tgRes.json();
    if (!tgRes.ok || !data.ok) {
      return res.status(tgRes.status || 400).json({
        status: 'error',
        message: data.description || 'Gagal mengirim pesan ke Telegram API',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Pesan berhasil dikirim ke Telegram',
      result: data,
    });
  } catch (err: any) {
    console.error('[Vercel Serverless Telegram Send Error]:', err);
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Internal Server Error saat memproses Telegram',
    });
  }
}
