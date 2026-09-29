export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const defaultBotToken = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || '';
  const defaultChatId = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID || '';
  const hasEnvToken = Boolean(defaultBotToken && defaultChatId);

  if (req.method === 'GET') {
    return res.status(200).json({
      botToken: defaultBotToken,
      chatId: defaultChatId,
      enabled: hasEnvToken,
      notifyMutasiMasuk: true,
      notifyMutasiKeluar: true,
      notifyPangkatBaru: true,
      notifyKGBBaru: true,
    });
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    return res.status(200).json({
      status: 'success',
      message: 'Pengaturan Telegram berhasil diproses',
      config: {
        botToken: body.botToken || defaultBotToken,
        chatId: body.chatId || defaultChatId,
        enabled: body.enabled ?? hasEnvToken,
        notifyMutasiMasuk: body.notifyMutasiMasuk ?? true,
        notifyMutasiKeluar: body.notifyMutasiKeluar ?? true,
        notifyPangkatBaru: body.notifyPangkatBaru ?? true,
        notifyKGBBaru: body.notifyKGBBaru ?? true,
      },
    });
  }

  return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
}
