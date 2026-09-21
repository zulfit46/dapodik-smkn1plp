import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { INITIAL_STUDENTS, INITIAL_ATTENDANCE } from "./src/data/initialData.js";
import { INITIAL_WALI_KELAS_LIST, INITIAL_WALI_KELAS } from "./src/data/initialWaliKelas.js";
import { INITIAL_JURUSAN_LIST } from "./src/data/initialJurusan.js";
import { INITIAL_GTK_LIST } from "./src/data/initialGTK.js";
import { INITIAL_RIWAYAT_PANGKAT, INITIAL_RIWAYAT_KGB } from "./src/data/initialPangkatKGB.js";
import { Student, AttendanceRecord, AppConfig, WaliKelas, Jurusan, GTKData, RiwayatPangkat, RiwayatKGB, normalizeStudent } from "./src/types.js";

// In-memory data storage
let studentList: Student[] = INITIAL_STUDENTS.map(normalizeStudent);
let cachedSheetsData: Student[] | null = null;
let attendanceList: AttendanceRecord[] = [...INITIAL_ATTENDANCE];
let cachedWaliKelasList: WaliKelas[] = [...INITIAL_WALI_KELAS_LIST];
let cachedWaliKelasMap: Record<string, string> = { ...INITIAL_WALI_KELAS };
let cachedJurusanList: Jurusan[] = [...INITIAL_JURUSAN_LIST];
let cachedGTKList: GTKData[] = [...INITIAL_GTK_LIST];
let cachedPangkatList: RiwayatPangkat[] = [...INITIAL_RIWAYAT_PANGKAT];
let cachedKGBList: RiwayatKGB[] = [...INITIAL_RIWAYAT_KGB];

// Persistent Allowed Download Headers for GTK
const HEADERS_CACHE_FILE = path.join(process.cwd(), 'gtk_download_headers.json');
let cachedGtkDownloadHeaders: string[] = ['nama', 'kelas', 'nipd', 'nisn', 'jk', 'tempatLahir', 'tanggalLahir'];
try {
  if (fs.existsSync(HEADERS_CACHE_FILE)) {
    const raw = fs.readFileSync(HEADERS_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedGtkDownloadHeaders = parsed.map(String);
      console.log(`Loaded ${cachedGtkDownloadHeaders.length} download headers from gtk_download_headers.json`);
    }
  }
} catch (e) {
  console.warn('Failed to load gtk_download_headers.json:', e);
}

let appConfig: AppConfig = {
  spreadsheetId: '1t_i5_kMDb00AT2uL0Km49_37CHJB2RWUv3tZjVgLlAk',
  sheetName: 'data',
  webAppUrl: 'https://script.google.com/macros/s/AKfycbxwfqpqePmp5mtpzeJSTHpiz0PxyqSbOA3hWw1Zy8Iofvi1lMIWxYeMllDNlmP-8RI/exec',
  autoSync: false,
  lastSyncedAt: new Date().toISOString()
};

// Helper to communicate with Google Apps Script Web App
async function sendToGas(targetUrl: string, payload: any, timeoutMs = 45000): Promise<{ ok: boolean; status: number; body: string; json?: any }> {
  const jsonString = JSON.stringify(payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: jsonString,
      signal: controller.signal,
      redirect: "follow"
    });

    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {}

    return {
      ok: res.ok,
      status: res.status,
      body: text,
      json: parsed
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(`Timeout memanggil Google Apps Script (${timeoutMs}ms)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Helper to fetch from Google Sheets with GViz fast fetch + WebApp fallback
let fetchStudentsPromise: Promise<Student[] | null> | null = null;

async function fetchFromGoogleSheets(): Promise<Student[] | null> {
  if (fetchStudentsPromise) {
    return fetchStudentsPromise;
  }

  fetchStudentsPromise = (async () => {
    // 1. First try GViz endpoint (Fast read for rows)
    if (appConfig.spreadsheetId) {
      try {
        console.log('Fetching data via Google Sheets GViz endpoint...');
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${appConfig.spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(appConfig.sheetName)}`;
        const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(25000) });
        if (res.ok) {
          const text = await res.text();
          const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const rawRows = parsed.table?.rows || [];

            if (rawRows.length > 1) {
              const headerRow = rawRows[0].c.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '');
              const parsedStudents: Student[] = [];
              const idSet = new Set<string>();

              for (let i = 1; i < rawRows.length; i++) {
                const row = rawRows[i].c;
                if (!row) continue;
                const obj: any = { rowIndex: i + 1 };

                headerRow.forEach((header: string, colIdx: number) => {
                  if (!header) return;
                  const cell = row[colIdx];
                  let strVal = '';
                  if (cell && cell.v !== null && cell.v !== undefined) {
                    if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
                      strVal = cell.f || cell.v;
                    } else {
                      strVal = String(cell.v).trim();
                    }
                  }
                  obj[header] = strVal;
                  const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                  obj[hClean] = strVal;

                  if (hClean === 'nama') obj.nama = strVal;
                  if (hClean === 'nisn') obj.nisn = strVal;
                  if (hClean === 'nipd') obj.nipd = strVal;
                  if (hClean === 'jk') obj.jk = strVal;
                  if (hClean === 'rombel' || hClean === 'kelas') obj.kelas = strVal;
                  if (hClean === 'status') obj.status = strVal;
                  if (hClean === 'ket' || hClean === 'keterangan') obj.ket = strVal;
                  if (hClean === 'tlahir' || hClean === 'tempatlahir') obj.tempatLahir = strVal;
                  if (hClean === 'tgllahir' || hClean === 'tanggallahir') obj.tanggalLahir = strVal;
                  if (hClean === 'agama') obj.agama = strVal;
                  if (hClean === 'alamat') obj.alamat = strVal;
                  if (hClean === 'namaayah' || hClean === 'ayah' || hClean === 'nmayah') {
                    obj.ayah = strVal;
                    obj.nama_ayah = strVal;
                  }
                  if (hClean === 'kerjaayah' || hClean === 'kerja_ayah' || hClean === 'pekerjaanayah' || hClean === 'pkrjayah' || hClean === 'pekayah') {
                    obj.pekerjaanAyah = strVal;
                    obj.kerja_ayah = strVal;
                  }
                  if (hClean === 'namaibu' || hClean === 'ibu' || hClean === 'nmibu') {
                    obj.ibu = strVal;
                    obj.nama_ibu = strVal;
                  }
                  if (hClean === 'kerjaibu' || hClean === 'kerja_ibu' || hClean === 'pekerjaanibu' || hClean === 'pkrjibu' || hClean === 'pekibu') {
                    obj.pekerjaanIbu = strVal;
                    obj.kerja_ibu = strVal;
                  }
                  if (hClean === 'hp' || hClean === 'telepon' || hClean === 'nohp') obj.noHp = strVal;
                  if (hClean === 'email') obj.email = strVal;
                  if (hClean === 'sekolahasal') obj.sekolahAsal = strVal;
                  if (hClean === 'tinggibadan') obj.tinggiBadan = strVal;
                  if (hClean === 'beratbadan') obj.beratBadan = strVal;
                  if (hClean === 'jaraksekolah') obj.jarakSekolah = strVal;
                  if (hClean === 'jumsaudara' || hClean === 'jumlahsaudara') obj.jumlahSaudara = strVal;
                });

                let baseId = obj.nipd || obj.nisn || `STU-${i}`;
                if (idSet.has(baseId)) {
                  baseId = `${baseId}-${i}`;
                }
                idSet.add(baseId);
                obj.id = baseId;

                parsedStudents.push(normalizeStudent(obj));
              }

              if (parsedStudents.length > 0) {
                cachedSheetsData = parsedStudents;
                studentList = parsedStudents;
                appConfig.lastSyncedAt = new Date().toISOString();
                console.log(`Successfully fetched ${parsedStudents.length} real students via GViz!`);
                return parsedStudents;
              }
            }
          }
        }
      } catch (gvizError: any) {
        if (gvizError?.name === 'TimeoutError' || String(gvizError).includes('timeout')) {
          console.log("GViz student fetch timeout, beralih ke fallback Web App / cache.");
        } else {
          console.warn("GViz student fetch gagal, beralih ke fallback Web App...", gvizError?.message || gvizError);
        }
      }
    }

    // 2. Fallback to Google Apps Script Web App
    if (appConfig.webAppUrl) {
      try {
        console.log('Fetching data from Google Apps Script Web App...');
        const response = await fetch(appConfig.webAppUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(30000)
        });
        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData && remoteData.status === "success" && Array.isArray(remoteData.data)) {
            const normalizedStudents = remoteData.data.map((s: any) => normalizeStudent(s));
            cachedSheetsData = normalizedStudents;
            studentList = normalizedStudents;
            appConfig.lastSyncedAt = new Date().toISOString();
            console.log(`Successfully fetched ${cachedSheetsData.length} students from Google Sheets Web App!`);
            return cachedSheetsData;
          }
        }
      } catch (error: any) {
        console.warn("Gagal mengambil data dari Google Apps Script Web App:", error?.message || error);
      }
    }
    return null;
  })().finally(() => {
    fetchStudentsPromise = null;
  });

  return fetchStudentsPromise;
}

// Helper to fetch Wali Kelas data from sheet 'walikelas'
let fetchWaliKelasPromise: Promise<{ map: Record<string, string>; list: WaliKelas[] }> | null = null;

