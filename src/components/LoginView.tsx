import React, { useState } from 'react';
import { GTKData } from '../types';
import { DAPO1_BASE64 } from '../assets/dapo1Base64';
import { 
  LogIn, 
  User, 
  AlertCircle, 
  ArrowRight, 
  Building2 
} from 'lucide-react';

interface LoginViewProps {
  gtkList: GTKData[];
  onLogin: (gtk: GTKData) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ gtkList, onLogin }) => {
  const [nipInput, setNipInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanNip = (str: string) => str.replace(/[\s.-]/g, '').trim();

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const inputCleaned = cleanNip(nipInput);
    if (!inputCleaned) {
      setErrorMsg('Silakan masukkan NIP GTK Anda terlebih dahulu.');
      return;
    }

    setIsLoading(true);

    let candidateList = gtkList;
    try {
      const res = await fetch('/api/gtk?force=true');
      if (res.ok) {
        const json = await res.json();
        if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          candidateList = json.data;
        }
      }
    } catch {}

    // Find matching GTK by NIP (or fallback by NUPTK / ID)
    const matched = candidateList.find((g) => {
      const gNip = cleanNip(g.nip || '');
      const gNuptk = cleanNip(g.nuptk || '');
      return (
        (gNip && gNip === inputCleaned) ||
        (gNuptk && gNuptk === inputCleaned) ||
        g.id?.toLowerCase() === nipInput.trim().toLowerCase()
      );
    });

    setIsLoading(false);
    if (matched) {
      onLogin(matched);
    } else {
      setErrorMsg(
        `NIP "${nipInput.trim()}" tidak ditemukan dalam database GTK. Pastikan NIP yang Anda masukkan sudah benar.`
      );
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 antialiased overflow-hidden bg-slate-950">
      {/* Background Image: Fit/Fill whole viewport completely without cropping */}
      <img
        src="/bg.png"
        alt="Background Form Login SMKN 1 Palopo"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
      />
      {/* Subtle translucent veil so text and login card contrast perfectly while preserving the full image */}
      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] pointer-events-none" />

      {/* Decorative Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Card Header & Brand with Glassmorphism */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-950/40 border border-white/50 overflow-hidden transition-all duration-300">
          {/* Top Brand Banner */}
          <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5 opacity-50 backdrop-blur-3xs pointer-events-none" />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-1.5 shadow-xl mb-3 flex items-center justify-center transform hover:scale-105 transition-transform duration-300 ring-4 ring-white/20">
              <img
                src={DAPO1_BASE64 || '/dapo-1.png'}
                alt="Logo SMKN 1 Palopo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl font-extrabold tracking-wide drop-shadow-xs">SMKN 1 PALOPO</h1>
            <p className="text-xs text-indigo-100 font-medium mt-0.5">Sistem Informasi Manajemen Sekolah</p>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8 space-y-5">
            <div className="text-center">
              <h2 className="text-base font-bold text-slate-800">
                Masuk Menggunakan NIP
              </h2>
            </div>

            {/* Error Notification */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMsg}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    aria-label="NIP GTK"
                    value={nipInput}
                    onChange={(e) => {
                      setNipInput(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Masukkan 18 digit NIP (Contoh: 197205121998021001)"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-300 font-semibold text-slate-800 placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
                {nipInput && (
                  <div className="text-right mt-1.5">
                    <button
                      type="button"
                      onClick={() => setNipInput('')}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold text-[10px] cursor-pointer"
                    >
                      Bersihkan
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Aplikasi</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer school info */}
            <div className="text-center pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Building2 className="w-3 h-3" /> SMKN 1 Palopo • Sulawesi Selatan
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
