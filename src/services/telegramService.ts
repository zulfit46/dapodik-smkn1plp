import { MutasiMasukItem, MutasiKeluarItem, TelegramConfig, RiwayatPangkat, RiwayatKGB } from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';

const STORAGE_KEY = 'dapodik_telegram_config';

// Deteksi otomatis token & chat ID dari Environment Variables (Vercel / Vite build)
const ENV_BOT_TOKEN = (
  ((import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN as string) ||
  (typeof process !== 'undefined' ? (process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN) : '') ||
  ''
).trim();

const ENV_CHAT_ID = (
  ((import.meta as any).env?.VITE_TELEGRAM_CHAT_ID as string) ||
  (typeof process !== 'undefined' ? (process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID) : '') ||
  ''
).trim();

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: ENV_BOT_TOKEN,
  chatId: ENV_CHAT_ID,
  enabled: Boolean(ENV_BOT_TOKEN && ENV_CHAT_ID),
  notifyMutasiMasuk: true,
  notifyMutasiKeluar: true,
  notifyPangkatBaru: true,
  notifyKGBBaru: true,
};

/**
 * Escape HTML special characters for Telegram HTML parse_mode
 */
export function escapeTelegramHtml(text?: string | number | null): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Get current Telegram configuration from localStorage or server/env
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  const localConfig: TelegramConfig = safeGetItem<TelegramConfig>(STORAGE_KEY, DEFAULT_TELEGRAM_CONFIG);

  // Try fetching from server (Express atau Vercel Serverless /api/telegram/config)
  try {
    const res = await fetch('/api/telegram/config', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const serverConfig = await res.json();
      const resolvedToken = localConfig.botToken || serverConfig.botToken || ENV_BOT_TOKEN || '';
      const resolvedChatId = localConfig.chatId || serverConfig.chatId || ENV_CHAT_ID || '';
      const merged: TelegramConfig = {
        botToken: resolvedToken,
        chatId: resolvedChatId,
        enabled: localConfig.enabled ?? serverConfig.enabled ?? Boolean(resolvedToken && resolvedChatId),
        notifyMutasiMasuk: localConfig.notifyMutasiMasuk ?? serverConfig.notifyMutasiMasuk ?? true,
        notifyMutasiKeluar: localConfig.notifyMutasiKeluar ?? serverConfig.notifyMutasiKeluar ?? true,
        notifyPangkatBaru: localConfig.notifyPangkatBaru ?? serverConfig.notifyPangkatBaru ?? true,
        notifyKGBBaru: localConfig.notifyKGBBaru ?? serverConfig.notifyKGBBaru ?? true,
      };
      safeSetItem(STORAGE_KEY, merged);
      return merged;
    }
  } catch {
    // Ignore server error and return local config
  }

  const token = localConfig.botToken || ENV_BOT_TOKEN || '';
  const chat = localConfig.chatId || ENV_CHAT_ID || '';

  return {
    ...DEFAULT_TELEGRAM_CONFIG,
    ...localConfig,
    botToken: token,
    chatId: chat,
    enabled: localConfig.enabled ?? Boolean(token && chat),
    notifyPangkatBaru: localConfig.notifyPangkatBaru ?? true,
    notifyKGBBaru: localConfig.notifyKGBBaru ?? true,
  };
}

/**
 * Save Telegram configuration to localStorage and server
 */
export async function saveTelegramConfig(config: TelegramConfig): Promise<{ success: boolean; message?: string }> {
  safeSetItem(STORAGE_KEY, config);

  try {
    const res = await fetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(5000),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return { success: true, message: 'Pengaturan Telegram berhasil disimpan di server & browser' };
    }
  } catch (err) {
    console.warn('Simpan konfigurasi ke server gagal, tersimpan lokal:', err);
  }

  return { success: true, message: 'Pengaturan Telegram tersimpan di browser (localStorage)' };
}

/**
 * Direct Telegram Bot API send function (CORS-safe simple request via form-urlencoded)
 * Catatan penting: Telegram API mengembalikan HTTP 501 jika browser mengirim OPTIONS preflight dengan Content-Type: application/json.
 * Dengan application/x-www-form-urlencoded, browser mengirim Simple CORS Request tanpa OPTIONS preflight!
 */