async function fetchWaliKelasFromGoogleSheets(): Promise<{ map: Record<string, string>; list: WaliKelas[] }> {
  if (fetchWaliKelasPromise) {
    return fetchWaliKelasPromise;
  }

  fetchWaliKelasPromise = (async () => {
    if (appConfig.spreadsheetId) {
      try {
        console.log('Fetching Wali Kelas via Google Sheets GViz endpoint...');
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${appConfig.spreadsheetId}/gviz/tq?tqx=out:json&sheet=walikelas&headers=1`;
        const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(25000) });
        if (res.ok) {
          const text = await res.text();
          const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const rawRows = parsed.table?.rows || [];

            const waliKelasMap: Record<string, string> = {};
            const waliKelasList: WaliKelas[] = [];

            rawRows.forEach((rowObj: any) => {
              const cells = rowObj.c;
              if (cells && cells.length >= 2) {
                const k = cells[0]?.v ? String(cells[0].v).trim() : '';
                const w = cells[1]?.v ? String(cells[1].v).trim() : '';
                const n = cells.length >= 3 && cells[2]?.v !== null && cells[2]?.v !== undefined ? String(cells[2].v).trim() : '';
                if (k && w && k.toLowerCase() !== 'kelas') {
                  waliKelasMap[k] = w;
                  waliKelasList.push({
                    kelas: k,
                    nama: w,
                    nip: n
                  });
                }
              }
            });

            if (waliKelasList.length > 0) {
              cachedWaliKelasMap = waliKelasMap;
              cachedWaliKelasList = waliKelasList;
              console.log(`Successfully fetched ${waliKelasList.length} Wali Kelas entries with NIP from sheet!`);
              return { map: waliKelasMap, list: waliKelasList };
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'TimeoutError' || String(err).includes('timeout')) {
          console.log("Koneksi GViz sheet walikelas timeout, menggunakan cache data lokal.");
        } else {
          console.warn("Catatan: Sheet walikelas tidak dapat diakses online saat ini, menggunakan cache data lokal.", err?.message || err);
        }
      }
    }
    return { map: cachedWaliKelasMap, list: cachedWaliKelasList };
  })().finally(() => {
    fetchWaliKelasPromise = null;
  });

  return fetchWaliKelasPromise;
}

// Helper to fetch Jurusan data from sheet 'jurusan'
let fetchJurusanPromise: Promise<Jurusan[]> | null = null;

async function fetchJurusanFromGoogleSheets(): Promise<Jurusan[]> {
  if (fetchJurusanPromise) {
    return fetchJurusanPromise;
  }

  fetchJurusanPromise = (async () => {
    if (appConfig.spreadsheetId) {
      try {
        console.log('Fetching Jurusan via Google Sheets GViz endpoint...');
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${appConfig.spreadsheetId}/gviz/tq?tqx=out:json&sheet=jurusan&headers=1`;
        const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(25000) });
        if (res.ok) {
          const text = await res.text();
          const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const rawRows = parsed.table?.rows || [];

            const list: Jurusan[] = [];
            rawRows.forEach((rowObj: any) => {
              const cells = rowObj.c;
              if (cells && cells.length >= 2) {
                const kd = cells[0]?.v !== null && cells[0]?.v !== undefined ? String(cells[0].v).trim() : '';
                const pk = cells[1]?.v !== null && cells[1]?.v !== undefined ? String(cells[1].v).trim() : '';
                const kk = cells.length >= 3 && cells[2]?.v !== null && cells[2]?.v !== undefined ? String(cells[2].v).trim() : '';
                if (kd && kd.toLowerCase() !== 'kode') {
                  list.push({
                    kode: kd,
                    programKeahlian: pk,
                    konsentrasiKeahlian: kk
                  });
                }
              }
            });

            if (list.length > 0) {
              cachedJurusanList = list;
              console.log(`Successfully fetched ${list.length} Jurusan entries from sheet!`);
              return list;
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'TimeoutError' || String(err).includes('timeout')) {
          console.log("Koneksi GViz sheet jurusan timeout, menggunakan cache data lokal.");
        } else {
          console.warn("Catatan: Sheet jurusan tidak dapat diakses online saat ini, menggunakan cache data lokal.", err?.message || err);
        }
      }
    }
    return cachedJurusanList;
  })().finally(() => {
    fetchJurusanPromise = null;
  });

  return fetchJurusanPromise;
}

// Helper to fetch GTK data from sheet 'gtk'
let fetchGTKPromise: Promise<GTKData[]> | null = null;
let lastGTKFetchTime = 0;

