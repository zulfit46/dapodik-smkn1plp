import React, { useState } from 'react';
import { 
  X, 
  User, 
  FileText, 
  MapPin, 
  CreditCard, 
  GraduationCap, 
  Calendar, 
  Phone, 
  Mail, 
  Building, 
  Award, 
  Shield, 
  Briefcase,
  Layers,
  HeartHandshake
} from 'lucide-react';
import { GTKData } from '../types';

interface GTKDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  gtk: GTKData | null;
}

export const GTKDetailModal: React.FC<GTKDetailModalProps> = ({
  isOpen,
  onClose,
  gtk
}) => {
  const [activeDetailTab, setActiveDetailTab] = useState<'pribadi' | 'sk' | 'alamat' | 'keuangan'>('pribadi');

  if (!isOpen || !gtk) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {gtk.nama || 'Detail GTK'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-emerald-100">
                <span>NIP: {gtk.nip || '-'}</span>
                <span>•</span>
                <span>NUPTK: {gtk.nuptk || '-'}</span>
                <span>•</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-medium">
                  {gtk.statusKepegawaian || 'Status Tidak Diketahui'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-5 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveDetailTab('pribadi')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeDetailTab === 'pribadi'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Pribadi & Kepegawaian</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDetailTab('sk')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeDetailTab === 'sk'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>SK, Pangkat & Pengangkatan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDetailTab('alamat')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeDetailTab === 'alamat'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Alamat & Kontak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDetailTab('keuangan')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeDetailTab === 'keuangan'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Kependudukan, Gaji & Bank</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4 bg-white">
          {activeDetailTab === 'pribadi' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <User className="w-3.5 h-3.5 text-emerald-600" /> Identitas Pribadi
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Nama Lengkap</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.nama || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Jenis Kelamin</span>
                    <span className="font-semibold text-slate-800">{gtk.jk === 'L' ? 'Laki-Laki (L)' : gtk.jk === 'P' ? 'Perempuan (P)' : gtk.jk || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Tempat, Tgl Lahir</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.tempatLahir || '-'}, {gtk.tanggalLahir || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Agama</span>
                    <span className="font-semibold text-slate-800">{gtk.agama || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Nama Ibu Kandung</span>
                    <span className="font-semibold text-slate-800">{gtk.namaIbuKandung || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Status Perkawinan</span>
                    <span className="font-semibold text-slate-800">{gtk.statusPerkawinan || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Kewarganegaraan</span>
                    <span className="font-semibold text-slate-800">{gtk.kewarganegaraan || 'Indonesia'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" /> Status & Penugasan
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Status Kepegawaian</span>
                    <span className="font-semibold text-emerald-700">{gtk.statusKepegawaian || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Jenis PTK</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.jenisPtk || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Tugas Tambahan</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.tugasTambahan || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">NUPTK</span>
                    <span className="font-semibold text-slate-800">{gtk.nuptk || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">NIP</span>
                    <span className="font-semibold text-slate-800">{gtk.nip || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Lisensi Kepala Sekolah</span>
                    <span className="font-semibold text-slate-800">{gtk.sudahLisensiKepalaSekolah || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">NUKS</span>
                    <span className="font-semibold text-slate-800">{gtk.nuks || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Data Pasangan jika ada */}
              <div className="md:col-span-2 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <HeartHandshake className="w-3.5 h-3.5 text-rose-500" /> Data Suami / Istri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Nama Suami/Istri</span>
                    <span className="font-semibold text-slate-800">{gtk.namaSuamiIstri || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">NIP Suami/Istri</span>
                    <span className="font-semibold text-slate-800">{gtk.nipSuamiIstri || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Pekerjaan Suami/Istri</span>
                    <span className="font-semibold text-slate-800">{gtk.pekerjaanSuamiIstri || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'sk' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Award className="w-3.5 h-3.5 text-emerald-600" /> Pangkat & Golongan
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Pangkat / Golongan</span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {gtk.pangkatGolongan || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">SK CPNS</span>
                    <span className="font-semibold text-slate-800">{gtk.skCpns || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Tanggal CPNS</span>
                    <span className="font-semibold text-slate-800">{gtk.tanggalCpns || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">TMT PNS</span>
                    <span className="font-semibold text-slate-800">{gtk.tmtPns || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Nomor Karpeg</span>
                    <span className="font-semibold text-slate-800">{gtk.karpeg || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Building className="w-3.5 h-3.5 text-emerald-600" /> Riwayat Pengangkatan
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">SK Pengangkatan</span>
                    <span className="font-semibold text-slate-800">{gtk.skPengangkatan || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">TMT Pengangkatan</span>
                    <span className="font-semibold text-slate-800">{gtk.tmtPengangkatan || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Lembaga Pengangkat</span>
                    <span className="font-semibold text-slate-800 text-right">{gtk.lembagaPengangkatan || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Karis / Karsu</span>
                    <span className="font-semibold text-slate-800">{gtk.karisKarsu || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Diklat Kepengawasan</span>
                    <span className="font-semibold text-slate-800">{gtk.pernahDiklatKepengawasan || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'alamat' && (
            <div className="space-y-4">
              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Alamat Domisili
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Alamat Jalan</span>
                    <span className="font-semibold text-slate-800">{gtk.alamatJalan || '-'}</span>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-slate-500 block text-[11px]">RT / RW</span>
                      <span className="font-semibold text-slate-800">{gtk.rt || '-'}/{gtk.rw || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Kode Pos</span>
                      <span className="font-semibold text-slate-800">{gtk.kodePos || '-'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Dusun</span>
                    <span className="font-semibold text-slate-800">{gtk.namaDusun || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Desa / Kelurahan</span>
                    <span className="font-semibold text-slate-800">{gtk.desaKelurahan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Kecamatan</span>
                    <span className="font-semibold text-slate-800">{gtk.kecamatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Koordinat (Lintang, Bujur)</span>
                    <span className="font-semibold text-slate-800 font-mono text-[11px]">{gtk.lintang || '-'}, {gtk.bujur || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> Kontak & Komunikasi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[11px]">No. Handphone</span>
                    <span className="font-semibold text-slate-800">{gtk.hp || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Telepon Rumah</span>
                    <span className="font-semibold text-slate-800">{gtk.telepon || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Email</span>
                    <span className="font-semibold text-slate-800">{gtk.email || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'keuangan' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Rekening Bank & Sumber Gaji
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Nama Bank</span>
                    <span className="font-semibold text-slate-800">{gtk.bank || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Nomor Rekening</span>
                    <span className="font-semibold text-slate-800 font-mono">{gtk.nomorRekeningBank || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Rekening Atas Nama</span>
                    <span className="font-semibold text-slate-800">{gtk.rekeningAtasNama || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Sumber Gaji</span>
                    <span className="font-semibold text-emerald-700">{gtk.sumberGaji || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" /> Dokumen Kependudukan & Pajak
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">NIK (No. KTP)</span>
                    <span className="font-semibold text-slate-800 font-mono">{gtk.nik || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Nomor Kartu Keluarga (KK)</span>
                    <span className="font-semibold text-slate-800 font-mono">{gtk.noKk || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">NPWP</span>
                    <span className="font-semibold text-slate-800 font-mono">{gtk.npwp || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Nama Wajib Pajak</span>
                    <span className="font-semibold text-slate-800">{gtk.namaWajibPajak || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
