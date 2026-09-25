import { MutasiMasukItem, MutasiKeluarItem, TelegramConfig } from '../types';
import { safeGetItem, safeSetItem } from '../utils/storage';

const STORAGE_KEY = 'dapodik_telegram_config';

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: '',
  chatId: '',
  enabled: false,
  notifyMutasiMasuk: true,
  notifyMutasiKeluar: true,
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
 * Get current Telegram configuration from localStorage or server
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  let localConfig: TelegramConfig = safeGetItem<TelegramConfig>(STORAGE_KEY, DEFAULT_TELEGRAM_CONFIG);

  // Also try fetching from server to get any server-configured defaults/env vars
  try {
    const res = await fetch('/api/telegram/config', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const serverConfig = await res.json();
      const merged: TelegramConfig = {
        botToken: localConfig.botToken || serverConfig.botToken || '',
        chatId: localConfig.chatId || serverConfig.chatId || '',
        enabled: localConfig.enabled ?? serverConfig.enabled ?? false,
        notifyMutasiMasuk: localConfig.notifyMutasiMasuk ?? serverConfig.notifyMutasiMasuk ?? true,
        notifyMutasiKeluar: localConfig.notifyMutasiKeluar ?? serverConfig.notifyMutasiKeluar ?? true,
      };
      safeSetItem(STORAGE_KEY, merged);
      return merged;
    }
  } catch {
    // Ignore server error and return local config
  }

  return localConfig;
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
    if (res.ok) {
      return { success: true, message: 'Pengaturan Telegram berhasil disimpan' };
    }
  } catch (err) {
    console.warn('Simpan konfigurasi ke server gagal, tersimpan lokal:', err);
  }

  return { success: true, message: 'Pengaturan Telegram tersimpan di browser' };
}

/**
 * Direct Telegram Bot API send function (used if server is unreachable)
 */
async function sendDirectToTelegram(botToken: string, chatId: string, htmlMessage: string): Promise<{ ok: boolean; description?: string }> {
  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();
  if (!cleanToken || !cleanChatId) {
    throw new Error('Bot Token dan Chat ID wajib diisi');
  }

  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: cleanChatId,
      text: htmlMessage,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
    signal: AbortSignal.timeout(10000),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.description || `HTTP ${res.status}: Gagal mengirim pesan ke Telegram`);
  }

  return data;
}

/**
 * Unified sender: uses server proxy first (to avoid CORS/network issues), falls back to direct API
 */
export async function sendTelegramMessage(
  message: string,
  customConfig?: Partial<TelegramConfig>
): Promise<{ success: boolean; message: string }> {
  const currentConfig = customConfig?.botToken ? { ...DEFAULT_TELEGRAM_CONFIG, ...customConfig } : await getTelegramConfig();
  const botToken = (customConfig?.botToken || currentConfig.botToken || '').trim();
  const chatId = (customConfig?.chatId || currentConfig.chatId || '').trim();

  if (!botToken || !chatId) {
    return { success: false, message: 'Bot Token atau Chat ID belum dikonfigurasi' };
  }

  // 1. Try server proxy endpoint
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

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return { success: true, message: 'Pesan berhasil terkirim ke Telegram' };
      }
      throw new Error(data.message || 'Gagal mengirim melalui server');
    }
  } catch (serverErr: any) {
    console.warn('[Telegram] Proxy server failed, trying direct Telegram API:', serverErr);
  }

  // 2. Direct fallback
  try {
    await sendDirectToTelegram(botToken, chatId, message);
    return { success: true, message: 'Pesan berhasil terkirim ke Telegram' };
  } catch (directErr: any) {
    return {
      success: false,
      message: directErr?.message || 'Gagal terhubung ke Telegram API. Periksa Token & Chat ID Anda.',
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
  config?: TelegramConfig
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

  return sendTelegramMessage(message, conf);
}

/**
 * Format & Send Notification for Mutasi Keluar
 */
export async function notifyMutasiKeluar(
  item: Partial<MutasiKeluarItem>,
  config?: TelegramConfig
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

  return sendTelegramMessage(message, conf);
}