async function fetchGTKFromGoogleSheets(forceRefresh = false): Promise<GTKData[]> {
  const now = Date.now();
  // Jika tidak dipaksa dan cache masih segar (kurang dari 10 detik), gunakan cachedGTKList
  if (!forceRefresh && cachedGTKList.length > 0 && (now - lastGTKFetchTime < 10000)) {
    return cachedGTKList;
  }

  if (fetchGTKPromise && !forceRefresh) {
    return fetchGTKPromise;
  }

  fetchGTKPromise = (async () => {
    // 1. Coba lewat GViz Google Sheets API (jika ada spreadsheetId)
    if (appConfig.spreadsheetId) {
      try {
        console.log('Fetching GTK via Google Sheets GViz endpoint...');
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${appConfig.spreadsheetId}/gviz/tq?tqx=out:json&sheet=gtk&_t=${Date.now()}`;
        const res = await fetch(gvizUrl, {
          signal: AbortSignal.timeout(25000),
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        });
        if (res.ok) {
          const text = await res.text();
          const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            const rawRows = parsed.table?.rows || [];

            if (rawRows.length > 1) {
              const headerRow = rawRows[0].c.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '');
              const parsedGTK: GTKData[] = [];

              for (let i = 1; i < rawRows.length; i++) {
                const row = rawRows[i].c;
                if (!row) continue;
                const obj: any = { rowIndex: i + 1 };

                headerRow.forEach((header: string, colIdx: number) => {
                  if (!header) return;
                  const cell = row[colIdx];
                  let strVal = '';
                  if (cell && cell.v !== null && cell.v !== undefined) {
                    if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
                      strVal = cell.f || cell.v;
                    } else {
                      strVal = String(cell.v).trim();
                    }
                  }
                  obj[header] = strVal;
                  const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                  obj[hClean] = strVal;

                  if (hClean === 'no') obj.no = strVal;
                  if (hClean === 'nama') obj.nama = strVal;
                  if (hClean === 'nuptk') obj.nuptk = strVal;
                  if (hClean === 'jk') obj.jk = strVal;
                  if (hClean === 'tempatlahir' || hClean === 'tlahir') obj.tempatLahir = strVal;
                  if (hClean === 'tanggallahir' || hClean === 'tgllahir') obj.tanggalLahir = strVal;
                  if (hClean === 'nip') obj.nip = strVal;
                  if (hClean === 'statuskepegawaian') obj.statusKepegawaian = strVal;
                  if (hClean === 'jenisptk') obj.jenisPtk = strVal;
                  if (hClean === 'agama') obj.agama = strVal;
                  if (hClean === 'alamatjalan' || hClean === 'alamat') obj.alamatJalan = strVal;
                  if (hClean === 'rt') obj.rt = strVal;
                  if (hClean === 'rw') obj.rw = strVal;
                  if (hClean === 'namadusun' || hClean === 'dusun') obj.namaDusun = strVal;
                  if (hClean === 'desakelurahan' || hClean === 'kelurahan' || hClean === 'desa') obj.desaKelurahan = strVal;
                  if (hClean === 'kecamatan') obj.kecamatan = strVal;
                  if (hClean === 'kodepos') obj.kodePos = strVal;
                  if (hClean === 'telepon') obj.telepon = strVal;
                  if (hClean === 'hp' || hClean === 'nohp') obj.hp = strVal;
                  if (hClean === 'email') obj.email = strVal;
                  if (hClean === 'tugastambahan') obj.tugasTambahan = strVal;
                  if (hClean === 'skcpns') obj.skCpns = strVal;
                  if (hClean === 'tanggalcpns') obj.tanggalCpns = strVal;
                  if (hClean === 'skpengangkatan') obj.skPengangkatan = strVal;
                  if (hClean === 'tmtpengangkatan') obj.tmtPengangkatan = strVal;
                  if (hClean === 'lembagapengangkatan') obj.lembagaPengangkatan = strVal;
                  if (hClean === 'pangkatgolongan' || hClean === 'golongan') obj.pangkatGolongan = strVal;
                  if (hClean === 'sumbergaji') obj.sumberGaji = strVal;
                  if (hClean === 'namaibukandung' || hClean === 'namaibu') obj.namaIbuKandung = strVal;
                  if (hClean === 'statusperkawinan') obj.statusPerkawinan = strVal;
                  if (hClean === 'namasuamiistri') obj.namaSuamiIstri = strVal;
                  if (hClean === 'nipsuamiistri') obj.nipSuamiIstri = strVal;
                  if (hClean === 'pekerjaansuamiistri') obj.pekerjaanSuamiIstri = strVal;
                  if (hClean === 'tmtpns') obj.tmtPns = strVal;
                  if (hClean === 'sudahlisensikepalasekolah') obj.sudahLisensiKepalaSekolah = strVal;
                  if (hClean === 'pernahdiklatkepengawasan') obj.pernahDiklatKepengawasan = strVal;
                  if (hClean === 'keahlianbraille') obj.keahlianBraille = strVal;
                  if (hClean === 'keahlianbahasaisyarat') obj.keahlianBahasaIsyarat = strVal;
                  if (hClean === 'npwp') obj.npwp = strVal;
                  if (hClean === 'namawajibpajak') obj.namaWajibPajak = strVal;
                  if (hClean === 'kewarganegaraan') obj.kewarganegaraan = strVal;
                  if (hClean === 'bank') obj.bank = strVal;
                  if (hClean === 'nomorrekeningbank' || hClean === 'norek') obj.nomorRekeningBank = strVal;
                  if (hClean === 'rekeningatasnama' || hClean === 'reknama') obj.rekeningAtasNama = strVal;
                  if (hClean === 'nik') obj.nik = strVal;
                  if (hClean === 'nokk') obj.noKk = strVal;
                  if (hClean === 'karpeg') obj.karpeg = strVal;
                  if (hClean === 'kariskarsu') obj.karisKarsu = strVal;
                  if (hClean === 'lintang') obj.lintang = strVal;
                  if (hClean === 'bujur') obj.bujur = strVal;
                  if (hClean === 'nuks') obj.nuks = strVal;
                  if (hClean === 'statuslogin' || hClean === 'status_login' || hClean === 'role') {
                    obj.status_login = strVal;
                    obj.statusLogin = strVal;
                  }
                  if (
                    hClean === 'aksesmenu' ||
                    hClean === 'akses_menu' ||
                    hClean === 'statusmenu' ||
                    hClean === 'status_menu' ||
                    hClean === 'hakakses' ||
                    hClean === 'hak_akses' ||
                    hClean === 'menuakses' ||
                    hClean === 'menu_akses' ||
                    hClean === 'izinmenu' ||
                    hClean === 'izin_menu' ||
                    hClean === 'akses' ||
                    hClean === 'menu'
                  ) {
                    obj.akses_menu = strVal;
                    obj.aksesMenu = strVal;
                    obj.status_menu = strVal;
                    obj.statusMenu = strVal;
                    obj.hak_akses = strVal;
                    obj.hakAkses = strVal;
                  }
                });

                let baseId = obj.nip && obj.nip !== '-' ? obj.nip : (obj.nuptk && obj.nuptk !== '-' ? obj.nuptk : `GTK-${i}`);
                obj.id = baseId;

                if (obj.nama) {
                  parsedGTK.push(obj as GTKData);
                }
              }

              if (parsedGTK.length > 0) {
                cachedGTKList = parsedGTK;
                lastGTKFetchTime = Date.now();
                console.log(`Successfully fetched ${parsedGTK.length} GTK entries from sheet 'gtk'!`);
                return parsedGTK;
              }
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'TimeoutError' || String(err).includes('timeout')) {
          console.log("Koneksi GViz sheet gtk timeout, mencoba fallback...");
        } else {
          console.warn("Catatan: Sheet gtk belum dapat diakses via GViz, mencoba fallback...", err?.message || err);
        }
      }
    }

    // 2. Fallback: Coba lewat Google Apps Script Web App (?sheet=gtk)
    if (appConfig.webAppUrl) {
      try {
        console.log('Fetching GTK via Google Apps Script Web App...');
        const url = appConfig.webAppUrl + (appConfig.webAppUrl.includes('?') ? '&' : '?') + 'sheet=gtk&_t=' + Date.now();
        const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            cachedGTKList = json.data;
            lastGTKFetchTime = Date.now();
            console.log(`Successfully fetched ${json.data.length} GTK entries via Web App!`);
            return json.data;
          }
        }
      } catch (err) {
        console.warn('Fallback Web App GTK fetch failed:', err);
      }
    }

    return cachedGTKList;
  })().finally(() => {
    fetchGTKPromise = null;
  });

  return fetchGTKPromise;
}

// Helper to fetch Riwayat Pangkat from Google Sheets (sheet: pangkat or naikpangkat)
let fetchPangkatPromise: Promise<RiwayatPangkat[]> | null = null;
async function fetchPangkatFromGoogleSheets(): Promise<RiwayatPangkat[]> {
  if (fetchPangkatPromise) {
    return fetchPangkatPromise;
  }

  fetchPangkatPromise = (async () => {
    // 1. First try Google Sheets GViz endpoint (Fast direct access in ~300ms)
    if (appConfig.spreadsheetId) {
      const candidates = ["pangkat", "naikpangkat", "naik_pangkat"];
      for (const sheetName of candidates) {
        try {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${appConfig.spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`;
          const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(10000) });
          if (res.ok) {
            const text = await res.text();
            const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            if (jsonText) {
              const parsed = JSON.parse(jsonText);
              const rawRows = parsed.table?.rows || [];
              const cols = parsed.table?.cols || [];
              if (rawRows.length === 0) continue;

              let headerRow: string[] = [];
              let startIdx = 0;

              const hasColLabels = cols.some((c: any) => c.label && c.label.trim() !== "");
              if (hasColLabels) {
                headerRow = cols.map((c: any) => (c.label || "").trim());
                startIdx = 0;
              } else {
                headerRow = rawRows[0]?.c?.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '') || [];
                startIdx = 1;
              }

              // Safety check: if sheet is student data fallback, skip
              const headerRowStr = headerRow.join(" ").toLowerCase();
              if ((headerRowStr.includes("nipd") || headerRowStr.includes("nisn") || headerRowStr.includes("rombel")) && !headerRowStr.includes("gol") && !headerRowStr.includes("sk")) {
                continue;
              }

              const uniqueMap = new Map<string, RiwayatPangkat>();

              for (let i = startIdx; i < rawRows.length; i++) {
                const row = rawRows[i]?.c;
                if (!row) continue;
                const obj: any = { rowIndex: i + 1 };

                headerRow.forEach((header: string, colIdx: number) => {
                  if (!header) return;
                  const cell = row[colIdx];
                  let strVal = '';
                  if (cell && cell.v !== null && cell.v !== undefined) {
                    if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
                      if (cell.f) {
                        strVal = cell.f;
                      } else {
                        const match = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/);
                        if (match) {
                          const y = match[1];
                          const m = String(Number(match[2]) + 1).padStart(2, '0');
                          const d = String(match[3]).padStart(2, '0');
                          strVal = `${y}-${m}-${d}`;
                        } else {
                          strVal = cell.v;
                        }
                      }
                    } else {
                      strVal = cell.f || String(cell.v).trim();
                    }
                  }
                  obj[header] = strVal;
                  const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                  obj[hClean] = strVal;

                  if (hClean === 'no') obj.no = strVal;
                  if (hClean === 'nip') obj.nip = strVal;
                  if (hClean === 'nama') obj.nama = strVal;
                  if (hClean === 'gol' || hClean === 'golongan') obj.gol = strVal;
                  if (hClean === 'nosk') obj.noSk = strVal;
                  if (hClean === 'tglsk') obj.tglSk = strVal;
                  if (hClean === 'tmt') obj.tmt = strVal;
                  if (hClean === 'masakerjatahun' || hClean === 'masakerjathn') obj.masaKerjaThn = Number(strVal) || 0;
                  if (hClean === 'masakerjabln' || hClean === 'masakerjabulan') obj.masaKerjaBln = Number(strVal) || 0;
                  if (hClean === 'timestamp') obj.timestamp = strVal;
                  if (hClean === 'status') obj.status = strVal;
                });

                obj.id = `PANGKAT-${obj.nip ? obj.nip + '-' : ''}${i}`;
                if (obj.nama && obj.nama.toLowerCase() !== 'nama' && (obj.nip || obj.gol || obj.noSk)) {
                  const nip = (obj.nip || '').trim();
                  const noSkKey = (obj.noSk || '').trim();
                  const golKey = (obj.gol || '').trim();
                  const tmtKey = (obj.tmt || '').trim();
                  const isPlaceholder = !noSkKey || noSkKey === '-' || noSkKey === '0';
                  const key = nip
                    ? `${nip}_${isPlaceholder ? 'nosk' : noSkKey}_${golKey}_${tmtKey || obj.id}`
                    : obj.id;
                  uniqueMap.set(key, obj as RiwayatPangkat);
                }
              }

              const cleanList = Array.from(uniqueMap.values());
              if (cleanList.length > 0) {
                cachedPangkatList = cleanList;
                console.log(`Successfully fetched ${cleanList.length} Pangkat entries from sheet '${sheetName}' via GViz!`);
                return cleanList;
              }
            }
          }
        } catch (err: any) {
          // try next candidate
        }
      }
    }

    // 2. Fallback: Google Apps Script Web App
    if (appConfig.webAppUrl) {
      const candidates = ['naikpangkat', 'pangkat'];
      for (const sp of candidates) {
        try {
          const url = appConfig.webAppUrl + (appConfig.webAppUrl.includes('?') ? '&' : '?') + 'sheet=' + sp;
          const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (res.ok) {
            const json = await res.json();
            if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
              const uniqueMap = new Map<string, RiwayatPangkat>();
              json.data.forEach((item: any, idx: number) => {
                const nip = (item.nip || '').trim();
                const noSkKey = (item.noSk || item.no_sk || item.nosk || '').trim();
                const golKey = (item.gol || item.golongan || '').trim();
                const tmtKey = (item.tmt || '').trim();
                const isPlaceholder = !noSkKey || noSkKey === '-' || noSkKey === '0';
                const key = nip
                  ? `${nip}_${isPlaceholder ? 'nosk' : noSkKey}_${golKey}_${tmtKey || `idx-${idx}`}`
                  : `idx-${idx}`;
                const formattedItem: RiwayatPangkat = {
                  id: item.id || `PANGKAT-${item.nip ? item.nip + '-' : ''}${idx + 1}`,
                  no: item.no || idx + 1,
                  nip: item.nip || '',
                  nama: item.nama || '',
                  gol: item.gol || item.golongan || '',
                  noSk: item.noSk || item.no_sk || item.nosk || '',
                  tglSk: item.tglSk || item.tgl_sk || item.tglsk || '',
                  tmt: item.tmt || '',
                  masaKerjaThn: Number(item.masaKerjaThn !== undefined ? item.masaKerjaThn : (item.masa_kerja_thn || item.masakerjathn || 0)),
                  masaKerjaBln: Number(item.masaKerjaBln !== undefined ? item.masaKerjaBln : (item.masa_kerja_bln || item.masakerjabln || 0)),
                  timestamp: item.timestamp || '',
                  status: item.status || 'Aktif',
                  keterangan: item.keterangan || ''
                };
                uniqueMap.set(key, formattedItem);
              });
              const parsedList = Array.from(uniqueMap.values());
              if (parsedList.length > 0) {
                cachedPangkatList = parsedList;
                console.log(`Successfully fetched ${parsedList.length} Pangkat entries from Apps Script Web App!`);
                return parsedList;
              }
            }
          }
        } catch {
          // silently continue
        }
      }
    }

    return cachedPangkatList;
  })().finally(() => {
    fetchPangkatPromise = null;
  });

  return fetchPangkatPromise;
}

