import React, { useState, useEffect } from 'react';
import { TelegramConfig } from '../types';
import { 
  getTelegramConfig, 
  saveTelegramConfig, 
  testTelegramConnection 
} from '../services/telegramService';
import { 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  EyeOff, 
  Loader2, 
  Bell, 
  Bot, 
  MessageSquare, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';

interface TelegramConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: TelegramConfig) => void;
}

export const TelegramConfigModal: React.FC<TelegramConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    enabled: false,
    notifyMutasiMasuk: true,
    notifyMutasiKeluar: true,
  });

  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getTelegramConfig().then((cfg) => {
        setConfig(cfg);
      });
      setTestResult(null);
      setSaveMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!config.botToken.trim() || !config.chatId.trim()) {
      setTestResult({
        success: false,
        message: 'Mohon isi Bot Token dan Chat ID terlebih dahulu sebelum melakukan tes.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testTelegramConnection(config.botToken, config.chatId);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Gagal mengirim pesan tes. Periksa koneksi internet dan kredensial bot.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await saveTelegramConfig(config);
      setSaveMessage(res.message || 'Pengaturan berhasil disimpan');
      if (onConfigSaved) {
        onConfigSaved(config);
      }
      setTimeout(() => {
        setSaveMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setSaveMessage('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <Send className="w-5 h-5 -translate-x-0.5 translate-y-0.5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide">Pengaturan Notifikasi Telegram</h2>
              <p className="text-xs text-sky-100">Kirim otomatis info mutasi masuk & keluar ke grup/chat Telegram</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status Toggle Switch */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 text-sm">Status Notifikasi Telegram</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${config.enabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'}`}>
                    {config.enabled ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {config.enabled ? 'Notifikasi otomatis akan dikirim ke Telegram setiap kali ada mutasi baru' : 'Notifikasi Telegram dinonaktifkan sementara'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Bot Token Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-sky-600" />
                Telegram Bot Token <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] text-slate-600 font-normal lowercase">didapat dari @BotFather</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={config.botToken}
                onChange={(e) => setConfig({ ...config, botToken: e.target.value.trim() })}
                placeholder="Contoh: 7123456789:AAHq_m7e..."
                className="w-full pl-3 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 p-1"
                title={showToken ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Chat ID Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-sky-600" />
                Telegram Chat ID / ID Grup <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] text-slate-600 font-normal lowercase">ID Grup biasanya diawali minus (-)</span>
            </label>
            <input
              type="text"
              value={config.chatId}
              onChange={(e) => setConfig({ ...config, chatId: e.target.value.trim() })}
              placeholder="Contoh: -1001987654321 atau 98765432"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono"
            />
          </div>

          {/* Pilihan Jenis Notifikasi */}
          <div className="space-y-2 pt-1 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Kirim Notifikasi Untuk:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="checkbox"
                  checked={config.notifyMutasiMasuk}
                  onChange={(e) => setConfig({ ...config, notifyMutasiMasuk: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">📥 Mutasi Masuk</div>
                  <div className="text-slate-600 text-[11px]">Siswa baru masuk/pindahan</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                <input
                  type="checkbox"
                  checked={config.notifyMutasiKeluar}
                  onChange={(e) => setConfig({ ...config, notifyMutasiKeluar: e.target.checked })}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">📤 Mutasi Keluar</div>
                  <div className="text-slate-600 text-[11px]">Siswa pindah / keluar</div>
                </div>
              </label>
            </div>
          </div>

          {/* Panduan Akordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/70">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <HelpCircle className="w-4 h-4 text-sky-600" />
                <span>Panduan Cara Membuat Bot & Mengetahui Chat ID</span>
              </div>
              {showGuide ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
            </button>

            {showGuide && (
              <div className="px-4 pb-4 pt-1 text-xs text-slate-600 space-y-3 border-t border-slate-200 bg-white">
                <div className="space-y-1">
                  <strong className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold">1</span>
                    Buat Bot Telegram:
                  </strong>
                  <p className="pl-5 leading-relaxed">
                    Buka Telegram, cari <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-700 font-mono">@BotFather</code>, lalu ketik perintah <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sky-700 font-mono">/newbot</code>. Ikuti instruksinya hingga Anda mendapatkan <b>Bot Token</b>.
                  </p>
                </div>

                <div className="space-y-1">
                  <strong className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold">2</span>
                    Jika ingin dikirim ke Grup Telegram:
                  </strong>
                  <p className="pl-5 leading-relaxed">
                    Buat atau buka grup Telegram sekolah, lalu <b>tambahkan bot tersebut ke dalam grup</b> dan jadikan sebagai <b>Admin Grup</b> (agar bot memiliki izin mengirim pesan).
                  </p>
                </div>

                <div className="space-y-1">
                  <strong className="text-slate-800 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold">3</span>
                    Mendapatkan Chat ID:
                  </strong>
                  <ul className="pl-9 list-disc space-y-1">
                    <li>
                      <b>Untuk Grup:</b> Tambahkan bot pembantu seperti <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">@userinfobot</code> atau <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">@getmyid_bot</code> ke grup untuk melihat ID grup (biasanya diawali dengan <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">-100...</code>).
                    </li>
                    <li>
                      <b>Atau lewat Browser:</b> Kirim 1 pesan apa saja di grup tersebut, lalu buka URL berikut di browser:
                      <br />
                      <span className="text-[10px] font-mono text-slate-500 break-all select-all block mt-0.5 p-1 bg-slate-100 rounded">
                        https://api.telegram.org/bot&lt;TOKEN_ANDA&gt;/getUpdates
                      </span>
                      Cari nilai <code className="text-sky-700 font-mono font-bold">"id"</code> di dalam bagian <code className="text-slate-700 font-mono">"chat"</code>.
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Alert Hasil Uji Coba */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${testResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold">{testResult.success ? 'Uji Coba Berhasil!' : 'Uji Coba Gagal'}</div>
                <div className="text-[11px] mt-0.5 leading-relaxed">{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Alert Simpan Berhasil */}
          {saveMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveMessage}</span>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !config.botToken.trim() || !config.chatId.trim()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-xl border border-sky-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isTesting ? 'Mengirim Pesan...' : 'Uji Coba Kirim Pesan'}</span>
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