async function sendDirectToTelegram(botToken: string, chatId: string, htmlMessage: string): Promise<{ ok: boolean; description?: string }> {
  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();
  if (!cleanToken || !cleanChatId) {
    throw new Error('Bot Token dan Chat ID wajib diisi');
  }

  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  const params = new URLSearchParams();
  params.append('chat_id', cleanChatId);
  params.append('text', htmlMessage);
  params.append('parse_mode', 'HTML');
  params.append('disable_web_page_preview', 'false');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(12000),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.description || `HTTP ${res.status}: Gagal mengirim pesan ke Telegram API`);
  }

  return data;
}

/**
 * Optional fallback: Kirim lewat Google Apps Script Web App jika server proxy & direct API terblokir ISP
 */
async function sendViaGoogleAppsScript(webAppUrl: string, botToken: string, chatId: string, htmlMessage: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sendTelegram',
        botToken: botToken.trim(),
        chatId: chatId.trim(),
        message: htmlMessage,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.status === 'success' || data.ok)) {
        return { success: true, message: 'Pesan berhasil terkirim via Google Apps Script relay' };
      }
    }
  } catch (gasErr) {
    console.warn('[Telegram] Google Apps Script relay failed:', gasErr);
  }
  throw new Error('Gagal mengirim via Google Apps Script relay');
}

/**
 * Unified sender:
 * 1. Coba server proxy (/api/telegram/send - Express atau Vercel Serverless Function)
 * 2. Fallback direct Telegram API dengan CORS-safe form-urlencoded
 * 3. Fallback Google Apps Script jika tersedia
 */
export async function sendTelegramMessage(
  message: string,
  customConfig?: Partial<TelegramConfig>,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const currentConfig = customConfig?.botToken ? { ...DEFAULT_TELEGRAM_CONFIG, ...customConfig } : await getTelegramConfig();
  const botToken = (customConfig?.botToken || currentConfig.botToken || ENV_BOT_TOKEN || '').trim();
  const chatId = (customConfig?.chatId || currentConfig.chatId || ENV_CHAT_ID || '').trim();

  if (!botToken || !chatId) {
    return {
      success: false,
      message: 'Bot Token atau Chat ID belum dikonfigurasi. Silakan buka menu Pengaturan Telegram untuk mengisinya.',
    };
  }

  // 1. Coba Server Proxy endpoint (/api/telegram/send - berfungsi di Express lokal & Vercel Serverless)
  try {
    const res = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken,
        chatId,
        message,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.status === 'success') {
        return { success: true, message: 'Pesan berhasil terkirim ke Telegram' };
      }
      throw new Error(data.message || 'Gagal mengirim melalui server proxy');
    }
  } catch (serverErr: any) {
    console.warn('[Telegram] Proxy server unavailable or failed, trying direct Telegram API:', serverErr);
  }

  // 2. Direct Telegram API fallback (CORS simple request)
  try {
    await sendDirectToTelegram(botToken, chatId, message);
    return { success: true, message: 'Pesan berhasil terkirim langsung ke Telegram' };
  } catch (directErr: any) {
    console.warn('[Telegram] Direct send failed:', directErr);

    // 3. Fallback ke Google Apps Script Web App jika direct API diblokir ISP lokal
    if (webAppUrl) {
      try {
        return await sendViaGoogleAppsScript(webAppUrl, botToken, chatId, message);
      } catch (gasErr: any) {
        console.warn('[Telegram] Fallback to Google Apps Script also failed:', gasErr);
      }
    }

    return {
      success: false,
      message: directErr?.message || 'Gagal terhubung ke Telegram API. Periksa Bot Token, Chat ID, atau koneksi internet Anda.',
    };
  }
}

/**
 * Format & Send Test Message
 */
export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; message: string }> {
  const now = new Date();
  const waktuStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ` pukul ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA/WIB`;

  const testMessage = `🤖 <b>UJI COBA NOTIFIKASI TELEGRAM</b>
━━━━━━━━━━━━━━━━━━━━
✅ <b>Status:</b> Koneksi Berhasil Terhubung!
🏫 <b>Aplikasi:</b> Sistem Informasi Dapodik
⏰ <b>Waktu:</b> ${escapeTelegramHtml(waktuStr)}
━━━━━━━━━━━━━━━━━━━━
<i>Bot Telegram Anda sekarang siap menerima notifikasi mutasi masuk dan keluar secara otomatis.</i>`;

  return sendTelegramMessage(testMessage, { botToken, chatId, enabled: true });
}