// Helper to fetch Riwayat KGB from Google Sheets (sheet: kgb)
let fetchKGBPromise: Promise<RiwayatKGB[]> | null = null;
async function fetchKGBFromGoogleSheets(): Promise<RiwayatKGB[]> {
  if (fetchKGBPromise) {
    return fetchKGBPromise;
  }

  fetchKGBPromise = (async () => {
    // 1. First try Google Sheets GViz endpoint (Fast direct access in ~300ms)
    if (appConfig.spreadsheetId) {
      const candidates = ["kgb", "riwayat_kgb", "gaji_berkala", "gajiberkala"];
      for (const sheetName of candidates) {
        try {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${appConfig.spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`;
          const res = await fetch(gvizUrl, { signal: AbortSignal.timeout(10000) });
          if (res.ok) {
            const text = await res.text();
            const jsonText = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            if (jsonText) {
              const parsed = JSON.parse(jsonText);
              const rawRows = parsed.table?.rows || [];
              const cols = parsed.table?.cols || [];
              if (rawRows.length === 0) continue;

              let headerRow: string[] = [];
              let startIdx = 0;

              const hasColLabels = cols.some((c: any) => c.label && c.label.trim() !== "");
              if (hasColLabels) {
                headerRow = cols.map((c: any) => (c.label || "").trim());
                startIdx = 0;
              } else {
                headerRow = rawRows[0]?.c?.map((cell: any) => cell && cell.v !== null ? String(cell.v).trim() : '') || [];
                startIdx = 1;
              }

              // Safety check: if sheet is student data fallback, skip
              const headerRowStr = headerRow.join(" ").toLowerCase();
              if ((headerRowStr.includes("nipd") || headerRowStr.includes("nisn") || headerRowStr.includes("rombel")) && !headerRowStr.includes("gol") && !headerRowStr.includes("sk") && !headerRowStr.includes("gaji")) {
                continue;
              }

              const uniqueMap = new Map<string, RiwayatKGB>();

              for (let i = startIdx; i < rawRows.length; i++) {
                const row = rawRows[i]?.c;
                if (!row) continue;
                const obj: any = { rowIndex: i + 1 };

                headerRow.forEach((header: string, colIdx: number) => {
                  if (!header) return;
                  const cell = row[colIdx];
                  let strVal = '';
                  if (cell && cell.v !== null && cell.v !== undefined) {
                    if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
                      if (cell.f) {
                        strVal = cell.f;
                      } else {
                        const match = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/);
                        if (match) {
                          const y = match[1];
                          const m = String(Number(match[2]) + 1).padStart(2, '0');
                          const d = String(match[3]).padStart(2, '0');
                          strVal = `${y}-${m}-${d}`;
                        } else {
                          strVal = cell.v;
                        }
                      }
                    } else {
                      strVal = cell.f || String(cell.v).trim();
                    }
                  }
                  obj[header] = strVal;
                  const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                  obj[hClean] = strVal;

                  if (hClean === 'no') obj.no = strVal;
                  if (hClean === 'nip') obj.nip = strVal;
                  if (hClean === 'nama') obj.nama = strVal;
                  if (hClean === 'gol' || hClean === 'golongan') obj.gol = strVal;
                  if (hClean === 'nosk') obj.noSk = strVal;
                  if (hClean === 'tglsk') obj.tglSk = strVal;
                  if (hClean === 'tmtkgb' || hClean === 'tmt') obj.tmt = strVal;
                  if (hClean === 'masakerjatahun' || hClean === 'masakerjathn') obj.masaKerjaThn = Number(strVal) || 0;
                  if (hClean === 'masakerjabln' || hClean === 'masakerjabulan') obj.masaKerjaBln = Number(strVal) || 0;
                  if (hClean === 'gajipokok' || hClean === 'gaji') {
                    const cleanNum = String(strVal).replace(/[^0-9]/g, '');
                    obj.gajiPokok = Number(cleanNum) || 0;
                  }
                  if (hClean === 'timestamp') obj.timestamp = strVal;
                  if (hClean === 'status') obj.status = strVal;
                });

                obj.id = `KGB-${obj.nip ? obj.nip + '-' : ''}${i}`;
                if (obj.nama && obj.nama.toLowerCase() !== 'nama' && (obj.nip || obj.gol || obj.noSk || obj.gajiPokok)) {
                  const nip = (obj.nip || '').trim();
                  const noSkKey = (obj.noSk || '').trim();
                  const tmtKey = (obj.tmt || '').trim();
                  const isPlaceholder = !noSkKey || noSkKey === '-' || noSkKey === '0';
                  const key = nip
                    ? `${nip}_${isPlaceholder ? 'nosk' : noSkKey}_${tmtKey || obj.id}`
                    : obj.id;
                  uniqueMap.set(key, obj as RiwayatKGB);
                }
              }

              const cleanList = Array.from(uniqueMap.values());
              if (cleanList.length > 0) {
                cachedKGBList = cleanList;
                console.log(`Successfully fetched ${cleanList.length} KGB entries from sheet '${sheetName}' via GViz!`);
                return cleanList;
              }
            }
          }
        } catch (err: any) {
          // try next candidate
        }
      }
    }

    // 2. Fallback: Google Apps Script Web App
    if (appConfig.webAppUrl) {
      try {
        const url = appConfig.webAppUrl + (appConfig.webAppUrl.includes('?') ? '&' : '?') + 'sheet=kgb';
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const json = await res.json();
          if (json && json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            const uniqueMap = new Map<string, RiwayatKGB>();
            json.data.forEach((item: any, idx: number) => {
              const nip = (item.nip || '').trim();
              const noSkKey = (item.noSk || item.no_sk || item.nosk || '').trim();
              const tmtKey = (item.tmt || item.TMT_kgb || item.tmt_kgb || item.tmtkgb || '').trim();
              const isPlaceholder = !noSkKey || noSkKey === '-' || noSkKey === '0';
              const key = nip
                ? `${nip}_${isPlaceholder ? 'nosk' : noSkKey}_${tmtKey || `idx-${idx}`}`
                : `idx-${idx}`;
              const formattedItem: RiwayatKGB = {
                id: item.id || `KGB-${item.nip ? item.nip + '-' : ''}${idx + 1}`,
                no: item.no || idx + 1,
                nip: item.nip || '',
                nama: item.nama || '',
                gol: item.gol || item.golongan || '',
                noSk: item.noSk || item.no_sk || item.nosk || '',
                tglSk: item.tglSk || item.tgl_sk || item.tglsk || '',
                tmt: item.tmt || item.TMT_kgb || item.tmt_kgb || item.tmtkgb || '',
                masaKerjaThn: Number(item.masaKerjaThn !== undefined ? item.masaKerjaThn : (item.masa_kerja_tahun || item.masakerjatahun || 0)),
                masaKerjaBln: Number(item.masaKerjaBln !== undefined ? item.masaKerjaBln : (item.masa_kerja_bln || item.masakerjabln || 0)),
                gajiPokok: Number(item.gajiPokok !== undefined ? item.gajiPokok : (item.gaji_pokok || item.gajipokok || 0)),
                timestamp: item.timestamp || '',
                status: item.status || 'Aktif',
                keterangan: item.keterangan || ''
              };
              uniqueMap.set(key, formattedItem);
            });
            const parsedList = Array.from(uniqueMap.values());
            if (parsedList.length > 0) {
              cachedKGBList = parsedList;
              console.log(`Successfully fetched ${parsedList.length} KGB entries from Apps Script Web App!`);
              return parsedList;
            }
          }
        }
      } catch {
        // silently continue
      }
    }

    return cachedKGBList;
  })().finally(() => {
    fetchKGBPromise = null;
  });

  return fetchKGBPromise;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS for API routes
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server Data Siswa berjalan normal" });
  });

  // GET GTK Data
  app.get("/api/gtk", async (req, res) => {
    const isForce = req.query.force === 'true';
    if (isForce) {
      cachedGTKList = [];
    }
    const list = await fetchGTKFromGoogleSheets(isForce);
    res.json({
      status: "success",
      total: list.length,
      data: list
    });
  });

  // GET Allowed Download Headers for GTK
  app.get("/api/gtk/download-headers", (req, res) => {
    // Re-read file if exists to ensure latest persisted data
    try {
      if (fs.existsSync(HEADERS_CACHE_FILE)) {
        const raw = fs.readFileSync(HEADERS_CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedGtkDownloadHeaders = parsed.map(String);
        }
      }
    } catch {}

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
    res.json({
      status: "success",
      headers: cachedGtkDownloadHeaders
    });
  });

  // POST Update Allowed Download Headers for GTK
  app.post("/api/gtk/download-headers", (req, res) => {
    try {
      const { headers } = req.body;
      if (Array.isArray(headers) && headers.length > 0) {
        cachedGtkDownloadHeaders = headers.map(String);
        try {
          fs.writeFileSync(HEADERS_CACHE_FILE, JSON.stringify(cachedGtkDownloadHeaders, null, 2), 'utf-8');
        } catch (fileErr) {
          console.warn('Could not write to gtk_download_headers.json:', fileErr);
        }
        return res.json({
          status: "success",
          message: "Header download GTK berhasil disimpan di server",
          headers: cachedGtkDownloadHeaders
        });
      }
      return res.status(400).json({ status: "error", message: "Daftar headers tidak valid" });
    } catch (err: any) {
      return res.status(500).json({ status: "error", message: err.message || "Gagal menyimpan headers" });
    }
  });

  // POST Update Akses Menu GTK
  app.post("/api/gtk/akses-menu", async (req, res) => {
    try {
      const { nip, nuptk, nama, id, akses_menu, status_login } = req.body;
      if (!nip && !nuptk && !nama && !id) {
        return res.status(400).json({ status: "error", message: "Identitas GTK (NIP/NUPTK/Nama) diperlukan" });
      }

      const cleanNip = (s: string) => String(s || '').replace(/[\s.-]/g, '').trim();
      const targetNip = cleanNip(nip);
      const targetNuptk = cleanNip(nuptk);
      const targetNama = String(nama || '').trim().toLowerCase();
      const targetId = String(id || '').trim().toLowerCase();

      let updatedItem: any = null;
      cachedGTKList = cachedGTKList.map((g: any) => {
        const gNip = cleanNip(g.nip);
        const gNuptk = cleanNip(g.nuptk);
        const gNama = String(g.nama || '').trim().toLowerCase();
        const gId = String(g.id || '').trim().toLowerCase();

        const match = (targetNip && gNip === targetNip) ||
                      (targetNuptk && gNuptk === targetNuptk) ||
                      (targetId && gId === targetId) ||
                      (targetNama && gNama === targetNama);

        if (match) {
          updatedItem = {
            ...g,
            akses_menu: akses_menu !== undefined ? String(akses_menu).trim() : g.akses_menu,
            aksesMenu: akses_menu !== undefined ? String(akses_menu).trim() : g.aksesMenu,
            status_menu: akses_menu !== undefined ? String(akses_menu).trim() : g.status_menu,
            statusMenu: akses_menu !== undefined ? String(akses_menu).trim() : g.statusMenu,
            hak_akses: akses_menu !== undefined ? String(akses_menu).trim() : g.hak_akses,
            hakAkses: akses_menu !== undefined ? String(akses_menu).trim() : g.hakAkses,
            status_login: status_login !== undefined ? String(status_login).trim() : g.status_login,
            statusLogin: status_login !== undefined ? String(status_login).trim() : g.statusLogin,
          };
          return updatedItem;
        }
        return g;
      });

      // Forward to Google Apps Script Web App
      let syncedToSheets = false;
      if (appConfig.webAppUrl && updatedItem) {
        try {
          const payload = {
            action: "update",
            target: "gtk",
            gtk: updatedItem
          };
          await fetch(appConfig.webAppUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
          });
          syncedToSheets = true;
        } catch (syncErr) {
          console.warn("Gagal menyinkronkan akses_menu GTK ke Apps Script:", syncErr);
        }
      }

      return res.json({
        status: "success",
        message: "Hak akses menu GTK berhasil diperbarui",
        syncedToSheets,
        data: updatedItem
      });
    } catch (err: any) {
      console.error("Error updating GTK akses menu:", err);
      return res.status(500).json({ status: "error", message: err.message || "Gagal memperbarui akses menu GTK" });
    }
  });

  // POST Batch Update Akses Menu GTK
  app.post("/api/gtk/batch-akses-menu", async (req, res) => {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ status: "error", message: "Data updates array diperlukan" });
      }

      const cleanNip = (s: string) => String(s || '').replace(/[\s.-]/g, '').trim();
      const updatedList: any[] = [];

      cachedGTKList = cachedGTKList.map((g: any) => {
        const gNip = cleanNip(g.nip);
        const gNuptk = cleanNip(g.nuptk);
        const gNama = String(g.nama || '').trim().toLowerCase();
        const gId = String(g.id || '').trim().toLowerCase();

        const updateData = updates.find((u: any) => {
          const uNip = cleanNip(u.nip);
          const uNuptk = cleanNip(u.nuptk);
          const uNama = String(u.nama || '').trim().toLowerCase();
          const uId = String(u.id || '').trim().toLowerCase();
          return (uNip && gNip === uNip) || (uNuptk && gNuptk === uNuptk) || (uId && gId === uId) || (uNama && gNama === uNama);
        });

        if (updateData) {
          const updated = {
            ...g,
            akses_menu: updateData.akses_menu !== undefined ? String(updateData.akses_menu).trim() : g.akses_menu,
            aksesMenu: updateData.akses_menu !== undefined ? String(updateData.akses_menu).trim() : g.aksesMenu,
            status_menu: updateData.akses_menu !== undefined ? String(updateData.akses_menu).trim() : g.status_menu,
            statusMenu: updateData.akses_menu !== undefined ? String(updateData.akses_menu).trim() : g.statusMenu,
            hak_akses: updateData.akses_menu !== undefined ? String(updateData.akses_menu).trim() : g.hak_akses,
            hakAkses: updateData.akses_menu !== undefined ? String(updateData.akses_menu).trim() : g.hakAkses,
            status_login: updateData.status_login !== undefined ? String(updateData.status_login).trim() : g.status_login,
            statusLogin: updateData.status_login !== undefined ? String(updateData.status_login).trim() : g.statusLogin,
          };
          updatedList.push(updated);
          return updated;
        }
        return g;
      });

      // Forward to Google Apps Script
      let syncedToSheets = false;
      if (appConfig.webAppUrl && updatedList.length > 0) {
        try {
          const payload = {
            action: "syncAll",
            target: "gtk",
            gtk: cachedGTKList
          };
          await fetch(appConfig.webAppUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
          });
          syncedToSheets = true;
        } catch (syncErr) {
          console.warn("Gagal menyinkronkan batch GTK ke Apps Script:", syncErr);
        }
      }

      return res.json({
        status: "success",
        message: `Berhasil memperbarui hak akses untuk ${updatedList.length} GTK`,
        syncedToSheets,
        totalUpdated: updatedList.length
      });
    } catch (err: any) {
      console.error("Error batch update GTK akses menu:", err);
      return res.status(500).json({ status: "error", message: err.message || "Gagal batch update akses menu GTK" });
    }
  });

  // GET Riwayat Pangkat Data
  app.get("/api/pangkat", async (req, res) => {
    const isForce = req.query.force === 'true';
    if (isForce) {
      cachedPangkatList = [];
    }
    const list = await fetchPangkatFromGoogleSheets();
    res.json({
      status: "success",
      total: list.length,
      data: list
    });
  });

  function formatToDDMMYYYYServer(val: any): string {
    if (!val) return '';
    const str = String(val).trim();
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}/${dmyMatch[3]}`;
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) return `${ymdMatch[3].padStart(2, '0')}/${ymdMatch[2].padStart(2, '0')}/${ymdMatch[1]}`;
    return str;
  }

  // POST Add Riwayat Pangkat
  app.post("/api/pangkat", async (req, res) => {
    // Duplicate check using combination: NIP + Nomor SK + TMT
    const trimmedNip = (req.body.nip || '').trim();
    const trimmedNoSk = (req.body.noSk || req.body.no_sk || '').trim();
    const normalizedReqTmt = formatToDDMMYYYYServer(req.body.tmt || '');

    if (trimmedNip && trimmedNoSk && trimmedNoSk !== '-' && trimmedNoSk !== '0' && normalizedReqTmt) {
      const existing = cachedPangkatList.find(p => {
        const pNip = (p.nip || '').trim();
        const pNoSk = (p.noSk || (p as any).no_sk || '').trim();
        const pTmt = formatToDDMMYYYYServer(p.tmt || '');
        return pNip.toLowerCase() === trimmedNip.toLowerCase() &&
               pNoSk.toLowerCase() === trimmedNoSk.toLowerCase() &&
               pTmt === normalizedReqTmt;
      });

      if (existing) {
        return res.status(409).json({
          status: "duplicate",
          message: `Data riwayat kepangkatan untuk NIP ${trimmedNip} dengan Nomor SK "${trimmedNoSk}" dan TMT "${normalizedReqTmt}" sudah ada!`,
          data: existing
        });
      }
    }

    const newItem: RiwayatPangkat = {
      id: req.body.id || `PANGKAT-${Date.now()}`,
      no: req.body.no || (cachedPangkatList.length + 1),
      nip: req.body.nip || '',
      nama: req.body.nama || '',
      gol: req.body.gol || '',
      noSk: req.body.noSk || req.body.no_sk || '',
      tglSk: req.body.tglSk || req.body.tgl_sk || '',
      tmt: req.body.tmt || '',
      masaKerjaThn: Number(req.body.masaKerjaThn || req.body.masa_kerja_thn || 0),
      masaKerjaBln: Number(req.body.masaKerjaBln || req.body.masa_kerja_bln || 0),
      timestamp: req.body.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: req.body.status || 'Aktif',
      keterangan: req.body.keterangan || '',
      createdAt: new Date().toISOString().split('T')[0]
    };

    cachedPangkatList.push(newItem);

    // Forward to Google Apps Script Web App if available and not already forwarded by client
    const shouldForwardPangkat = req.query.forward !== 'false' && req.body.skipSheetsForward !== true;
    if (appConfig.webAppUrl && shouldForwardPangkat) {
      try {
        fetch(appConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createPangkat',
            target: 'naikpangkat',
            item: newItem
          }),
          signal: AbortSignal.timeout(15000)
        }).catch(err => console.warn("Sync Google Apps Script Pangkat error:", err));
      } catch (err) {}
    }

    res.json({ status: "success", message: "Riwayat kepangkatan berhasil ditambahkan", data: newItem });
  });

  // PUT Update Riwayat Pangkat
  app.put("/api/pangkat/:id", async (req, res) => {
    const { id } = req.params;
    const index = cachedPangkatList.findIndex(p => p.id === id || (p.noSk && p.noSk === id));
    if (index === -1) {
      return res.status(404).json({ status: "error", message: "Data riwayat pangkat tidak ditemukan" });
    }

    cachedPangkatList[index] = { ...cachedPangkatList[index], ...req.body };

    const shouldForwardPangkatUpdate = req.query.forward !== 'false' && req.body.skipSheetsForward !== true;
    if (appConfig.webAppUrl && shouldForwardPangkatUpdate) {
      try {
        fetch(appConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updatePangkat',
            target: 'naikpangkat',
            item: cachedPangkatList[index]
          }),
          signal: AbortSignal.timeout(15000)
        }).catch(err => console.warn("Sync Google Apps Script update Pangkat error:", err));
      } catch (err) {}
    }

    res.json({ status: "success", message: "Riwayat kepangkatan berhasil diperbarui", data: cachedPangkatList[index] });
  });

  // DELETE Riwayat Pangkat
  app.delete("/api/pangkat/:id", async (req, res) => {
    const rawId = req.params.id || '';
    const decodedId = decodeURIComponent(rawId).trim();
    const index = cachedPangkatList.findIndex(p => 
      p.id === rawId || 
      p.id === decodedId || 
      (p.noSk && p.noSk.trim() === decodedId) ||
      (p.noSk && rawId.includes(p.noSk.trim()))
    );

    if (index === -1) {
      return res.status(404).json({ status: "error", message: "Data riwayat pangkat tidak ditemukan" });
    }

    const [deletedItem] = cachedPangkatList.splice(index, 1);

    // Forward deletion to Google Sheets Web App if configured
    if (appConfig.webAppUrl && deletedItem) {
      try {
        await fetch(appConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            target: 'naikpangkat',
            item: deletedItem
          }),
          signal: AbortSignal.timeout(15000)
        });
      } catch (err) {
        console.warn("Delete pangkat Google Sheets forwarding warning:", err);
      }
    }

    res.json({ status: "success", message: "Data riwayat pangkat berhasil dihapus", data: deletedItem });
  });

  // POST Sync All Riwayat Pangkat
  app.post("/api/pangkat/sync", async (req, res) => {
    const items = req.body.items || cachedPangkatList;
    if (Array.isArray(items) && items.length > 0) {
      cachedPangkatList = items;
      if (appConfig.webAppUrl) {
        try {
          await fetch(appConfig.webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'syncAll',
              target: 'naikpangkat',
              items: cachedPangkatList
            }),
            signal: AbortSignal.timeout(30000)
          });
        } catch (err) {
          console.warn("Sync all pangkat warning:", err);
        }
      }
    }
    res.json({ status: "success", message: "Sinkronisasi riwayat pangkat selesai", total: cachedPangkatList.length });
  });

  // GET Riwayat KGB Data
  app.get("/api/kgb", async (req, res) => {
    const isForce = req.query.force === 'true';
    if (isForce) {
      cachedKGBList = [];
    }
    const list = await fetchKGBFromGoogleSheets();
    res.json({
      status: "success",
      total: list.length,
      data: list
    });
  });

  // POST Add Riwayat KGB
  app.post("/api/kgb", async (req, res) => {
    // Duplicate check using combination: NIP + Nomor SK + TMT
    const trimmedNip = (req.body.nip || '').trim();
    const trimmedNoSk = (req.body.noSk || req.body.no_sk || '').trim();
    const normalizedReqTmt = formatToDDMMYYYYServer(req.body.tmt || req.body.TMT_kgb || '');

    if (trimmedNip && trimmedNoSk && trimmedNoSk !== '-' && trimmedNoSk !== '0' && normalizedReqTmt) {
      const existing = cachedKGBList.find(k => {
        const kNip = (k.nip || '').trim();
        const kNoSk = (k.noSk || (k as any).no_sk || '').trim();
        const kTmt = formatToDDMMYYYYServer(k.tmt || (k as any).TMT_kgb || '');
        return kNip.toLowerCase() === trimmedNip.toLowerCase() &&
               pNoSkMatch(kNoSk, trimmedNoSk) &&
               kTmt === normalizedReqTmt;
      });

      function pNoSkMatch(a: string, b: string): boolean {
        return a.toLowerCase() === b.toLowerCase();
      }

      if (existing) {
        return res.status(409).json({
          status: "duplicate",
          message: `Data riwayat KGB untuk NIP ${trimmedNip} dengan Nomor SK "${trimmedNoSk}" dan TMT "${normalizedReqTmt}" sudah ada!`,
          data: existing
        });
      }
    }

    const newItem: RiwayatKGB = {
      id: req.body.id || `KGB-${Date.now()}`,
      no: req.body.no || (cachedKGBList.length + 1),
      nip: req.body.nip || '',
      nama: req.body.nama || '',
      gol: req.body.gol || '',
      noSk: req.body.noSk || req.body.no_sk || '',
      tglSk: req.body.tglSk || req.body.tgl_sk || '',
      tmt: req.body.tmt || req.body.TMT_kgb || '',
      masaKerjaThn: Number(req.body.masaKerjaThn || req.body.masa_kerja_tahun || 0),
      masaKerjaBln: Number(req.body.masaKerjaBln || req.body.masa_kerja_bln || 0),
      gajiPokok: Number(req.body.gajiPokok || req.body.gaji_pokok || 0),
      timestamp: req.body.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: req.body.status || 'Aktif',
      keterangan: req.body.keterangan || '',
      createdAt: new Date().toISOString().split('T')[0]
    };

    cachedKGBList.push(newItem);

    // Forward to Google Apps Script Web App if available and not already forwarded by client
    const shouldForwardKGB = req.query.forward !== 'false' && req.body.skipSheetsForward !== true;
    if (appConfig.webAppUrl && shouldForwardKGB) {
      try {
        fetch(appConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createKGB',
            target: 'kgb',
            item: newItem
          }),
          signal: AbortSignal.timeout(15000)
        }).catch(err => console.warn("Sync Google Apps Script KGB error:", err));
      } catch (err) {}
    }

    res.json({ status: "success", message: "Riwayat KGB berhasil ditambahkan", data: newItem });
  });

  // PUT Update Riwayat KGB
  app.put("/api/kgb/:id", async (req, res) => {
    const { id } = req.params;
    const index = cachedKGBList.findIndex(k => k.id === id || (k.noSk && k.noSk === id));
    if (index === -1) {
      return res.status(404).json({ status: "error", message: "Data riwayat KGB tidak ditemukan" });
    }

    cachedKGBList[index] = { ...cachedKGBList[index], ...req.body };

    const shouldForwardKGBUpdate = req.query.forward !== 'false' && req.body.skipSheetsForward !== true;
    if (appConfig.webAppUrl && shouldForwardKGBUpdate) {
      try {
        fetch(appConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateKGB',
            target: 'kgb',
            item: cachedKGBList[index]
          }),
          signal: AbortSignal.timeout(15000)
        }).catch(err => console.warn("Sync Google Apps Script update KGB error:", err));
      } catch (err) {}
    }

    res.json({ status: "success", message: "Riwayat KGB berhasil diperbarui", data: cachedKGBList[index] });
  });

  // DELETE Riwayat KGB
  app.delete("/api/kgb/:id", async (req, res) => {
    const rawId = req.params.id || '';
    const decodedId = decodeURIComponent(rawId).trim();
    const index = cachedKGBList.findIndex(k => 
      k.id === rawId || 
      k.id === decodedId || 
      (k.noSk && k.noSk.trim() === decodedId) ||
      (k.noSk && rawId.includes(k.noSk.trim()))
    );

    if (index === -1) {
      return res.status(404).json({ status: "error", message: "Data riwayat KGB tidak ditemukan" });
    }

    const [deletedItem] = cachedKGBList.splice(index, 1);

    // Forward deletion to Google Sheets Web App if configured
    if (appConfig.webAppUrl && deletedItem) {
      try {
        await fetch(appConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            target: 'kgb',
            item: deletedItem
          }),
          signal: AbortSignal.timeout(15000)
        });
      } catch (err) {
        console.warn("Delete kgb Google Sheets forwarding warning:", err);
      }
    }

    res.json({ status: "success", message: "Data riwayat KGB berhasil dihapus", data: deletedItem });
  });

  // POST Sync All Riwayat KGB
  app.post("/api/kgb/sync", async (req, res) => {
    const items = req.body.items || cachedKGBList;
    if (Array.isArray(items) && items.length > 0) {
      cachedKGBList = items;
      if (appConfig.webAppUrl) {
        try {
          await fetch(appConfig.webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'syncAll',
              target: 'kgb',
              items: cachedKGBList
            }),
            signal: AbortSignal.timeout(30000)
          });
        } catch (err) {
          console.warn("Sync all KGB warning:", err);
        }
      }
    }
    res.json({ status: "success", message: "Sinkronisasi riwayat KGB selesai", total: cachedKGBList.length });
  });

  // GET Wali Kelas (Map & List)
  app.get("/api/walikelas", async (req, res) => {
    if (cachedWaliKelasList.length === 0 || Object.keys(cachedWaliKelasMap).length === 0) {
      await fetchWaliKelasFromGoogleSheets();
    }
    res.json({
      status: "success",
      data: cachedWaliKelasMap,
      list: cachedWaliKelasList
    });
  });

  // GET Jurusan (List)
  app.get("/api/jurusan", async (req, res) => {
    if (cachedJurusanList.length === 0) {
      await fetchJurusanFromGoogleSheets();
    }
    res.json({
      status: "success",
      data: cachedJurusanList
    });
  });

  // POST Verify NIP
  app.post("/api/walikelas/verify", async (req, res) => {
    const { nip } = req.body;
    if (!nip) {
      return res.status(400).json({ status: "error", message: "NIP wajib diisi" });
    }

    const cleanInputNip = String(nip).trim().replace(/[^a-zA-Z0-9]/g, '');

    if (cachedWaliKelasList.length === 0) {
      await fetchWaliKelasFromGoogleSheets();
    }

    const found = cachedWaliKelasList.find(w => {
      const cleanWaliNip = String(w.nip || '').trim().replace(/[^a-zA-Z0-9]/g, '');
      return cleanWaliNip && cleanWaliNip === cleanInputNip;
    });

    if (found) {
      return res.json({
        status: "success",
        message: "NIP berhasil diverifikasi",
        wali: found
      });
    }

    return res.status(404).json({
      status: "error",
      message: "NIP tidak ditemukan dalam daftar Wali Kelas"
    });
  });

  // GET App Config
  app.get("/api/config", (req, res) => {
    res.json(appConfig);
  });

  // POST Update App Config
  app.post("/api/config", (req, res) => {
    const { webAppUrl, autoSync } = req.body;
    if (webAppUrl !== undefined) appConfig.webAppUrl = webAppUrl;
    if (autoSync !== undefined) appConfig.autoSync = autoSync;
    appConfig.lastSyncedAt = new Date().toISOString();
    res.json({ status: "success", config: appConfig });
  });

  // POST Upload Berkas Mutasi Keluar ke Google Drive
  app.post("/api/mutasi/upload-berkas", async (req, res) => {
    try {
      const { base64Data, fileName, mimeType, folderId, nisn, nama, oldFileUrl, oldFileId } = req.body;

      if (!base64Data) {
        return res.status(400).json({
          status: "error",
          message: "Data base64 berkas tidak ditemukan"
        });
      }

      const targetFolderId = folderId || "1sGqbpA6uctgvOmYUwyxNP8pC5ORZUy56";

      // Pastikan format nama file adalah nisn_nama
      let targetFileName = fileName;
      if (!targetFileName && (nisn || nama)) {
        const cleanNisn = String(nisn || '').trim();
        const cleanNama = String(nama || '').trim().toUpperCase().replace(/[\s\W]+/g, '_');
        const ext = mimeType === 'application/pdf' ? 'pdf' : (mimeType?.includes('png') ? 'png' : 'jpg');
        targetFileName = `${cleanNisn}_${cleanNama}.${ext}`;
      }

      if (!targetFileName) {
        targetFileName = `berkas_${Date.now()}.pdf`;
      }

      const targetWebAppUrl = appConfig.webAppUrl;
      if (!targetWebAppUrl) {
        return res.status(400).json({
          status: "error",
          message: "Web App URL Google Apps Script belum dikonfigurasi pada sistem."
        });
      }

      // Kirim ke Google Apps Script Web App
      const gasPayload = {
        action: "uploadBerkasMutasi",
        target: "mutasi_keluar",
        folderId: targetFolderId,
        fileName: targetFileName,
        mimeType: mimeType || "application/pdf",
        base64Data: base64Data,
        oldFileUrl: oldFileUrl || "",
        oldFileId: oldFileId || ""
      };

      console.log(`[Upload Berkas] Mengunggah file ${targetFileName} ke Google Drive folder ${targetFolderId}...`);

      const gasRes = await sendToGas(targetWebAppUrl, gasPayload, 60000);
      const jsonRes = gasRes.json;

      if (!jsonRes) {
        throw new Error("Respons dari Google Apps Script tidak valid: " + gasRes.body.slice(0, 150));
      }

      if (jsonRes.status === "error") {
        const errMsg = String(jsonRes.message || "");
        const isPermissionError = errMsg.includes("permission to call DriveApp") || errMsg.includes("DriveApp") || errMsg.includes("auth/drive");
        return res.status(isPermissionError ? 403 : 500).json({
          status: "error",
          code: isPermissionError ? "NEED_DRIVE_PERMISSION" : "GAS_ERROR",
          message: isPermissionError
            ? "Izin Google Drive masih kurang izin Tulis (createFile). Silakan perbarui fungsi 'authorizeDrive' di Apps Script, jalankan (Run) fungsi tersebut agar muncul konfirmasi izin membuat file, lalu Deploy Versi Baru."
            : (jsonRes.message || "Gagal mengunggah berkas ke Google Drive via Google Apps Script"),
          rawError: errMsg
        });
      }

      return res.json({
        status: "success",
        message: "Berkas berhasil diunggah ke Google Drive",
        fileUrl: jsonRes.fileUrl,
        fileId: jsonRes.fileId,
        fileName: jsonRes.fileName || targetFileName,
        folderId: targetFolderId
      });
    } catch (err: any) {
      console.error("[Upload Berkas] Error:", err);
      return res.status(500).json({
        status: "error",
        message: err?.message || "Terjadi kesalahan internal saat mengunggah berkas"
      });
    }
  });

  // Save/Update Mutasi Keluar row to Google Sheets
  app.post("/api/mutasi/keluar", async (req, res) => {
    try {
      const { item, isUpdate } = req.body;
      if (!item) {
        return res.status(400).json({ status: "error", message: "Data mutasi keluar tidak disertakan" });
      }

      const targetWebAppUrl = appConfig.webAppUrl;
      if (!targetWebAppUrl) {
        return res.status(400).json({ status: "error", message: "Web App URL belum dikonfigurasi" });
      }

      const gasPayload = {
        action: isUpdate ? "updateMutasiKeluar" : "createMutasiKeluar",
        target: "mutasi_keluar",
        item: {
          no: item.no || "",
          nipd: item.nipd || "",
          nisn: item.nisn || "",
          nama: item.nama || "",
          tempat_lahir: item.tempatLahir || item.tempat_lahir || "",
          tgl_lahir: item.tglLahir || item.tgl_lahir || "",
          rombel: item.rombel || "",
          ket_mutasi: item.ketMutasi || item.ket_mutasi || "",
          pindah_ke: item.pindahKe || item.pindah_ke || "",
          tgl_mutasi: item.tglMutasi || item.tgl_mutasi || "",
          alasan_mutasi: item.alasanMutasi || item.alasan_mutasi || "",
          upload_berkas: item.uploadBerkas || item.upload_berkas || "",
          status: item.status || "Selesai",
          timestamp: item.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19)
        }
      };

      console.log(`[Mutasi Keluar Save] Mengirim data NISN ${gasPayload.item.nisn} ke Google Sheets...`);
      const gasRes = await sendToGas(targetWebAppUrl, gasPayload, 30000);
      return res.json({
        status: "success",
        message: "Data mutasi keluar berhasil disimpan ke Google Sheets (sheet: mutasi_keluar)",
        gasResult: gasRes.json || gasRes.body
      });
    } catch (err: any) {
      console.error("[Mutasi Keluar Save] Error:", err);
      return res.status(500).json({
        status: "error",
        message: err?.message || "Gagal menyimpan data mutasi keluar ke Google Sheets"
      });
    }
  });

  // DELETE Mutasi Keluar row(s) and associated Drive files
  app.post("/api/mutasi/keluar/delete", async (req, res) => {
    try {
      const { item, items } = req.body;
      const targetWebAppUrl = appConfig.webAppUrl;
      if (!targetWebAppUrl) {
        return res.status(400).json({ status: "error", message: "Web App URL belum dikonfigurasi" });
      }

      if (items && Array.isArray(items) && items.length > 0) {
        console.log(`[Mutasi Keluar Delete] Menghapus ${items.length} data mutasi keluar dan berkas terkait di Drive...`);
        const gasPayload = {
          action: "deleteMultipleMutasiKeluar",
          target: "mutasi_keluar",
          items: items.map(it => ({
            nisn: it.nisn || "",
            nipd: it.nipd || "",
            uploadBerkas: it.uploadBerkas || it.upload_berkas || it.fileUrl || "",
            nama: it.nama || ""
          }))
        };
        const gasRes = await sendToGas(targetWebAppUrl, gasPayload, 45000);
        return res.json({
          status: "success",
          message: `Berhasil menghapus ${items.length} data mutasi keluar beserta berkas terkait di Google Drive`,
          gasResult: gasRes.json || gasRes.body
        });
      } else if (item) {
        console.log(`[Mutasi Keluar Delete] Menghapus data NISN ${item.nisn} dan berkas terkait di Drive...`);
        const gasPayload = {
          action: "deleteMutasiKeluar",
          target: "mutasi_keluar",
          item: {
            nisn: item.nisn || "",
            nipd: item.nipd || "",
            uploadBerkas: item.uploadBerkas || item.upload_berkas || item.fileUrl || "",
            nama: item.nama || ""
          }
        };
        const gasRes = await sendToGas(targetWebAppUrl, gasPayload, 30000);
        return res.json({
          status: "success",
          message: `Data mutasi keluar dan berkas terkait berhasil dihapus`,
          gasResult: gasRes.json || gasRes.body
        });
      } else {
        return res.status(400).json({ status: "error", message: "Data item atau items wajib disertakan" });
      }
    } catch (err: any) {
      console.error("[Mutasi Keluar Delete] Error:", err);
      return res.status(500).json({
        status: "error",
        message: err?.message || "Gagal menghapus data mutasi keluar"
      });
    }
  });

  // DELETE Single Berkas from Google Drive
  app.post("/api/mutasi/delete-berkas", async (req, res) => {
    try {
      const { fileUrl, fileId, fileName } = req.body;
      const targetWebAppUrl = appConfig.webAppUrl;
      if (!targetWebAppUrl) {
        return res.status(400).json({ status: "error", message: "Web App URL belum dikonfigurasi" });
      }

      const gasPayload = {
        action: "deleteBerkasMutasi",
        fileUrl: fileUrl || "",
        fileId: fileId || "",
        fileName: fileName || "",
        folderId: "1sGqbpA6uctgvOmYUwyxNP8pC5ORZUy56"
      };

      const gasRes = await sendToGas(targetWebAppUrl, gasPayload, 20000);
      return res.json({
        status: "success",
        message: "Proses hapus berkas Google Drive selesai",
        gasResult: gasRes.json || gasRes.body
      });
    } catch (err: any) {
      console.error("[Delete Berkas] Error:", err);
      return res.status(500).json({
        status: "error",
        message: err?.message || "Gagal menghapus berkas di Google Drive"
      });
    }
  });

  // GET All Students
  app.get("/api/students", async (req, res) => {
    const isForce = req.query.force === 'true';

    // If force is requested, clear memory cache first
    if (isForce) {
      cachedSheetsData = null;
    }

    // If we already have cached data and no force refresh requested, return cached
    if (cachedSheetsData && cachedSheetsData.length > 0 && !isForce) {
      return res.json({
        status: "success",
        source: "google_sheets",
        total: cachedSheetsData.length,
        data: cachedSheetsData.map(normalizeStudent)
      });
    }

    // Fetch fresh data from Google Sheets
    const sheetsData = await fetchFromGoogleSheets();
    if (sheetsData && sheetsData.length > 0) {
      return res.json({
        status: "success",
        source: "google_sheets",
        total: sheetsData.length,
        data: sheetsData.map(normalizeStudent)
      });
    }

    // Fallback if cached Google Sheets data was available previously
    if (cachedSheetsData && cachedSheetsData.length > 0) {
      return res.json({
        status: "success",
        source: "google_sheets_cached",
        total: cachedSheetsData.length,
        data: cachedSheetsData.map(normalizeStudent)
      });
    }

    res.json({
      status: "success",
      source: "local",
      total: studentList.length,
      data: studentList.map(normalizeStudent)
    });
  });

  // POST Add New Student
  app.post("/api/students", async (req, res) => {
    const newStudentData = req.body;
    const rawStudent: Student = {
      id: newStudentData.id || `STU-${String(studentList.length + 1).padStart(3, '0')}`,
      nama: newStudentData.nama || 'Siswa Baru',
      kelas: newStudentData.kelas || 'X IPA 1',
      nipd: newStudentData.nipd || `2223${Math.floor(1000 + Math.random() * 9000)}`,
      nisn: newStudentData.nisn || `006${Math.floor(1000000 + Math.random() * 9000000)}`,
      jk: newStudentData.jk || 'L',
      tempatLahir: newStudentData.tempatLahir || 'Jakarta',
      tanggalLahir: newStudentData.tanggalLahir || '2007-01-01',
      agama: newStudentData.agama || 'Islam',
      alamat: newStudentData.alamat || 'Jl. Pendidikan No. 1',
      ayah: newStudentData.ayah || '-',
      pekerjaanAyah: newStudentData.pekerjaanAyah || newStudentData.kerja_ayah || '',
      ibu: newStudentData.ibu || '-',
      pekerjaanIbu: newStudentData.pekerjaanIbu || newStudentData.kerja_ibu || '',
      noHp: newStudentData.noHp || '',
      email: newStudentData.email || '',
      statusRegistrasi: newStudentData.statusRegistrasi || 'Aktif',
      tanggalMasuk: newStudentData.tanggalMasuk || new Date().toISOString().split('T')[0],
      sekolahAsal: newStudentData.sekolahAsal || '',
      tinggiBadan: newStudentData.tinggiBadan || 165,
      beratBadan: newStudentData.beratBadan || 55,
      jarakSekolah: newStudentData.jarakSekolah || '< 1 km',
      waktuTempuh: newStudentData.waktuTempuh || '10 menit',
      jumlahSaudara: newStudentData.jumlahSaudara || 1
    };

    const newStudent = normalizeStudent(rawStudent);
    studentList.unshift(newStudent);

    // If Web App URL is configured, forward create action
    if (appConfig.webAppUrl) {
      try {
        await fetch(appConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', data: newStudent })
        });
      } catch (err) {
        console.warn("Gagal meneruskan penambahan siswa ke Google Sheets Web App:", err);
      }
    }

    res.json({ status: "success", message: "Siswa berhasil ditambahkan", data: newStudent });
  });

  // POST Import / Replace Full Student Dataset (Smart Merge from Excel)
  app.post("/api/students/import", async (req, res) => {
    const { students: importedStudents } = req.body;
    if (!Array.isArray(importedStudents)) {
      return res.status(400).json({ status: "error", message: "Data siswa yang diimpor tidak valid" });
    }

    studentList = [...importedStudents];
    cachedSheetsData = [...importedStudents];
    appConfig.lastSyncedAt = new Date().toISOString();

    // Respond fast to UI
    res.json({
      status: "success",
      message: `${importedStudents.length} data siswa berhasil diimpor & disimpan`,
      total: studentList.length
    });

    // Sync to Google Apps Script in background if configured
    if (appConfig.webAppUrl && importedStudents.length > 0) {
      fetch(appConfig.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'importAll',
          students: importedStudents
        }),
        signal: AbortSignal.timeout(30000)
      })
      .then(r => r.json())
      .then(async json => {
        console.log('Google Apps Script importAll sync result:', json);
        // Fallback for older deployed Google Apps Script versions that only recognize batch_update
        if (json && json.status === 'error' && (String(json.message).includes('importAll') || String(json.message).includes('Aksi tidak dikenali'))) {
          console.log('Fallback: Mengirim data ke Google Apps Script menggunakan batch_update...');
          try {
            const fallbackRes = await fetch(appConfig.webAppUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'batch_update',
                updates: importedStudents
              }),
              signal: AbortSignal.timeout(30000)
            });
            const fallbackJson = await fallbackRes.json();
            console.log('Google Apps Script batch_update fallback sync result:', fallbackJson);
          } catch (fallbackErr: any) {
            console.warn('Fallback sync warning:', fallbackErr?.message || fallbackErr);
          }
        }
      })
      .catch(err => console.warn('Google Apps Script importAll sync warning:', err?.message || err));
    }
  });

  // PUT Batch Update Students (Fast & Reliable Sync to Google Sheets)
  app.put("/api/students/batch", async (req, res) => {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ status: "error", message: "Invalid updates format" });
    }

    const updatedStudents: Student[] = [];

    updates.forEach((u: any) => {
      const targetNisn = String(u.nisn || u.NISN || '').trim();
      const targetNipd = String(u.nipd || u.NIPD || '').trim();
      const targetId   = String(u.studentId || u.id || '').trim();
      const targetNama = String(u.nama || u.Nama || '').trim().toLowerCase();

      const index = studentList.findIndex(s =>
        (s.nisn && targetNisn && s.nisn === targetNisn) ||
        (s.nipd && targetNipd && s.nipd === targetNipd) ||
        (s.id && targetId && s.id === targetId) ||
        (targetNama && (s.nama || '').trim().toLowerCase() === targetNama)
      );
      if (index !== -1) {
        studentList[index] = {
          ...studentList[index],
          status: u.status,
          ket: u.ket !== undefined ? u.ket : ''
        };
        updatedStudents.push(studentList[index]);
      } else {
        // If not found in in-memory list, synthesize student record so it still syncs to Google Sheets
        const fallbackStudent: any = {
          id: u.studentId || u.id || u.nama,
          nama: u.nama || u.id || '',
          nisn: u.nisn || '',
          nipd: u.nipd || '',
          status: u.status,
          ket: u.ket !== undefined ? u.ket : ''
        };
        studentList.push(fallbackStudent as Student);
        updatedStudents.push(fallbackStudent as Student);
      }
    });

    if (cachedSheetsData) {
      updates.forEach((u: any) => {
        const targetNisn = String(u.nisn || u.NISN || '').trim();
        const targetNipd = String(u.nipd || u.NIPD || '').trim();
        const targetId   = String(u.studentId || u.id || '').trim();
        const targetNama = String(u.nama || u.Nama || '').trim().toLowerCase();

        const idx = cachedSheetsData!.findIndex(s =>
          (s.nisn && targetNisn && s.nisn === targetNisn) ||
          ((s as any).NISN && targetNisn && (s as any).NISN === targetNisn) ||
          (s.nipd && targetNipd && s.nipd === targetNipd) ||
          (s.id && targetId && s.id === targetId) ||
          (targetNama && (s.nama || '').trim().toLowerCase() === targetNama)
        );
        if (idx !== -1) {
          cachedSheetsData![idx] = {
            ...cachedSheetsData![idx],
            status: u.status,
            ket: u.ket !== undefined ? u.ket : ''
          };
          (cachedSheetsData![idx] as any).Status = u.status;
          (cachedSheetsData![idx] as any).Ket = u.ket !== undefined ? u.ket : '';
        }
      });
    }

    // Sync to Google Apps Script Web App (Synchronous with 25s timeout for confirmed persistence)
    let gasResult: any = null;
    let gasError: string | null = null;
    if (appConfig.webAppUrl && updatedStudents.length > 0) {
      try {
        const gasPayload = {
          action: 'batch_update',
          updates: updatedStudents.map(s => ({
            id: s.nama ? s.nama.trim() : s.id, // Critical: Deployed Apps Script checks targetId === data[i][1] (Nama)
            studentId: s.id,
            nisn: s.nisn || '',
            nipd: s.nipd || '',
            nama: s.nama || '',
            status: s.status || 'Aktif',
            ket: s.ket !== undefined ? s.ket : ''
          }))
        };

        const gasRes = await fetch(appConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(gasPayload),
          signal: AbortSignal.timeout(25000)
        });

        if (gasRes.ok) {
          gasResult = await gasRes.json().catch(() => null);
          console.log('Google Apps Script batch sync result:', gasResult);
        } else {
          gasError = `Google Apps Script returned status ${gasRes.status}`;
          console.warn('Google Apps Script sync non-OK status:', gasRes.status);
        }
      } catch (err: any) {
        console.warn('Google Apps Script batch sync warning:', err?.message || err);
        gasError = err?.message || 'Sync error';
      }
    }

    res.json({
      status: "success",
      message: `${updatedStudents.length} data siswa berhasil diperbarui`,
      count: updatedStudents.length,
      gasUpdated: gasResult?.updated ?? null,
      gasResult,
      gasError
    });
  });

  // PUT Update Single Student
  app.put("/api/students/:id", (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const index = studentList.findIndex(s => s.id === id || s.nipd === id);

    if (index === -1) {
      return res.status(404).json({ status: "error", message: "Data siswa tidak ditemukan" });
    }

    studentList[index] = normalizeStudent({ ...studentList[index], ...updatedData });

    if (cachedSheetsData) {
      const cIdx = cachedSheetsData.findIndex(s => s.id === id || s.nipd === id);
      if (cIdx !== -1) {
        cachedSheetsData[cIdx] = normalizeStudent({ ...cachedSheetsData[cIdx], ...updatedData });
      }
    }

    res.json({ status: "success", message: "Data siswa berhasil diperbarui", data: studentList[index] });

    if (appConfig.webAppUrl) {
      fetch(appConfig.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', data: studentList[index] }),
        signal: AbortSignal.timeout(15000)
      }).catch(err => console.warn("Gagal meneruskan pembaruan siswa ke Google Sheets Web App:", err));
    }
  });

  // DELETE Student
  app.delete("/api/students/:id", async (req, res) => {
    const { id } = req.params;
    const index = studentList.findIndex(s => s.id === id || s.nipd === id);

    if (index === -1) {
      return res.status(404).json({ status: "error", message: "Data siswa tidak ditemukan" });
    }

    const removedStudent = studentList.splice(index, 1)[0];

    if (appConfig.webAppUrl) {
      try {
        await fetch(appConfig.webAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: removedStudent.id, nipd: removedStudent.nipd })
        });
      } catch (err) {
        console.warn("Gagal meneruskan penghapusan siswa ke Google Sheets Web App:", err);
      }
    }

    res.json({ status: "success", message: "Data siswa berhasil dihapus" });
  });

  // GET Attendance Records
  app.get("/api/attendance", (req, res) => {
    res.json({ status: "success", data: attendanceList });
  });

  // POST Attendance Update
  app.post("/api/attendance", (req, res) => {
    const { records } = req.body; // Array of AttendanceRecord
    if (Array.isArray(records)) {
      records.forEach(rec => {
        const existingIdx = attendanceList.findIndex(a => a.studentId === rec.studentId && a.tanggal === rec.tanggal);
        if (existingIdx !== -1) {
          attendanceList[existingIdx] = { ...attendanceList[existingIdx], status: rec.status, catatan: rec.catatan };
        } else {
          attendanceList.push({
            id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            studentId: rec.studentId,
            tanggal: rec.tanggal || new Date().toISOString().split('T')[0],
            status: rec.status,
            catatan: rec.catatan || ''
          });
        }
      });
    }
    res.json({ status: "success", message: "Presensi berhasil diperbarui", data: attendanceList });
  });

  // Explicit static file serving for /public folder
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware setup for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Data Siswa aktif di http://0.0.0.0:${PORT}`);
    // Prefetch data from Google Sheets in background sequentially
    setTimeout(async () => {
      try {
        await fetchFromGoogleSheets();
      } catch {}
      try {
        await fetchWaliKelasFromGoogleSheets();
      } catch {}
      try {
        await fetchJurusanFromGoogleSheets();
      } catch {}
    }, 1000);
  });
}

startServer();
