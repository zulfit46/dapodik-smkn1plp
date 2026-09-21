import { Student } from '../types';
import { formatToDDMMYYYY } from '../utils/dateUtils';
import { safeGetItem, safeSetItem } from '../utils/storage';

export interface DownloadColumnDefinition {
  key: string;
  headerName: string;
  label: string;
  description?: string;
  category: 'Identitas Utama' | 'Kelahiran & Agama' | 'Alamat & Kontak' | 'Data Orang Tua' | 'Akademik & Lainnya';
  defaultAllowedForGTK: boolean;
  excelWidth: number;
  getValue: (student: Student, index: number) => string | number;
}

export const ALL_DOWNLOAD_COLUMNS: DownloadColumnDefinition[] = [
  // 1. Identitas Utama
  {
    key: 'nama',
    headerName: 'Nama',
    label: 'Nama Lengkap',
    description: 'Nama lengkap peserta didik sesuai ijazah/akta',
    category: 'Identitas Utama',
    defaultAllowedForGTK: true,
    excelWidth: 32,
    getValue: (s) => s.nama || ''
  },
  {
    key: 'kelas',
    headerName: 'Kelas',
    label: 'Rombongan Belajar (Kelas)',
    description: 'Rombel atau tingkat kelas peserta didik',
    category: 'Identitas Utama',
    defaultAllowedForGTK: true,
    excelWidth: 14,
    getValue: (s) => s.kelas || ''
  },
  {
    key: 'nipd',
    headerName: 'NIPD',
    label: 'NIPD (Nomor Induk Siswa)',
    description: 'Nomor Induk Peserta Didik dari sekolah',
    category: 'Identitas Utama',
    defaultAllowedForGTK: true,
    excelWidth: 14,
    getValue: (s) => s.nipd || ''
  },
  {
    key: 'nisn',
    headerName: 'NISN',
    label: 'NISN Nasional',
    description: 'Nomor Induk Siswa Nasional dari Pusdatin',
    category: 'Identitas Utama',
    defaultAllowedForGTK: true,
    excelWidth: 16,
    getValue: (s) => s.nisn || ''
  },
  {
    key: 'jk',
    headerName: 'JK',
    label: 'Jenis Kelamin (L/P)',
    description: 'Jenis Kelamin siswa (L = Laki-laki, P = Perempuan)',
    category: 'Identitas Utama',
    defaultAllowedForGTK: true,
    excelWidth: 8,
    getValue: (s) => s.jk || ''
  },

  // 2. Kelahiran & Agama
  {
    key: 'tempatLahir',
    headerName: 'Tempat Lahir',
    label: 'Tempat Lahir',
    description: 'Kota / Kabupaten tempat lahir',
    category: 'Kelahiran & Agama',
    defaultAllowedForGTK: false,
    excelWidth: 18,
    getValue: (s) => s.tempatLahir || ''
  },
  {
    key: 'tanggalLahir',
    headerName: 'Tanggal Lahir',
    label: 'Tanggal Lahir',
    description: 'Format tanggal lahir (DD/MM/YYYY)',
    category: 'Kelahiran & Agama',
    defaultAllowedForGTK: false,
    excelWidth: 15,
    getValue: (s) => (s.tanggalLahir ? formatToDDMMYYYY(s.tanggalLahir) : '')
  },
  {
    key: 'agama',
    headerName: 'Agama',
    label: 'Agama',
    description: 'Agama peserta didik',
    category: 'Kelahiran & Agama',
    defaultAllowedForGTK: false,
    excelWidth: 14,
    getValue: (s) => s.agama || ''
  },

  // 3. Alamat & Kontak
  {
    key: 'alamat',
    headerName: 'Alamat',
    label: 'Alamat Tempat Tinggal',
    description: 'Alamat domisili lengkap peserta didik',
    category: 'Alamat & Kontak',
    defaultAllowedForGTK: false,
    excelWidth: 36,
    getValue: (s) => s.alamat || ''
  },
  {
    key: 'noHp',
    headerName: 'No HP',
    label: 'Nomor HP / WhatsApp',
    description: 'Kontak nomor seluler siswa/orang tua',
    category: 'Alamat & Kontak',
    defaultAllowedForGTK: false,
    excelWidth: 16,
    getValue: (s) => s.noHp || ''
  },
  {
    key: 'email',
    headerName: 'Email',
    label: 'Alamat Email',
    description: 'Alamat surat elektronik siswa',
    category: 'Alamat & Kontak',
    defaultAllowedForGTK: false,
    excelWidth: 25,
    getValue: (s) => s.email || ''
  },

  // 4. Data Orang Tua
  {
    key: 'ayah',
    headerName: 'Nama Ayah',
    label: 'Nama Ayah Kandung',
    description: 'Nama lengkap ayah kandung/wali',
    category: 'Data Orang Tua',
    defaultAllowedForGTK: false,
    excelWidth: 22,
    getValue: (s) => s.ayah || (s as any)['nama_ayah'] || (s as any)['namaayah'] || (s as any)['Nama Ayah'] || ''
  },
  {
    key: 'pekerjaanAyah',
    headerName: 'Pekerjaan Ayah',
    label: 'Pekerjaan Ayah',
    description: 'Mata pencaharian / profesi pekerjaan ayah',
    category: 'Data Orang Tua',
    defaultAllowedForGTK: false,
    excelWidth: 20,
    getValue: (s) => s.pekerjaanAyah || (s as any)['kerja_ayah'] || (s as any)['kerjaayah'] || (s as any)['pekerjaan_ayah'] || (s as any)['Pekerjaan Ayah'] || ''
  },
  {
    key: 'ibu',
    headerName: 'Nama Ibu',
    label: 'Nama Ibu Kandung',
    description: 'Nama lengkap ibu kandung',
    category: 'Data Orang Tua',
    defaultAllowedForGTK: false,
    excelWidth: 22,
    getValue: (s) => s.ibu || (s as any)['nama_ibu'] || (s as any)['namaibu'] || (s as any)['Nama Ibu'] || ''
  },
  {
    key: 'pekerjaanIbu',
    headerName: 'Pekerjaan Ibu',
    label: 'Pekerjaan Ibu',
    description: 'Mata pencaharian / profesi pekerjaan ibu',
    category: 'Data Orang Tua',
    defaultAllowedForGTK: false,
    excelWidth: 20,
    getValue: (s) => s.pekerjaanIbu || (s as any)['kerja_ibu'] || (s as any)['kerjaibu'] || (s as any)['pekerjaan_ibu'] || (s as any)['Pekerjaan Ibu'] || ''
  },

  // 5. Akademik & Lainnya
  {
    key: 'sekolahAsal',
    headerName: 'Sekolah Asal',
    label: 'Sekolah Asal (SMP/MTs)',
    description: 'Nama sekolah jenjang sebelumnya',
    category: 'Akademik & Lainnya',
    defaultAllowedForGTK: false,
    excelWidth: 26,
    getValue: (s) => s.sekolahAsal || ''
  },
  {
    key: 'status',
    headerName: 'Status',
    label: 'Status Siswa (Aktif/Tidak)',
    description: 'Status keaktifan peserta didik di Dapodik',
    category: 'Akademik & Lainnya',
    defaultAllowedForGTK: false,
    excelWidth: 14,
    getValue: (s) => s.status || ''
  },
  {
    key: 'statusRegistrasi',
    headerName: 'Status Registrasi',
    label: 'Status Registrasi',
    description: 'Siswa Baru, Pindahan, Lulus, atau Keluar',
    category: 'Akademik & Lainnya',
    defaultAllowedForGTK: false,
    excelWidth: 18,
    getValue: (s) => s.statusRegistrasi || ''
  },
  {
    key: 'ket',
    headerName: 'Keterangan',
    label: 'Keterangan Tambahan',
    description: 'Catatan tambahan peserta didik',
    category: 'Akademik & Lainnya',
    defaultAllowedForGTK: false,
    excelWidth: 20,
    getValue: (s) => s.ket || ''
  },
  {
    key: 'tinggiBadan',
    headerName: 'Tinggi Badan (cm)',
    label: 'Tinggi Badan (cm)',
    description: 'Data periodik tinggi badan',
    category: 'Akademik & Lainnya',
    defaultAllowedForGTK: false,
    excelWidth: 16,
    getValue: (s) => (s.tinggiBadan ? `${s.tinggiBadan} cm` : '')
  },
  {
    key: 'beratBadan',
    headerName: 'Berat Badan (kg)',
    label: 'Berat Badan (kg)',
    description: 'Data periodik berat badan',
    category: 'Akademik & Lainnya',
    defaultAllowedForGTK: false,
    excelWidth: 16,
    getValue: (s) => (s.beratBadan ? `${s.beratBadan} kg` : '')
  }
];