/**
 * Format & Send Notification for Mutasi Masuk
 */
export async function notifyMutasiMasuk(
  item: Partial<MutasiMasukItem>,
  config?: TelegramConfig,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const conf = config || await getTelegramConfig();
  if (!conf.enabled || !conf.notifyMutasiMasuk) {
    return { success: false, message: 'Notifikasi Mutasi Masuk tidak diaktifkan' };
  }

  const wilayah = [item.kecamatanNama, item.kabKotaNama, item.provinsiNama]
    .filter(Boolean)
    .join(', ') || '-';

  const tgl = item.tglMasuk || item.tanggalPengajuan || new Date().toLocaleDateString('id-ID');
  const now = new Date();
  const waktuStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const message = `📥 <b>NOTIFIKASI MUTASI MASUK BARU</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama Siswa:</b> ${escapeTelegramHtml(item.nama || '-')}
🆔 <b>NISN:</b> <code>${escapeTelegramHtml(item.nisn || '-')}</code>
🏫 <b>Sekolah Asal:</b> ${escapeTelegramHtml(item.sekolahAsal || '-')}
📍 <b>Wilayah Asal:</b> ${escapeTelegramHtml(wilayah)}
🎯 <b>Rombel Tujuan:</b> <b>${escapeTelegramHtml(item.rombelTujuan || '-')}</b>
📅 <b>Tanggal Masuk:</b> ${escapeTelegramHtml(tgl)}
📌 <b>Status:</b> <b>${escapeTelegramHtml(item.status || 'Pending')}</b>
📝 <b>Keterangan:</b> ${escapeTelegramHtml(item.keterangan || '-')}
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Waktu Input: ${escapeTelegramHtml(waktuStr)}</i>
🏛️ <i>Sistem Informasi Data Siswa Dapodik</i>`;

  return sendTelegramMessage(message, conf, webAppUrl);
}

/**
 * Format & Send Notification for Riwayat Kenaikan Pangkat Baru
 */
export async function notifyPangkatBaru(
  item: Partial<RiwayatPangkat>,
  config?: TelegramConfig,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const conf = config || await getTelegramConfig();
  if (!conf.enabled || !conf.notifyPangkatBaru) {
    return { success: false, message: 'Notifikasi Kenaikan Pangkat tidak diaktifkan' };
  }

  const now = new Date();
  const waktuStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const message = `🎖️ <b>NOTIFIKASI RIWAYAT KENAIKAN PANGKAT BARU</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama GTK:</b> ${escapeTelegramHtml(item.nama || '-')}
🆔 <b>NIP:</b> <code>${escapeTelegramHtml(item.nip || '-')}</code>
📊 <b>Golongan/Pangkat:</b> <b>${escapeTelegramHtml(item.gol || '-')}</b>
📄 <b>No. SK Pangkat:</b> ${escapeTelegramHtml(item.noSk || '-')}
📅 <b>Tanggal SK:</b> ${escapeTelegramHtml(item.tglSk || '-')}
🗓️ <b>TMT Pangkat:</b> <b>${escapeTelegramHtml(item.tmt || '-')}</b>
⏳ <b>Masa Kerja:</b> ${escapeTelegramHtml(item.masaKerjaThn ?? 0)} Tahun ${escapeTelegramHtml(item.masaKerjaBln ?? 0)} Bulan
📌 <b>Status:</b> <b>${escapeTelegramHtml(item.status || 'Proses')}</b>
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Waktu Input: ${escapeTelegramHtml(waktuStr)}</i>
🏛️ <i>Sistem Informasi Data Siswa Dapodik</i>`;

  return sendTelegramMessage(message, conf, webAppUrl);
}

/**
 * Format & Send Notification for Riwayat KGB Baru
 */
export async function notifyKGBBaru(
  item: Partial<RiwayatKGB>,
  config?: TelegramConfig,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const conf = config || await getTelegramConfig();
  if (!conf.enabled || !conf.notifyKGBBaru) {
    return { success: false, message: 'Notifikasi KGB tidak diaktifkan' };
  }

  const now = new Date();
  const waktuStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const gajiFormatted = item.gajiPokok
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(item.gajiPokok)
    : '-';

  const message = `💰 <b>NOTIFIKASI RIWAYAT KGB BARU</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama GTK:</b> ${escapeTelegramHtml(item.nama || '-')}
🆔 <b>NIP:</b> <code>${escapeTelegramHtml(item.nip || '-')}</code>
📊 <b>Golongan:</b> <b>${escapeTelegramHtml(item.gol || '-')}</b>
📄 <b>No. SK KGB:</b> ${escapeTelegramHtml(item.noSk || '-')}
📅 <b>Tanggal SK:</b> ${escapeTelegramHtml(item.tglSk || '-')}
🗓️ <b>TMT KGB:</b> <b>${escapeTelegramHtml(item.tmt || '-')}</b>
⏳ <b>Masa Kerja:</b> ${escapeTelegramHtml(item.masaKerjaThn ?? 0)} Tahun ${escapeTelegramHtml(item.masaKerjaBln ?? 0)} Bulan
💵 <b>Gaji Pokok Baru:</b> <b>${escapeTelegramHtml(gajiFormatted)}</b>
📌 <b>Status:</b> <b>${escapeTelegramHtml(item.status || 'Proses')}</b>
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Waktu Input: ${escapeTelegramHtml(waktuStr)}</i>
🏛️ <i>Sistem Informasi Data Siswa Dapodik</i>`;

  return sendTelegramMessage(message, conf, webAppUrl);
}

/**
 * Format & Send Notification for Mutasi Keluar
 */
export async function notifyMutasiKeluar(
  item: Partial<MutasiKeluarItem>,
  config?: TelegramConfig,
  webAppUrl?: string
): Promise<{ success: boolean; message: string }> {
  const conf = config || await getTelegramConfig();
  if (!conf.enabled || !conf.notifyMutasiKeluar) {
    return { success: false, message: 'Notifikasi Mutasi Keluar tidak diaktifkan' };
  }

  const tgl = item.tglMutasi || new Date().toLocaleDateString('id-ID');
  const now = new Date();
  const waktuStr = `${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  let berkasSection = '';
  if (item.uploadBerkas && item.uploadBerkas.startsWith('http')) {
    berkasSection = `\n📁 <b>Berkas:</b> <a href="${escapeTelegramHtml(item.uploadBerkas)}">Lihat Berkas Google Drive</a>`;
  } else if (item.uploadBerkas) {
    berkasSection = `\n📁 <b>Berkas:</b> ${escapeTelegramHtml(item.uploadBerkas)}`;
  }

  const message = `📤 <b>NOTIFIKASI MUTASI KELUAR BARU</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Nama Siswa:</b> ${escapeTelegramHtml(item.nama || '-')}
🆔 <b>NISN:</b> <code>${escapeTelegramHtml(item.nisn || '-')}</code> | <b>NIPD:</b> <code>${escapeTelegramHtml(item.nipd || '-')}</code>
🏛️ <b>Rombel Asal:</b> <b>${escapeTelegramHtml(item.rombel || '-')}</b>
📌 <b>Jenis Mutasi:</b> <b>${escapeTelegramHtml(item.ketMutasi || 'Mutasi')}</b>
🏫 <b>Pindah Ke:</b> ${escapeTelegramHtml(item.pindahKe || '-')}
📅 <b>Tanggal Mutasi:</b> ${escapeTelegramHtml(tgl)}
💬 <b>Alasan:</b> ${escapeTelegramHtml(item.alasanMutasi || '-')}
📋 <b>Status:</b> ${escapeTelegramHtml(item.status || 'Selesai')}${berkasSection}
━━━━━━━━━━━━━━━━━━━━
⏰ <i>Waktu Input: ${escapeTelegramHtml(waktuStr)}</i>
🏛️ <i>Sistem Informasi Data Siswa Dapodik</i>`;

  return sendTelegramMessage(message, conf, webAppUrl);
}