export const STORAGE_KEY_GTK_DOWNLOAD_HEADERS = 'dapodik_gtk_download_headers';

// Default safe keys for GTK user
export const DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS: string[] = ALL_DOWNLOAD_COLUMNS
  .filter((col) => col.defaultAllowedForGTK)
  .map((col) => col.key);

/**
 * Retrieves the list of allowed download header keys for GTK (User).
 * If not set by Admin, falls back to DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS.
 */
export function getGTKAllowedDownloadHeaders(): string[] {
  const saved = safeGetItem<string[] | string>(STORAGE_KEY_GTK_DOWNLOAD_HEADERS, null);
  if (saved) {
    try {
      const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure only valid keys exist
        const validKeySet = new Set(ALL_DOWNLOAD_COLUMNS.map((c) => c.key));
        const filtered = parsed.filter((k) => typeof k === 'string' && validKeySet.has(k));
        if (filtered.length > 0) {
          return filtered;
        }
      }
    } catch {
      // Ignore parse error
    }
  }
  return [...DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS];
}

/**
 * Saves the list of allowed download header keys for GTK (User).
 */
export function saveGTKAllowedDownloadHeaders(allowedKeys: string[]): boolean {
  return safeSetItem(STORAGE_KEY_GTK_DOWNLOAD_HEADERS, allowedKeys);
}

/**
 * Resets download header permissions back to standard default.
 */
export function resetGTKAllowedDownloadHeaders(): boolean {
  return saveGTKAllowedDownloadHeaders(DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS);
}

/**
 * Fetches allowed download headers from the server, syncing with local storage.
 * If local storage has custom admin configuration and server has defaults,
 * it auto-promotes the local custom configuration to the server.
 */
export async function fetchGTKAllowedDownloadHeadersFromServer(): Promise<string[]> {
  const localHeaders = getGTKAllowedDownloadHeaders();
  const validKeySet = new Set(ALL_DOWNLOAD_COLUMNS.map((c) => c.key));

  try {
    const res = await fetch('/api/gtk/download-headers', { 
      signal: AbortSignal.timeout(5000),
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.headers) && data.headers.length > 0) {
        const serverHeaders = data.headers.filter((k: any) => typeof k === 'string' && validKeySet.has(k));

        const isDefaultList = (list: string[]) => 
          list.length === DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS.length &&
          list.every((k) => DEFAULT_GTK_ALLOWED_DOWNLOAD_HEADERS.includes(k));

        const serverIsDefault = isDefaultList(serverHeaders);
        const localIsCustom = !isDefaultList(localHeaders);

        // If server still has default 5 headers, but local already has Admin's custom headers, push local to server!
        if (serverIsDefault && localIsCustom) {
          syncGTKAllowedDownloadHeadersToServer(localHeaders).catch(() => {});
          return localHeaders;
        }

        if (serverHeaders.length > 0) {
          saveGTKAllowedDownloadHeaders(serverHeaders);
          return serverHeaders;
        }
      }
    }
  } catch (err) {
    console.warn('[DownloadHeaders] Failed to fetch allowed headers from server, falling back to local:', err);
  }

  return localHeaders;
}

/**
 * Synchronizes allowed download headers to the server backend and local storage.
 */
export async function syncGTKAllowedDownloadHeadersToServer(allowedKeys: string[]): Promise<boolean> {
  // 1. Save to local storage immediately
  saveGTKAllowedDownloadHeaders(allowedKeys);

  // 2. Push to backend server
  try {
    const res = await fetch('/api/gtk/download-headers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ headers: allowedKeys })
    });
    return res.ok;
  } catch (err) {
    console.warn('[DownloadHeaders] Failed to sync allowed headers to server:', err);
    return false;
  }
}
