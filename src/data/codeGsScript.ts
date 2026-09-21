export const SPREADSHEET_ID = "1t_i5_kMDb00AT2uL0Km49_37CHJB2RWUv3tZjVgLlAk";
export const SHEET_NAME = "data";
export const SHEET_NAME_GTK = "gtk";
export const SHEET_NAME_NAIKPANGKAT = "naikpangkat";
export const SHEET_NAME_KGB = "kgb";
export const SHEET_NAME_MUTASI_MASUK = "mutasi_masuk";
export const SHEET_NAME_MUTASI_KELUAR = "mutasi_keluar";

export const GTK_OFFICIAL_HEADERS = [
  "No", "Nama", "NUPTK", "JK", "Tempat Lahir", "Tanggal Lahir", "NIP", "Status Kepegawaian",
  "Jenis PTK", "Agama", "Alamat Jalan", "RT", "RW", "Nama Dusun", "Desa/Kelurahan", "Kecamatan",
  "Kode Pos", "Telepon", "HP", "Email", "Tugas Tambahan", "SK CPNS", "Tanggal CPNS",
  "SK Pengangkatan", "TMT Pengangkatan", "Lembaga Pengangkatan", "Pangkat Golongan", "Sumber Gaji",
  "Nama Ibu Kandung", "Status Perkawinan", "Nama Suami/Istri", "NIP Suami/Istri", "Pekerjaan Suami/Istri",
  "TMT PNS", "Sudah Lisensi Kepala Sekolah", "Pernah Diklat Kepengawasan", "Keahlian Braille",
  "Keahlian Bahasa Isyarat", "NPWP", "Nama Wajib Pajak", "Kewarganegaraan", "Bank",
  "Nomor Rekening Bank", "Rekening Atas Nama", "NIK", "No KK", "Karpeg", "Karis/Karsu",
  "Lintang", "Bujur", "NUKS", "status_login", "akses_menu"
];

export const NAIKPANGKAT_OFFICIAL_HEADERS = [
  "No", "nip", "nama", "gol", "no_sk", "tgl_sk", "tmt", "masa_kerja_thn", "masa_kerja_bln", "timestamp", "status"
];

export const KGB_OFFICIAL_HEADERS = [
  "No", "nip", "nama", "gol", "no_sk", "tgl_sk", "TMT_kgb", "masa_kerja_tahun", "masa_kerja_bln", "gaji_pokok", "timestamp", "status"
];

export const MUTASI_MASUK_OFFICIAL_HEADERS = [
  "No", "NISN", "Nama_Siswa", "Provinsi", "Kab_kota", "Kecamatan", "Nama_Sekolah", "Rombel_Tujuan", "Status", "Timestamp"
];

export const MUTASI_KELUAR_OFFICIAL_HEADERS = [
  "No", "NIPD", "NISN", "Nama", "Tempat_Lahir", "tgl_Lahir", "Rombel", "Ket_Mutasi", "Pindah_Ke", "tgl_mutasi", "alasan_mutasi", "upload_berkas", "Status", "Timestamp"
];

export const DRIVE_FOLDER_ID_MUTASI_KELUAR = "1sGqbpA6uctgvOmYUwyxNP8pC5ORZUy56";

export const CODE_GS_SCRIPT = `/**
 * ==============================================================================
 * SCRIPT GOOGLE APPS SCRIPT (code.gs) - APLIKASI DAPODIK & GTK SMKN 1 PALOPO
 * Spreadsheet ID : 1t_i5_kMDb00AT2uL0Km49_37CHJB2RWUv3tZjVgLlAk
 * Sheet 1: data         (Data Siswa / Peserta Didik)
 * Sheet 2: gtk          (Guru dan Tenaga Kependidikan)
 * Sheet 3: naikpangkat  (Riwayat Kenaikan Pangkat GTK)
 * Sheet 4: kgb          (Riwayat Kenaikan Gaji Berkala GTK)
 * 
 * ATURAN PENYIMPANAN:
 * - Semua data disimpan dengan tipe TEXT (Plain Text / Format "@")
 * - Semua tanggal disimpan dalam format strictly: dd/MM/yyyy (hh/mm/yyyy)
 * ==============================================================================
 */

const SPREADSHEET_ID = "1t_i5_kMDb00AT2uL0Km49_37CHJB2RWUv3tZjVgLlAk";
const SHEET_NAME_STUDENTS = "data";
const SHEET_NAME_GTK = "gtk";
const SHEET_NAME_NAIKPANGKAT = "naikpangkat";
const SHEET_NAME_KGB = "kgb";
const SHEET_NAME_MUTASI_MASUK = "mutasi_masuk";
const SHEET_NAME_MUTASI_KELUAR = "mutasi_keluar";
const DRIVE_FOLDER_ID_MUTASI = "1sGqbpA6uctgvOmYUwyxNP8pC5ORZUy56";

/**
 * ==============================================================================
 * AKTIVASI IZIN GOOGLE DRIVE (LAKUKAN 1 KALI AGAR UPLOAD BERKAS BISA DISIMPAN):
 * 1. Di toolbar atas editor Apps Script (sebelah Debug), pilih fungsi "authorizeDrive"
 * 2. Klik tombol "Jalankan" (Run)
 * 3. Muncul popup "Izin Diperlukan" -> Klik "Tinjau Izin" -> Pilih akun Google Anda
 * 4. Klik tulisan "Lanjutan" (Advanced) di kiri bawah -> Klik "Buka ... (tidak aman)" -> Klik "Izinkan"
 *    (Pastikan Anda mengizinkan akses penuh: melihat, mengedit, membuat file di Google Drive)
 * 5. WAJIB: Setelah selesai diizinkan, terapkan versi baru Web App:
 *    -> Klik tombol biru "Terapkan" (Deploy) di pojok kanan atas
 *    -> Pilih "Kelola penerapan" (Manage deployments)
 *    -> Klik ikon Pensil (Edit) pada penerapan aktif
 *    -> Ubah Versi menjadi: "Versi Baru" (New version)
 *    -> Klik "Terapkan" (Deploy)
 * ==============================================================================
 */
function authorizeDrive() {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID_MUTASI);
    // PENTING: createFile memicu Google Apps Script meminta izin TULIS (https://www.googleapis.com/auth/drive)
    const testFile = folder.createFile("test_permission_aktivasi.txt", "Aktivasi izin upload berkas mutasi berhasil.");
    testFile.setTrashed(true); // Langsung buang ke sampah agar folder tetap bersih
    Logger.log("BERHASIL LENGKAP! Izin BACA & TULIS Google Drive telah aktif untuk folder: " + folder.getName());
    return "BERHASIL LENGKAP! Izin BACA & TULIS Google Drive telah aktif untuk folder: " + folder.getName();
  } catch (err) {
    Logger.log("Error aktivasi Drive: " + err.message);
    throw err;
  }
}

// Helper konversi tanggal ke format teks dd/MM/yyyy (hh/mm/yyyy)
function formatToDDMMYYYY(val) {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy");
  }
  var str = String(val).trim();
  if (!str || str === "-" || str === "null" || str === "undefined") return "";

  // Pola YYYY-MM-DD
  var ymdMatch = str.match(/^(\\d{4})[\\/\\-](\\d{1,2})[\\/\\-](\\d{1,2})/);
  if (ymdMatch) {
    var y = ymdMatch[1];
    var m = ("0" + ymdMatch[2]).slice(-2);
    var d = ("0" + ymdMatch[3]).slice(-2);
    return d + "/" + m + "/" + y;
  }

  // Pola D/M/YYYY -> normalisasi ke DD/MM/YYYY
  var dmyMatch = str.match(/^(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{4})/);
  if (dmyMatch) {
    var d2 = ("0" + dmyMatch[1]).slice(-2);
    var m2 = ("0" + dmyMatch[2]).slice(-2);
    var y2 = dmyMatch[3];
    return d2 + "/" + m2 + "/" + y2;
  }

  return str;
}

// List Header Resmi Siswa
const OFFICIAL_STUDENT_HEADERS = [
  "Nama", "NIPD", "JK", "NISN", "t_lahir", "tgl_lahir", "NIK", "Agama", "Alamat",
  "RT", "RW", "Dusun", "Kelurahan", "Kecamatan", "kode_pos", "jenis_tinggal", "transportaso",
  "Telepon", "HP", "email", "SKHUN", "kps", "no_kps", "nama_ayah", "thn_lahir_ayah",
  "pend_ayah", "kerja_ayah", "pengh_ayah", "nik_ayah", "nama_ibu", "thn_lahir_ibu",
  "pend_ibu", "kerja_ibu", "pengh_ibu", "nik_ibu", "namawali", "thnwali", "pendwali",
  "pekwali", "pengwali", "nikwali", "rombel", "no_ujian", "no_ijazah", "kip", "no_kip",
  "nama_kip", "no_kks", "reg_akta", "Bank", "no_rek", "rek_nama", "layak_pip", "alasan",
  "keb_khusus", "sekolah_asal", "anak_ke", "Lintang", "Bujur", "no_kk", "berat_badan",
  "tinggi_badan", "lingkar_kepala", "jum_saudara", "jarak_sekolah", "status", "ket"
];

// List Header Resmi GTK
const OFFICIAL_GTK_HEADERS = [
  "No", "Nama", "NUPTK", "JK", "Tempat Lahir", "Tanggal Lahir", "NIP", "Status Kepegawaian",
  "Jenis PTK", "Agama", "Alamat Jalan", "RT", "RW", "Nama Dusun", "Desa/Kelurahan", "Kecamatan",
  "Kode Pos", "Telepon", "HP", "Email", "Tugas Tambahan", "SK CPNS", "Tanggal CPNS",
  "SK Pengangkatan", "TMT Pengangkatan", "Lembaga Pengangkatan", "Pangkat Golongan", "Sumber Gaji",
  "Nama Ibu Kandung", "Status Perkawinan", "Nama Suami/Istri", "NIP Suami/Istri", "Pekerjaan Suami/Istri",
  "TMT PNS", "Sudah Lisensi Kepala Sekolah", "Pernah Diklat Kepengawasan", "Keahlian Braille",
  "Keahlian Bahasa Isyarat", "NPWP", "Nama Wajib Pajak", "Kewarganegaraan", "Bank",
  "Nomor Rekening Bank", "Rekening Atas Nama", "NIK", "No KK", "Karpeg", "Karis/Karsu",
  "Lintang", "Bujur", "NUKS", "status_login", "akses_menu"
];

// List Header Resmi Naik Pangkat
const OFFICIAL_NAIKPANGKAT_HEADERS = [
  "No", "nip", "nama", "gol", "no_sk", "tgl_sk", "tmt", "masa_kerja_thn", "masa_kerja_bln", "timestamp", "status"
];

// List Header Resmi KGB
const OFFICIAL_KGB_HEADERS = [
  "No", "nip", "nama", "gol", "no_sk", "tgl_sk", "TMT_kgb", "masa_kerja_tahun", "masa_kerja_bln", "gaji_pokok", "timestamp", "status"
];

// List Header Resmi Mutasi Masuk
const OFFICIAL_MUTASI_MASUK_HEADERS = [
  "No", "NISN", "Nama_Siswa", "Provinsi", "Kab_kota", "Kecamatan", "Nama_Sekolah", "Rombel_Tujuan", "Tgl_Masuk", "Status", "Timestamp"
];

// List Header Resmi Mutasi Keluar
const OFFICIAL_MUTASI_KELUAR_HEADERS = [
  "No", "NIPD", "NISN", "Nama", "Tempat_Lahir", "tgl_Lahir", "Rombel", "Ket_Mutasi", "Pindah_Ke", "tgl_mutasi", "alasan_mutasi", "upload_berkas", "Status", "Timestamp"
];

function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function getStudentSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME_STUDENTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_STUDENTS);
    sheet.appendRow(OFFICIAL_STUDENT_HEADERS);
    sheet.getRange(1, 1, 1, OFFICIAL_STUDENT_HEADERS.length).setFontWeight("bold").setBackground("#e0f2fe");
  }
  return sheet;
}

function getGtkSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME_GTK);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_GTK);
    sheet.appendRow(OFFICIAL_GTK_HEADERS);
    sheet.getRange(1, 1, 1, OFFICIAL_GTK_HEADERS.length).setFontWeight("bold").setBackground("#dcfce7");
  }
  return sheet;
}

function getNaikPangkatSheet() {
  const ss = getSpreadsheet();
  const allSheets = ss.getSheets();
  let sheet = allSheets.find(s => {
    const name = s.getName().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return name === "naikpangkat" || name === "pangkat" || name === "riwayatpangkat" || name === "kepangkatan";
  });
  if (!sheet) {
    sheet = ss.getSheetByName(SHEET_NAME_NAIKPANGKAT);
  }
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_NAIKPANGKAT);
    sheet.appendRow(OFFICIAL_NAIKPANGKAT_HEADERS);
    sheet.getRange(1, 1, 1, OFFICIAL_NAIKPANGKAT_HEADERS.length).setFontWeight("bold").setBackground("#e0e7ff");
  }
  return sheet;
}

function getKgbSheet() {
  const ss = getSpreadsheet();
  const allSheets = ss.getSheets();
  let sheet = allSheets.find(s => {
    const name = s.getName().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return name === "kgb" || name === "riwayatkgb" || name === "gajiberkala" || name === "gajipokok";
  });
  if (!sheet) {
    sheet = ss.getSheetByName(SHEET_NAME_KGB);
  }
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_KGB);
    sheet.appendRow(OFFICIAL_KGB_HEADERS);
    sheet.getRange(1, 1, 1, OFFICIAL_KGB_HEADERS.length).setFontWeight("bold").setBackground("#ccfbf1");
  }
  return sheet;
}

function getMutasiMasukSheet() {
  const ss = getSpreadsheet();
  const allSheets = ss.getSheets();
  let sheet = allSheets.find(s => {
    const name = s.getName().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return name === "mutasimasuk" || name === "mutasi";
  });
  if (!sheet) {
    sheet = ss.getSheetByName(SHEET_NAME_MUTASI_MASUK);
  }
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_MUTASI_MASUK);
    sheet.appendRow(OFFICIAL_MUTASI_MASUK_HEADERS);
    sheet.getRange(1, 1, 1, OFFICIAL_MUTASI_MASUK_HEADERS.length).setFontWeight("bold").setBackground("#d1fae5");
  }
  return sheet;
}

function getMutasiKeluarSheet() {
  const ss = getSpreadsheet();
  const allSheets = ss.getSheets();
  let sheet = allSheets.find(s => {
    const name = s.getName().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return name === "mutasikeluar" || name === "mutasikeluarsiswa";
  });
  if (!sheet) {
    sheet = ss.getSheetByName(SHEET_NAME_MUTASI_KELUAR);
  }
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME_MUTASI_KELUAR);
    sheet.appendRow(OFFICIAL_MUTASI_KELUAR_HEADERS);
    sheet.getRange(1, 1, 1, OFFICIAL_MUTASI_KELUAR_HEADERS.length).setFontWeight("bold").setBackground("#ffe4e6");
  }
  return sheet;
}

/**
 * Endpoint HTTP GET: Membaca data siswa, GTK, naikpangkat, kgb, atau mutasi_masuk
 * Parameter ?sheet=data | gtk | naikpangkat | kgb | mutasi_masuk
 */
function doGet(e) {
  try {
    const rawTarget = (e && e.parameter && e.parameter.sheet) ? String(e.parameter.sheet).toLowerCase() : "data";
    
    // 1. DATA GTK
    if (rawTarget === "gtk") {
      const sheet = getGtkSheet();
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return responseJSON({ status: "success", target: "gtk", total: 0, data: [] });
      }
      const headers = data[0].map(h => String(h).trim());
      const rows = data.slice(1);
      const gtkList = rows.map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, colIdx) => {
          let val = row[colIdx];
          if (val instanceof Date) {
            val = formatToDDMMYYYY(val);
          }
          const strVal = val !== undefined && val !== null ? String(val).trim() : "";
          obj[header] = strVal;
          const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          obj[hClean] = strVal;

          if (hClean === "nama") obj["nama"] = strVal;
          if (hClean === "nuptk") obj["nuptk"] = strVal;
          if (hClean === "nip") obj["nip"] = strVal;
          if (hClean === "jk") obj["jk"] = strVal;
          if (hClean === "statuskepegawaian") obj["statusKepegawaian"] = strVal;
          if (hClean === "jenisptk") obj["jenisPtk"] = strVal;
          if (hClean === "tugastambahan") obj["tugasTambahan"] = strVal;
          if (hClean === "pangkatgolongan") obj["pangkatGolongan"] = strVal;
          if (hClean === "nik") obj["nik"] = strVal;
          if (hClean === "hp" || hClean === "telepon") obj["hp"] = strVal;
          if (hClean === "email") obj["email"] = strVal;
          if (hClean === "tempatlahir") obj["tempatLahir"] = strVal;
          if (hClean === "tanggallahir") obj["tanggalLahir"] = formatToDDMMYYYY(strVal);
          if (hClean === "statuslogin" || hClean === "status_login" || hClean === "role") {
            obj["status_login"] = strVal;
            obj["statusLogin"] = strVal;
          }
          if (
            hClean === "aksesmenu" ||
            hClean === "akses_menu" ||
            hClean === "statusmenu" ||
            hClean === "status_menu" ||
            hClean === "hakakses" ||
            hClean === "hak_akses" ||
            hClean === "menuakses" ||
            hClean === "menu_akses" ||
            hClean === "izinmenu" ||
            hClean === "izin_menu" ||
            hClean === "akses" ||
            hClean === "menu"
          ) {
            obj["akses_menu"] = strVal;
            obj["aksesMenu"] = strVal;
            obj["status_menu"] = strVal;
            obj["statusMenu"] = strVal;
            obj["hak_akses"] = strVal;
            obj["hakAkses"] = strVal;
          }
        });
        if (!obj.id) {
          obj.id = obj.nip && obj.nip !== "-" ? obj.nip : (obj.nuptk && obj.nuptk !== "-" ? obj.nuptk : "GTK-" + String(index + 1).padStart(3, '0'));
        }
        return obj;
      });

      return responseJSON({
        status: "success",
        target: "gtk",
        total: gtkList.length,
        data: gtkList,
        timestamp: new Date().toISOString()
      });
    }

    // 2. DATA NAIKPANGKAT / PANGKAT
    if (rawTarget === "naikpangkat" || rawTarget === "pangkat") {
      const sheet = getNaikPangkatSheet();
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return responseJSON({ status: "success", target: "naikpangkat", total: 0, data: [] });
      }
      const headers = data[0].map(h => String(h).trim());
      const rows = data.slice(1);
      const pangkatList = rows.map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, colIdx) => {
          let val = row[colIdx];
          if (val instanceof Date) {
            val = formatToDDMMYYYY(val);
          }
          const strVal = val !== undefined && val !== null ? String(val).trim() : "";
          obj[header] = strVal;
          const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          obj[hClean] = strVal;

          if (hClean === "no") obj["no"] = strVal;
          if (hClean === "nip") obj["nip"] = strVal;
          if (hClean === "nama") obj["nama"] = strVal;
          if (hClean === "gol" || hClean === "golongan") obj["gol"] = strVal;
          if (hClean === "nosk") obj["noSk"] = strVal;
          if (hClean === "tglsk") obj["tglSk"] = formatToDDMMYYYY(strVal);
          if (hClean === "tmt") obj["tmt"] = formatToDDMMYYYY(strVal);
          if (hClean === "masakerjathn" || hClean === "masakerjatahun") obj["masaKerjaThn"] = Number(strVal) || 0;
          if (hClean === "masakerjabln" || hClean === "masakerjabulan") obj["masaKerjaBln"] = Number(strVal) || 0;
          if (hClean === "timestamp") obj["timestamp"] = strVal;
          if (hClean === "status") obj["status"] = strVal;
        });
        obj.id = obj.id || "PANGKAT-" + (obj.nip ? obj.nip + "-" : "") + (index + 1);
        return obj;
      });

      return responseJSON({
        status: "success",
        target: "naikpangkat",
        total: pangkatList.length,
        data: pangkatList,
        timestamp: new Date().toISOString()
      });
    }

    // 3. DATA KGB
    if (rawTarget === "kgb") {
      const sheet = getKgbSheet();
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return responseJSON({ status: "success", target: "kgb", total: 0, data: [] });
      }
      const headers = data[0].map(h => String(h).trim());
      const rows = data.slice(1);
      const kgbList = rows.map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, colIdx) => {
          let val = row[colIdx];
          if (val instanceof Date) {
            val = formatToDDMMYYYY(val);
          }
          const strVal = val !== undefined && val !== null ? String(val).trim() : "";
          obj[header] = strVal;
          const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          obj[hClean] = strVal;

          if (hClean === "no") obj["no"] = strVal;
          if (hClean === "nip") obj["nip"] = strVal;
          if (hClean === "nama") obj["nama"] = strVal;
          if (hClean === "gol" || hClean === "golongan") obj["gol"] = strVal;
          if (hClean === "nosk") obj["noSk"] = strVal;
          if (hClean === "tglsk") obj["tglSk"] = formatToDDMMYYYY(strVal);
          if (hClean === "tmtkgb" || hClean === "tmt") obj["tmt"] = formatToDDMMYYYY(strVal);
          if (hClean === "masakerjatahun" || hClean === "masakerjathn") obj["masaKerjaThn"] = Number(strVal) || 0;
          if (hClean === "masakerjabln" || hClean === "masakerjabulan") obj["masaKerjaBln"] = Number(strVal) || 0;
          if (hClean === "gajipokok" || hClean === "gaji") {
            const cleanNum = String(strVal).replace(/[^0-9]/g, '');
            obj["gajiPokok"] = Number(cleanNum) || 0;
          }
          if (hClean === "timestamp") obj["timestamp"] = strVal;
          if (hClean === "status") obj["status"] = strVal;
        });
        obj.id = obj.id || "KGB-" + (obj.nip ? obj.nip + "-" : "") + (index + 1);
        return obj;
      });

      return responseJSON({
        status: "success",
        target: "kgb",
        total: kgbList.length,
        data: kgbList,
        timestamp: new Date().toISOString()
      });
    }

    // 4. DATA MUTASI MASUK
    if (rawTarget === "mutasi_masuk" || rawTarget === "mutasimasuk" || rawTarget === "mutasi") {
      const sheet = getMutasiMasukSheet();
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return responseJSON({ status: "success", target: "mutasi_masuk", total: 0, data: [] });
      }
      const headers = data[0].map(h => String(h).trim());
      const rows = data.slice(1);
      const list = rows.map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, colIdx) => {
          let val = row[colIdx];
          if (val instanceof Date) {
            val = formatToDDMMYYYY(val);
          }
          const strVal = val !== undefined && val !== null ? String(val).trim() : "";
          obj[header] = strVal;
          const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          obj[hClean] = strVal;

          if (hClean === "no") obj["no"] = Number(strVal) || (index + 1);
          if (hClean === "nisn") obj["nisn"] = strVal;
          if (hClean === "namasiswa" || hClean === "nama") obj["nama"] = strVal;
          if (hClean === "provinsi") obj["provinsiNama"] = strVal;
          if (hClean === "kabkota" || hClean === "kabupatenkota") obj["kabKotaNama"] = strVal;
          if (hClean === "kecamatan") obj["kecamatanNama"] = strVal;
          if (hClean === "namasekolah" || hClean === "sekolahasal") obj["sekolahAsal"] = strVal;
          if (hClean === "rombeltujuan" || hClean === "rombel") obj["rombelTujuan"] = strVal;
          if (hClean === "status") {
            obj["status"] = (strVal.toLowerCase() === "diterima") ? "Diterima" : "Pending";
          }
          if (hClean === "timestamp") obj["timestamp"] = strVal;
          if (hClean === "tglmasuk" || hClean === "tanggalmasuk") obj["tglMasuk"] = strVal;
        });
        obj.id = obj.id || "MUT-IN-" + (obj.nisn ? obj.nisn : String(index + 1));
        if (!obj.status) obj.status = "Pending";
        const dateOnlyStr = obj.tglMasuk ? formatToDDMMYYYY(obj.tglMasuk) : formatToDDMMYYYY(obj.timestamp || "");
        obj.tglMasuk = dateOnlyStr;
        obj.tanggalPengajuan = dateOnlyStr;
        return obj;
      });

      return responseJSON({
        status: "success",
        target: "mutasi_masuk",
        total: list.length,
        data: list,
        timestamp: new Date().toISOString()
      });
    }

    // 5. DATA MUTASI KELUAR
    if (rawTarget === "mutasi_keluar" || rawTarget === "mutasikeluar") {
      const sheet = getMutasiKeluarSheet();
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        return responseJSON({ status: "success", target: "mutasi_keluar", total: 0, data: [] });
      }
      const headers = data[0].map(h => String(h).trim());
      const rows = data.slice(1);
      const list = rows.map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, colIdx) => {
          let val = row[colIdx];
          if (val instanceof Date) {
            val = formatToDDMMYYYY(val);
          }
          const strVal = val !== undefined && val !== null ? String(val).trim() : "";
          obj[header] = strVal;
          const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
          obj[hClean] = strVal;

          if (hClean === "no") obj["no"] = Number(strVal) || (index + 1);
          if (hClean === "nipd") obj["nipd"] = strVal;
          if (hClean === "nisn") obj["nisn"] = strVal;
          if (hClean === "nama" || hClean === "namasiswa") obj["nama"] = strVal;
          if (hClean === "tempatlahir") obj["tempatLahir"] = strVal;
          if (hClean === "tgllahir" || hClean === "tanggallahir") obj["tglLahir"] = formatToDDMMYYYY(strVal);
          if (hClean === "rombel" || hClean === "kelas") obj["rombel"] = strVal;
          if (hClean === "ketmutasi" || hClean === "keteranganmutasi") obj["ketMutasi"] = strVal;
          if (hClean === "pindahke" || hClean === "sekolatujuan" || hClean === "tujuan") obj["pindahKe"] = strVal;
          if (hClean === "tglmutasi" || hClean === "tanggalmutasi") obj["tglMutasi"] = formatToDDMMYYYY(strVal);
          if (hClean === "alasanmutasi" || hClean === "alasan") obj["alasanMutasi"] = strVal;
          if (hClean === "uploadberkas" || hClean === "berkas" || hClean === "file") obj["uploadBerkas"] = strVal;
          if (hClean === "status") obj["status"] = strVal;
          if (hClean === "timestamp") obj["timestamp"] = strVal;
        });
        obj.id = obj.id || "MUT-OUT-" + (obj.nisn ? obj.nisn : (obj.nipd ? obj.nipd : String(index + 1)));
        if (!obj.status) obj.status = "Selesai";
        return obj;
      });

      return responseJSON({
        status: "success",
        target: "mutasi_keluar",
        total: list.length,
        data: list,
        timestamp: new Date().toISOString()
      });
    }

    // 4. Default: DATA SISWA
    const sheet = getStudentSheet();
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return responseJSON({ status: "success", target: "data", total: 0, data: [] });
    }

    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1);
    const students = rows.map((row, index) => {
      const obj = { rowIndex: index + 2 };
      headers.forEach((header, colIdx) => {
        let val = row[colIdx];
        if (val instanceof Date) {
          val = formatToDDMMYYYY(val);
        }
        const strVal = val !== undefined && val !== null ? String(val).trim() : "";
        obj[header] = strVal;
        const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        obj[hClean] = strVal;

        if (hClean === "nama") obj["nama"] = strVal;
        if (hClean === "nisn") obj["nisn"] = strVal;
        if (hClean === "nipd") obj["nipd"] = strVal;
        if (hClean === "jk") obj["jk"] = strVal;
        if (hClean === "rombel" || hClean === "kelas") obj["kelas"] = strVal;
        if (hClean === "status") obj["status"] = strVal;
        if (hClean === "ket" || hClean === "keterangan") obj["ket"] = strVal;
        if (hClean === "tlahir" || hClean === "tempatlahir") obj["tempatLahir"] = strVal;
        if (hClean === "tgllahir" || hClean === "tanggallahir") obj["tanggalLahir"] = formatToDDMMYYYY(strVal);
        if (hClean === "agama") obj["agama"] = strVal;
        if (hClean === "alamat") obj["alamat"] = strVal;
        if (hClean === "namaayah" || hClean === "ayah" || hClean === "nmayah") {
          obj["ayah"] = strVal;
          obj["nama_ayah"] = strVal;
        }
        if (hClean === "kerjaayah" || hClean === "kerja_ayah" || hClean === "pekerjaanayah" || hClean === "pkrjayah" || hClean === "pekayah") {
          obj["pekerjaanAyah"] = strVal;
          obj["kerja_ayah"] = strVal;
        }
        if (hClean === "namaibu" || hClean === "ibu" || hClean === "nmibu") {
          obj["ibu"] = strVal;
          obj["nama_ibu"] = strVal;
        }
        if (hClean === "kerjaibu" || hClean === "kerja_ibu" || hClean === "pekerjaanibu" || hClean === "pkrjibu" || hClean === "pekibu") {
          obj["pekerjaanIbu"] = strVal;
          obj["kerja_ibu"] = strVal;
        }
        if (hClean === "hp" || hClean === "telepon" || hClean === "nohp") obj["noHp"] = strVal;
        if (hClean === "email") obj["email"] = strVal;
        if (hClean === "sekolahasal") obj["sekolahAsal"] = strVal;
      });

      if (!obj.id) {
        obj.id = obj.nisn ? obj.nisn : (obj.nipd ? obj.nipd : "STU-" + String(index + 1).padStart(3, '0'));
      }
      return obj;
    });

    return responseJSON({
      status: "success",
      target: "data",
      total: students.length,
      data: students,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return responseJSON({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Endpoint HTTP POST: Tambah, Update, Import Data
 * Menyimpan semua nilai sebagai Teks (Format Plain Text "@") dan Tanggal dd/MM/yyyy
 */
function doPost(e) {
  try {
    let contents;
    if (e.postData && e.postData.contents) {
      contents = JSON.parse(e.postData.contents);
    } else {
      contents = e.parameter;
    }

    const action = contents.action || "update";

    // -1. UPLOAD BERKAS KE GOOGLE DRIVE (MUTASI KELUAR / BERKAS PENDUKUNG)
    if (action === "uploadBerkasMutasi" || action === "uploadBerkas" || action === "uploadFile" || action === "upload") {
      const folderId = contents.folderId || "1sGqbpA6uctgvOmYUwyxNP8pC5ORZUy56";
      const fileName = contents.fileName || ("berkas_" + Date.now());
      const mimeType = contents.mimeType || "application/pdf";
      const base64Data = contents.base64Data || contents.data || contents.fileData || "";
      const oldFileUrl = contents.oldFileUrl || contents.oldUrl || "";
      const oldFileId = contents.oldFileId || "";

      if (!base64Data) {
        return responseJSON({ status: "error", message: "Data base64 berkas tidak ditemukan" });
      }

      try {
        const folder = DriveApp.getFolderById(folderId);

        // 1. Jika ada berkas lama saat edit data, buang berkas lama ke sampah agar tidak ada duplikasi
        if (oldFileId) {
          try {
            const oldFile = DriveApp.getFileById(oldFileId);
            oldFile.setTrashed(true);
            Logger.log("Berkas lama by ID berhasil dihapus: " + oldFileId);
          } catch (eOldId) {
            Logger.log("Info hapus oldFileId: " + eOldId.message);
          }
        }
        if (oldFileUrl) {
          const matchOld = String(oldFileUrl).match(/[-\w]{25,}/);
          if (matchOld) {
            try {
              const oldFile = DriveApp.getFileById(matchOld[0]);
              oldFile.setTrashed(true);
              Logger.log("Berkas lama by URL berhasil dihapus: " + matchOld[0]);
            } catch (eOldUrl) {
              Logger.log("Info hapus oldFileUrl: " + eOldUrl.message);
            }
          }
        }

        // 2. Bersihkan file yang memiliki nama sama persis di folder tersebut agar tidak ganda
        try {
          const dupFiles = folder.getFilesByName(fileName);
          while (dupFiles.hasNext()) {
            const df = dupFiles.next();
            df.setTrashed(true);
            Logger.log("File duplikat " + fileName + " (" + df.getId() + ") dibersihkan.");
          }
        } catch (eDup) {
          Logger.log("Info pembersihan file duplikat: " + eDup.message);
        }

        const decoded = Utilities.base64Decode(base64Data);
        const blob = Utilities.newBlob(decoded, mimeType, fileName);
        const createdFile = folder.createFile(blob);

        try {
          createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (eShare) {
          // Abaikan jika restricted oleh policy domain organisasi
        }

        const fileId = createdFile.getId();
        const fileUrl = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";

        return responseJSON({
          status: "success",
          message: "Berkas berhasil diupload ke Google Drive (file lama diganti)",
          fileUrl: fileUrl,
          fileId: fileId,
          fileName: fileName,
          folderId: folderId
        });
      } catch (errDrive) {
        return responseJSON({
          status: "error",
          message: "Gagal mengunggah ke Google Drive: " + errDrive.toString()
        });
      }
    }

    // -2. HAPUS BERKAS DARI GOOGLE DRIVE
    if (action === "deleteBerkasMutasi" || action === "deleteFile" || action === "deleteDriveFile") {
      const fileUrl = contents.fileUrl || contents.uploadBerkas || contents.url || "";
      const fileId = contents.fileId || contents.id || "";
      const fileName = contents.fileName || "";
      const folderId = contents.folderId || "1sGqbpA6uctgvOmYUwyxNP8pC5ORZUy56";
      let deleted = false;

      if (fileId) {
        try {
          DriveApp.getFileById(fileId).setTrashed(true);
          deleted = true;
        } catch (e) {
          Logger.log("Delete fileId error: " + e.message);
        }
      }

      if (!deleted && fileUrl) {
        const match = String(fileUrl).match(/[-\w]{25,}/);
        if (match) {
          try {
            DriveApp.getFileById(match[0]).setTrashed(true);
            deleted = true;
          } catch (e) {
            Logger.log("Delete fileUrl error: " + e.message);
          }
        }
      }

      if (fileName) {
        try {
          const folder = DriveApp.getFolderById(folderId);
          const files = folder.getFilesByName(fileName);
          while (files.hasNext()) {
            files.next().setTrashed(true);
            deleted = true;
          }
        } catch (e) {
          Logger.log("Delete fileName error: " + e.message);
        }
      }

      return responseJSON({
        status: "success",
        message: deleted ? "Berkas di Google Drive berhasil dihapus" : "Berkas tidak ditemukan atau sudah dihapus",
        deleted: deleted
      });
    }

    const targetType = contents.target || (contents.mutasi_masuk || contents.mutasimasuk || contents.mutasi ? "mutasi_masuk" : (contents.mutasi_keluar || contents.mutasikeluar ? "mutasi_keluar" : (contents.gtk ? "gtk" : (contents.naikpangkat ? "naikpangkat" : (contents.kgb ? "kgb" : "data")))));

    // 0. TARGET: MUTASI_MASUK
    if (targetType === "mutasi_masuk" || targetType === "mutasimasuk" || targetType === "mutasi") {
      const sheet = getMutasiMasukSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());

      // Sync All / Import All
      if (action === "syncAll" || action === "importAll" || action === "saveAll") {
        const items = contents.items || contents.data || contents.mutasi_masuk || [];
        if (items.length > 0) {
          const rowsToWrite = items.map((m, idx) => {
            return headers.map(h => {
              const hClean = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (hClean === "no") return String(m.no || (idx + 1));
              if (hClean === "nisn") return String(m.nisn || "");
              if (hClean === "namasiswa" || hClean === "nama") return String(m.nama || m.nama_siswa || "");
              if (hClean === "provinsi") return String(m.provinsiNama || m.provinsi || "");
              if (hClean === "kabkota" || hClean === "kabupatenkota") return String(m.kabKotaNama || m.kab_kota || "");
              if (hClean === "kecamatan") return String(m.kecamatanNama || m.kecamatan || "");
              if (hClean === "namasekolah" || hClean === "sekolahasal") return String(m.sekolahAsal || m.nama_sekolah || "");
              if (hClean === "rombeltujuan" || hClean === "rombel") return String(m.rombelTujuan || m.rombel_tujuan || "");
              if (hClean === "status") return (String(m.status || "").toLowerCase() === "diterima") ? "Diterima" : "Pending";
              if (hClean === "timestamp") return String(m.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy HH:mm:ss"));
              if (hClean === "tglmasuk" || hClean === "tanggalmasuk") {
                var rawDate = m.tglMasuk || m.tgl_masuk || m.tanggalPengajuan || m.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy");
                return formatToDDMMYYYY(rawDate);
              }
              return String(m[h] || m[hClean] || "");
            });
          });

          const neededRows = rowsToWrite.length + 1;
          const maxRows = sheet.getMaxRows();
          if (maxRows < neededRows) sheet.insertRowsAfter(maxRows, neededRows - maxRows + 10);
          if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();

          const targetRange = sheet.getRange(2, 1, rowsToWrite.length, headers.length);
          targetRange.setNumberFormat("@");
          targetRange.setValues(rowsToWrite);
          return responseJSON({ status: "success", message: "Berhasil sinkronisasi " + rowsToWrite.length + " data Mutasi Masuk!" });
        }
      }

      // Delete Mutasi Masuk
      if (action === "delete" || action === "deleteMutasiMasuk") {
        const delItem = contents.item || contents.data || contents;
        const targetNisn = String(delItem.nisn || delItem.NISN || "").trim();
        let foundRow = -1;

        const nisnColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nisn');
        const colToSearch = nisnColIdx >= 0 ? nisnColIdx : 1;

        for (let i = 1; i < data.length; i++) {
          const rNisn = String(data[i][colToSearch] || "").trim();
          if (targetNisn && rNisn === targetNisn) {
            foundRow = i + 1;
            break;
          }
        }

        if (foundRow > 1) {
          sheet.deleteRow(foundRow);
          return responseJSON({ status: "success", message: "Data mutasi masuk berhasil dihapus dari Google Sheets", row: foundRow });
        }
        return responseJSON({ status: "warning", message: "Baris data mutasi masuk tidak ditemukan untuk dihapus" });
      }

      // Single Add / Update
      const mItem = contents.item || contents.data || contents;
      const targetNisn = String(mItem.nisn || mItem.NISN || "").trim();
      let foundRow = -1;

      const nisnColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nisn');
      const colToSearch = nisnColIdx >= 0 ? nisnColIdx : 1;

      for (let i = 1; i < data.length; i++) {
        const rNisn = String(data[i][colToSearch] || "").trim();
        if (targetNisn && rNisn === targetNisn) {
          foundRow = i + 1;
          break;
        }
      }

      const rowValues = headers.map(h => {
        const hClean = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (hClean === "no") return String(mItem.no || (foundRow > 1 ? data[foundRow - 1][0] : sheet.getLastRow()));
        if (hClean === "nisn") return String(mItem.nisn || "");
        if (hClean === "namasiswa" || hClean === "nama") return String(mItem.nama || mItem.nama_siswa || "");
        if (hClean === "provinsi") return String(mItem.provinsiNama || mItem.provinsi || "");
        if (hClean === "kabkota" || hClean === "kabupatenkota") return String(mItem.kabKotaNama || mItem.kab_kota || "");
        if (hClean === "kecamatan") return String(mItem.kecamatanNama || mItem.kecamatan || "");
        if (hClean === "namasekolah" || hClean === "sekolahasal") return String(mItem.sekolahAsal || mItem.nama_sekolah || "");
        if (hClean === "rombeltujuan" || hClean === "rombel") return String(mItem.rombelTujuan || mItem.rombel_tujuan || "");
        if (hClean === "status") return (String(mItem.status || "").toLowerCase() === "diterima") ? "Diterima" : "Pending";
        if (hClean === "timestamp") return String(mItem.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy HH:mm:ss"));
        if (hClean === "tglmasuk" || hClean === "tanggalmasuk") {
          var rawDate = mItem.tglMasuk || mItem.tgl_masuk || mItem.tanggalPengajuan || mItem.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy");
          return formatToDDMMYYYY(rawDate);
        }
        return String(mItem[h] || mItem[hClean] || "");
      });

      if (foundRow > 1) {
        const cellRange = sheet.getRange(foundRow, 1, 1, headers.length);
        cellRange.setNumberFormat("@");
        cellRange.setValues([rowValues]);
        return responseJSON({ status: "success", message: "Data mutasi masuk berhasil diperbarui", row: foundRow });
      } else {
        const newRowIdx = sheet.getLastRow() + 1;
        const cellRange = sheet.getRange(newRowIdx, 1, 1, headers.length);
        cellRange.setNumberFormat("@");
        cellRange.setValues([rowValues]);
        return responseJSON({ status: "success", message: "Data mutasi masuk baru berhasil ditambahkan" });
      }
    }

    // 0B. TARGET: MUTASI_KELUAR
    if (targetType === "mutasi_keluar" || targetType === "mutasikeluar") {
      const sheet = getMutasiKeluarSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());

      // Sync All / Import All
      if (action === "syncAll" || action === "importAll" || action === "saveAll" || action === "syncAllMutasiKeluar") {
        const items = contents.items || contents.data || contents.mutasi_keluar || [];
        if (items.length > 0) {
          const rowsToWrite = items.map((m, idx) => {
            return headers.map(h => {
              const hClean = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (hClean === "no") return String(m.no || (idx + 1));
              if (hClean === "nipd") return String(m.nipd || "");
              if (hClean === "nisn") return String(m.nisn || "");
              if (hClean === "nama" || hClean === "namasiswa") return String(m.nama || m.nama_siswa || "");
              if (hClean === "tempatlahir") return String(m.tempatLahir || m.tempat_lahir || "");
              if (hClean === "tgllahir" || hClean === "tanggallahir") return formatToDDMMYYYY(m.tglLahir || m.tgl_lahir || "");
              if (hClean === "rombel" || hClean === "kelas") return String(m.rombel || m.kelas || "");
              if (hClean === "ketmutasi" || hClean === "keteranganmutasi") return String(m.ketMutasi || m.ket_mutasi || m.ket || "");
              if (hClean === "pindahke" || hClean === "sekolatujuan" || hClean === "tujuan") return String(m.pindahKe || m.pindah_ke || "");
              if (hClean === "tglmutasi" || hClean === "tanggalmutasi") return formatToDDMMYYYY(m.tglMutasi || m.tgl_mutasi || "");
              if (hClean === "alasanmutasi" || hClean === "alasan") return String(m.alasanMutasi || m.alasan_mutasi || m.alasan || "");
              if (hClean === "uploadberkas" || hClean === "berkas" || hClean === "file") return String(m.uploadBerkas || m.upload_berkas || "");
              if (hClean === "status") return String(m.status || "Selesai");
              if (hClean === "timestamp") return String(m.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy HH:mm:ss"));
              return String(m[h] || m[hClean] || "");
            });
          });

          const neededRows = rowsToWrite.length + 1;
          const maxRows = sheet.getMaxRows();
          if (maxRows < neededRows) sheet.insertRowsAfter(maxRows, neededRows - maxRows + 10);
          if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();

          const targetRange = sheet.getRange(2, 1, rowsToWrite.length, headers.length);
          targetRange.setNumberFormat("@");
          targetRange.setValues(rowsToWrite);
          return responseJSON({ status: "success", message: "Berhasil sinkronisasi " + rowsToWrite.length + " data Mutasi Keluar!" });
        }
      }

      // Batch Delete Mutasi Keluar & Berkas Terkait di Google Drive
      if (action === "deleteMultiple" || action === "deleteMultipleMutasiKeluar") {
        const items = contents.items || contents.data || [];
        const nisnColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nisn');
        const nipdColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nipd');
        const berkasColIdx = headers.findIndex(h => {
          const c = h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          return c === 'uploadberkas' || c === 'berkas' || c === 'file';
        });

        let deletedRowsCount = 0;
        let deletedFilesCount = 0;
        const rowsToDelete = [];

        items.forEach(function(item) {
          const tNisn = String(item.nisn || item.NISN || "").trim();
          const tNipd = String(item.nipd || item.NIPD || "").trim();
          let fUrl = item.uploadBerkas || item.upload_berkas || item.fileUrl || "";

          // Hapus berkas dari Google Drive jika ada tautannya
          if (fUrl) {
            const m = String(fUrl).match(/[-\w]{25,}/);
            if (m) {
              try {
                DriveApp.getFileById(m[0]).setTrashed(true);
                deletedFilesCount++;
              } catch (eF) {
                Logger.log("Drive trash file error: " + eF.message);
              }
            }
          }

          // Cari baris di sheet
          for (let i = 1; i < data.length; i++) {
            const rNisn = nisnColIdx >= 0 ? String(data[i][nisnColIdx] || "").trim() : "";
            const rNipd = nipdColIdx >= 0 ? String(data[i][nipdColIdx] || "").trim() : "";
            if ((tNisn && rNisn === tNisn) || (tNipd && rNipd === tNipd)) {
              const rowNum = i + 1;
              if (rowsToDelete.indexOf(rowNum) === -1) {
                rowsToDelete.push(rowNum);
                // Jika fUrl kosong di parameter, ambil dari isi sheet
                if (!fUrl && berkasColIdx >= 0) {
                  const sheetFUrl = String(data[i][berkasColIdx] || "");
                  const m2 = sheetFUrl.match(/[-\w]{25,}/);
                  if (m2) {
                    try {
                      DriveApp.getFileById(m2[0]).setTrashed(true);
                      deletedFilesCount++;
                    } catch (eF2) {}
                  }
                }
              }
              break;
            }
          }
        });

        // Hapus baris dari bawah ke atas agar index tidak bergeser
        rowsToDelete.sort(function(a, b) { return b - a; });
        rowsToDelete.forEach(function(r) {
          sheet.deleteRow(r);
          deletedRowsCount++;
        });

        return responseJSON({
          status: "success",
          message: "Berhasil menghapus " + deletedRowsCount + " baris data mutasi keluar dan " + deletedFilesCount + " berkas di Google Drive",
          deletedRowsCount: deletedRowsCount,
          deletedFilesCount: deletedFilesCount
        });
      }

      // Single Delete Mutasi Keluar & Berkas Terkait di Google Drive
      if (action === "delete" || action === "deleteMutasiKeluar") {
        const delItem = contents.item || contents.data || contents;
        const targetNisn = String(delItem.nisn || delItem.NISN || "").trim();
        const targetNipd = String(delItem.nipd || delItem.NIPD || "").trim();
        let fileToDelete = delItem.uploadBerkas || delItem.upload_berkas || delItem.fileUrl || "";
        let foundRow = -1;

        const nisnColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nisn');
        const nipdColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nipd');
        const berkasColIdx = headers.findIndex(h => {
          const c = h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          return c === 'uploadberkas' || c === 'berkas' || c === 'file';
        });

        for (let i = 1; i < data.length; i++) {
          const rNisn = nisnColIdx >= 0 ? String(data[i][nisnColIdx] || "").trim() : "";
          const rNipd = nipdColIdx >= 0 ? String(data[i][nipdColIdx] || "").trim() : "";
          if ((targetNisn && rNisn === targetNisn) || (targetNipd && rNipd === targetNipd)) {
            foundRow = i + 1;
            if (!fileToDelete && berkasColIdx >= 0) {
              fileToDelete = String(data[i][berkasColIdx] || "");
            }
            break;
          }
        }

        // Hapus file terkait dari Google Drive jika ada
        let driveDeleted = false;
        if (fileToDelete) {
          const match = String(fileToDelete).match(/[-\w]{25,}/);
          if (match) {
            try {
              DriveApp.getFileById(match[0]).setTrashed(true);
              driveDeleted = true;
              Logger.log("Berkas mutasi keluar berhasil dihapus dari Drive: " + match[0]);
            } catch (eDelDrive) {
              Logger.log("Gagal hapus berkas drive: " + eDelDrive.message);
            }
          }
        }

        if (foundRow > 1) {
          sheet.deleteRow(foundRow);
          return responseJSON({
            status: "success",
            message: "Data mutasi keluar dan berkas terkait di Google Drive berhasil dihapus",
            row: foundRow,
            driveDeleted: driveDeleted
          });
        }
        return responseJSON({ status: "warning", message: "Baris data mutasi keluar tidak ditemukan untuk dihapus" });
      }

      // Single Add / Update Mutasi Keluar
      const mItem = contents.item || contents.data || contents;
      const targetNisn = String(mItem.nisn || mItem.NISN || "").trim();
      const targetNipd = String(mItem.nipd || mItem.NIPD || "").trim();
      let foundRow = -1;

      const nisnColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nisn');
      const nipdColIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nipd');

      for (let i = 1; i < data.length; i++) {
        const rNisn = nisnColIdx >= 0 ? String(data[i][nisnColIdx] || "").trim() : "";
        const rNipd = nipdColIdx >= 0 ? String(data[i][nipdColIdx] || "").trim() : "";
        if ((targetNisn && rNisn === targetNisn) || (targetNipd && rNipd === targetNipd)) {
          foundRow = i + 1;
          break;
        }
      }

      const rowValues = headers.map(h => {
        const hClean = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (hClean === "no") return String(mItem.no || (foundRow > 1 ? data[foundRow - 1][0] : sheet.getLastRow()));
        if (hClean === "nipd") return String(mItem.nipd || "");
        if (hClean === "nisn") return String(mItem.nisn || "");
        if (hClean === "nama" || hClean === "namasiswa") return String(mItem.nama || mItem.nama_siswa || "");
        if (hClean === "tempatlahir") return String(mItem.tempatLahir || mItem.tempat_lahir || "");
        if (hClean === "tgllahir" || hClean === "tanggallahir") return formatToDDMMYYYY(mItem.tglLahir || mItem.tgl_lahir || "");
        if (hClean === "rombel" || hClean === "kelas") return String(mItem.rombel || mItem.kelas || "");
        if (hClean === "ketmutasi" || hClean === "keteranganmutasi") return String(mItem.ketMutasi || mItem.ket_mutasi || mItem.ket || "");
        if (hClean === "pindahke" || hClean === "sekolatujuan" || hClean === "tujuan") return String(mItem.pindahKe || mItem.pindah_ke || "");
        if (hClean === "tglmutasi" || hClean === "tanggalmutasi") return formatToDDMMYYYY(mItem.tglMutasi || mItem.tgl_mutasi || "");
        if (hClean === "alasanmutasi" || hClean === "alasan") return String(mItem.alasanMutasi || mItem.alasan_mutasi || mItem.alasan || "");
        if (hClean === "uploadberkas" || hClean === "berkas" || hClean === "file") return String(mItem.uploadBerkas || mItem.upload_berkas || "");
        if (hClean === "status") return String(mItem.status || "Selesai");
        if (hClean === "timestamp") return String(mItem.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy HH:mm:ss"));
        return String(mItem[h] || mItem[hClean] || "");
      });

      if (foundRow > 1) {
        const cellRange = sheet.getRange(foundRow, 1, 1, headers.length);
        cellRange.setNumberFormat("@");
        cellRange.setValues([rowValues]);
        return responseJSON({ status: "success", message: "Data mutasi keluar berhasil diperbarui", row: foundRow });
      } else {
        const newRowIdx = sheet.getLastRow() + 1;
        const cellRange = sheet.getRange(newRowIdx, 1, 1, headers.length);
        cellRange.setNumberFormat("@");
        cellRange.setValues([rowValues]);
        return responseJSON({ status: "success", message: "Data mutasi keluar baru berhasil ditambahkan" });
      }
    }

    // 1. TARGET: NAIKPANGKAT / PANGKAT
    if (targetType === "naikpangkat" || targetType === "pangkat") {
      const sheet = getNaikPangkatSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());

      if (action === "syncAll" || action === "importAll" || action === "saveAll") {
        const items = contents.items || contents.data || contents.naikpangkat || contents.pangkat || [];
        if (items.length > 0) {
          const rowsToWrite = items.map((p, idx) => {
            return headers.map(h => {
              const hClean = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (hClean === "no") return String(p.no || (idx + 1));
              if (hClean === "nip") return String(p.nip || "");
              if (hClean === "nama") return String(p.nama || "");
              if (hClean === "gol") return String(p.gol || "");
              if (hClean === "nosk") return String(p.noSk || p.no_sk || "");
              if (hClean === "tglsk") return formatToDDMMYYYY(p.tglSk || p.tgl_sk || "");
              if (hClean === "tmt") return formatToDDMMYYYY(p.tmt || "");
              if (hClean === "masakerjathn") return String(p.masaKerjaThn !== undefined ? p.masaKerjaThn : (p.masa_kerja_thn || 0));
              if (hClean === "masakerjabln") return String(p.masaKerjaBln !== undefined ? p.masaKerjaBln : (p.masa_kerja_bln || 0));
              if (hClean === "timestamp") return String(p.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy HH:mm:ss"));
              if (hClean === "status") return String(p.status || "Aktif");
              return String(p[h] || p[hClean] || "");
            });
          });
          const neededRows = rowsToWrite.length + 1;
          const maxRows = sheet.getMaxRows();
          if (maxRows < neededRows) sheet.insertRowsAfter(maxRows, neededRows - maxRows + 20);
          if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
          
          // Set format seluruh sel sebagai teks (@) dan masukkan nilai
          const targetRange = sheet.getRange(2, 1, rowsToWrite.length, headers.length);
          targetRange.setNumberFormat("@");
          targetRange.setValues(rowsToWrite);
          return responseJSON({ status: "success", message: "Berhasil menyimpan " + rowsToWrite.length + " data Riwayat Pangkat sebagai teks dd/MM/yyyy!" });
        }
      }

      // Hapus data (Delete)
      if (action === "delete") {
        const pItem = contents.item || contents.data || contents;
        const targetNip = String(pItem.nip || "").trim();
        const targetNoSk = String(pItem.noSk || pItem.no_sk || "").trim();
        const targetTmt = formatToDDMMYYYY(pItem.tmt || "");
        let foundRow = -1;

        const pNipIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nip');
        const pNoSkIdx = headers.findIndex(h => {
          const hc = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          return hc === 'nosk' || hc === 'sk';
        });
        const pTmtIdx = headers.findIndex(h => {
          const hc = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          return hc === 'tmt';
        });
        const nipCol = pNipIdx >= 0 ? pNipIdx : 1;
        const noSkCol = pNoSkIdx >= 0 ? pNoSkIdx : 4;
        const tmtCol = pTmtIdx >= 0 ? pTmtIdx : 6;

        for (let i = 1; i < data.length; i++) {
          const rNip = String(data[i][nipCol] || "").trim();
          const rNoSk = String(data[i][noSkCol] || "").trim();
          const rTmt = formatToDDMMYYYY(data[i][tmtCol] || "");
          if (targetNip && rNip === targetNip && targetNoSk && rNoSk === targetNoSk && targetTmt && rTmt === targetTmt) {
            foundRow = i + 1;
            break;
          } else if (targetNip && rNip === targetNip && targetNoSk && rNoSk === targetNoSk) {
            foundRow = i + 1;
            break;
          }
        }

        if (foundRow > 1) {
          sheet.deleteRow(foundRow);
          return responseJSON({ status: "success", message: "Data riwayat kepangkatan berhasil dihapus dari Google Sheets", row: foundRow });
        }
        return responseJSON({ status: "warning", message: "Baris riwayat pangkat tidak ditemukan untuk dihapus" });
      }

      // Single Add / Update
      const pItem = contents.item || contents.data || contents;
      const targetNip = String(pItem.nip || "").trim();
      const targetNoSk = String(pItem.noSk || pItem.no_sk || "").trim();
      const targetTmt = formatToDDMMYYYY(pItem.tmt || "");
      let foundRow = -1;

      const pNipIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nip');
      const pNoSkIdx = headers.findIndex(h => {
        const hc = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return hc === 'nosk' || hc === 'sk';
      });
      const pTmtIdx = headers.findIndex(h => {
        const hc = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return hc === 'tmt';
      });
      const nipCol = pNipIdx >= 0 ? pNipIdx : 1;
      const noSkCol = pNoSkIdx >= 0 ? pNoSkIdx : 4;
      const tmtCol = pTmtIdx >= 0 ? pTmtIdx : 6;

      for (let i = 1; i < data.length; i++) {
        const rNip = String(data[i][nipCol] || "").trim();
        const rNoSk = String(data[i][noSkCol] || "").trim();
        const rTmt = formatToDDMMYYYY(data[i][tmtCol] || "");
        if (targetNip && rNip === targetNip && targetNoSk && rNoSk === targetNoSk && targetTmt && rTmt === targetTmt) {
          foundRow = i + 1;
          break;
        }
      }

      const rowValues = headers.map(h => {
        const hClean = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (hClean === "no") return String(pItem.no || (foundRow > 1 ? data[foundRow - 1][0] : sheet.getLastRow()));
        if (hClean === "nip") return String(pItem.nip || "");
        if (hClean === "nama") return String(pItem.nama || "");
        if (hClean === "gol") return String(pItem.gol || "");
        if (hClean === "nosk") return String(pItem.noSk || pItem.no_sk || "");
        if (hClean === "tglsk") return formatToDDMMYYYY(pItem.tglSk || pItem.tgl_sk || "");
        if (hClean === "tmt") return formatToDDMMYYYY(pItem.tmt || "");
        if (hClean === "masakerjathn") return String(pItem.masaKerjaThn !== undefined ? pItem.masaKerjaThn : (pItem.masa_kerja_thn || 0));
        if (hClean === "masakerjabln") return String(pItem.masaKerjaBln !== undefined ? pItem.masaKerjaBln : (pItem.masa_kerja_bln || 0));
        if (hClean === "timestamp") return String(pItem.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy HH:mm:ss"));
        if (hClean === "status") return String(pItem.status || "Aktif");
        return String(pItem[h] || pItem[hClean] || "");
      });

      if (foundRow > 1) {
        const cellRange = sheet.getRange(foundRow, 1, 1, headers.length);
        cellRange.setNumberFormat("@");
        cellRange.setValues([rowValues]);
        return responseJSON({ status: "success", message: "Riwayat Pangkat berhasil diperbarui sebagai teks dd/MM/yyyy", row: foundRow });
      } else {
        const newRowIdx = sheet.getLastRow() + 1;
        const cellRange = sheet.getRange(newRowIdx, 1, 1, headers.length);
        cellRange.setNumberFormat("@");
        cellRange.setValues([rowValues]);
        return responseJSON({ status: "success", message: "Riwayat Pangkat baru berhasil ditambahkan sebagai teks dd/MM/yyyy" });
      }
    }

    // 2. TARGET: KGB
    if (targetType === "kgb") {
      const sheet = getKgbSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());

      if (action === "syncAll" || action === "importAll" || action === "saveAll") {
        const items = contents.items || contents.data || contents.kgb || [];
        if (items.length > 0) {
          const rowsToWrite = items.map((k, idx) => {
            return headers.map(h => {
              const hClean = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (hClean === "no") return String(k.no || (idx + 1));
              if (hClean === "nip") return String(k.nip || "");
              if (hClean === "nama") return String(k.nama || "");
              if (hClean === "gol") return String(k.gol || "");
              if (hClean === "nosk") return String(k.noSk || k.no_sk || "");
              if (hClean === "tglsk") return formatToDDMMYYYY(k.tglSk || k.tgl_sk || "");
              if (hClean === "tmtkgb" || hClean === "tmt") return formatToDDMMYYYY(k.tmt || k.TMT_kgb || "");
              if (hClean === "masakerjatahun" || hClean === "masakerjathn") return String(k.masaKerjaThn !== undefined ? k.masaKerjaThn : (k.masa_kerja_tahun || 0));
              if (hClean === "masakerjabln") return String(k.masaKerjaBln !== undefined ? k.masaKerjaBln : (k.masa_kerja_bln || 0));
              if (hClean === "gajipokok" || hClean === "gaji") return String(k.gajiPokok !== undefined ? k.gajiPokok : (k.gaji_pokok || 0));
              if (hClean === "timestamp") return String(k.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy HH:mm:ss"));
              if (hClean === "status") return String(k.status || "Aktif");
              return String(k[h] || k[hClean] || "");
            });
          });
          const neededRows = rowsToWrite.length + 1;
          const maxRows = sheet.getMaxRows();
          if (maxRows < neededRows) sheet.insertRowsAfter(maxRows, neededRows - maxRows + 20);
          if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
          
          const targetRange = sheet.getRange(2, 1, rowsToWrite.length, headers.length);
          targetRange.setNumberFormat("@");
          targetRange.setValues(rowsToWrite);
          return responseJSON({ status: "success", message: "Berhasil menyimpan " + rowsToWrite.length + " data Riwayat KGB sebagai teks dd/MM/yyyy!" });
        }
      }

      // Hapus data KGB (Delete)
      if (action === "delete") {
        const kItem = contents.item || contents.data || contents;
        const targetNip = String(kItem.nip || "").trim();
        const targetNoSk = String(kItem.noSk || kItem.no_sk || "").trim();
        const targetTmt = formatToDDMMYYYY(kItem.tmt || kItem.TMT_kgb || "");
        let foundRow = -1;

        const kNipIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nip');
        const kNoSkIdx = headers.findIndex(h => {
          const hc = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          return hc === 'nosk' || hc === 'sk';
        });
        const kTmtIdx = headers.findIndex(h => {
          const hc = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          return hc === 'tmtkgb' || hc === 'tmt';
        });
        const nipCol = kNipIdx >= 0 ? kNipIdx : 1;
        const noSkCol = kNoSkIdx >= 0 ? kNoSkIdx : 4;
        const tmtCol = kTmtIdx >= 0 ? kTmtIdx : 6;

        for (let i = 1; i < data.length; i++) {
          const rNip = String(data[i][nipCol] || "").trim();
          const rNoSk = String(data[i][noSkCol] || "").trim();
          const rTmt = formatToDDMMYYYY(data[i][tmtCol] || "");
          if (targetNip && rNip === targetNip && targetNoSk && rNoSk === targetNoSk && targetTmt && rTmt === targetTmt) {
            foundRow = i + 1;
            break;
          } else if (targetNip && rNip === targetNip && targetNoSk && rNoSk === targetNoSk) {
            foundRow = i + 1;
            break;
          }
        }

        if (foundRow > 1) {
          sheet.deleteRow(foundRow);
          return responseJSON({ status: "success", message: "Data riwayat KGB berhasil dihapus dari Google Sheets", row: foundRow });
        }
        return responseJSON({ status: "warning", message: "Baris riwayat KGB tidak ditemukan untuk dihapus" });
      }

      // Single Add / Update
      const kItem = contents.item || contents.data || contents;
      const targetNip = String(kItem.nip || "").trim();
      const targetNoSk = String(kItem.noSk || kItem.no_sk || "").trim();
      const targetTmt = formatToDDMMYYYY(kItem.tmt || kItem.TMT_kgb || "");
      let foundRow = -1;

      const kNipIdx = headers.findIndex(h => h.toLowerCase().trim() === 'nip');
      const kNoSkIdx = headers.findIndex(h => {
        const hc = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return hc === 'nosk' || hc === 'sk';
      });
      const kTmtIdx = headers.findIndex(h => {
        const hc = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        return hc === 'tmtkgb' || hc === 'tmt';
      });
      const nipCol = kNipIdx >= 0 ? kNipIdx : 1;
      const noSkCol = kNoSkIdx >= 0 ? kNoSkIdx : 4;
      const tmtCol = kTmtIdx >= 0 ? kTmtIdx : 6;

      for (let i = 1; i < data.length; i++) {
        const rNip = String(data[i][nipCol] || "").trim();
        const rNoSk = String(data[i][noSkCol] || "").trim();
        const rTmt = formatToDDMMYYYY(data[i][tmtCol] || "");
        if (targetNip && rNip === targetNip && targetNoSk && rNoSk === targetNoSk && targetTmt && rTmt === targetTmt) {
          foundRow = i + 1;
          break;
        }
      }

      const rowValues = headers.map(h => {
        const hClean = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (hClean === "no") return String(kItem.no || (foundRow > 1 ? data[foundRow - 1][0] : sheet.getLastRow()));
        if (hClean === "nip") return String(kItem.nip || "");
        if (hClean === "nama") return String(kItem.nama || "");
        if (hClean === "gol") return String(kItem.gol || "");
        if (hClean === "nosk") return String(kItem.noSk || kItem.no_sk || "");
        if (hClean === "tglsk") return formatToDDMMYYYY(kItem.tglSk || kItem.tgl_sk || "");
        if (hClean === "tmtkgb" || hClean === "tmt") return formatToDDMMYYYY(kItem.tmt || kItem.TMT_kgb || "");
        if (hClean === "masakerjatahun" || hClean === "masakerjathn") return String(kItem.masaKerjaThn !== undefined ? kItem.masaKerjaThn : (kItem.masa_kerja_tahun || 0));
        if (hClean === "masakerjabln") return String(kItem.masaKerjaBln !== undefined ? kItem.masaKerjaBln : (kItem.masa_kerja_bln || 0));
        if (hClean === "gajipokok" || hClean === "gaji") return String(kItem.gajiPokok !== undefined ? kItem.gajiPokok : (kItem.gaji_pokok || 0));
        if (hClean === "timestamp") return String(kItem.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Makassar", "dd/MM/yyyy HH:mm:ss"));
        if (hClean === "status") return String(kItem.status || "Aktif");
        return String(kItem[h] || kItem[hClean] || "");
      });

      if (foundRow > 1) {
        const cellRange = sheet.getRange(foundRow, 1, 1, headers.length);
        cellRange.setNumberFormat("@");
        cellRange.setValues([rowValues]);
        return responseJSON({ status: "success", message: "Riwayat KGB berhasil diperbarui sebagai teks dd/MM/yyyy", row: foundRow });
      } else {
        const newRowIdx = sheet.getLastRow() + 1;
        const cellRange = sheet.getRange(newRowIdx, 1, 1, headers.length);
        cellRange.setNumberFormat("@");
        cellRange.setValues([rowValues]);
        return responseJSON({ status: "success", message: "Riwayat KGB baru berhasil ditambahkan sebagai teks dd/MM/yyyy" });
      }
    }

    // 3. TARGET: GTK
    if (targetType === "gtk") {
      const sheet = getGtkSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());

      if (action === "syncAll" || action === "importAll" || action === "saveAll") {
        const gtkItems = contents.gtk || contents.data || [];
        if (gtkItems.length > 0) {
          const rowsToWrite = gtkItems.map((g, idx) => {
            return headers.map(h => {
              const hClean = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (hClean === "no") return String(g.no || (idx + 1));
              if (hClean.includes("tgl") || hClean.includes("tanggal") || hClean.includes("tmt")) {
                return formatToDDMMYYYY(g[h] || g[hClean] || "");
              }
              if (g[h] !== undefined) return String(g[h]);
              if (g[hClean] !== undefined) return String(g[hClean]);
              if (hClean.includes("akses") || hClean.includes("menu")) {
                const val = g.akses_menu ?? g.aksesMenu ?? g.status_menu ?? g.statusMenu ?? g.hak_akses;
                if (val !== undefined && val !== null) return String(val);
              }
              if (hClean.includes("statuslogin") || hClean.includes("login") || hClean.includes("role")) {
                const val = g.status_login ?? g.statusLogin;
                if (val !== undefined && val !== null) return String(val);
              }
              return "";
            });
          });
          const neededRows = rowsToWrite.length + 1;
          const maxRows = sheet.getMaxRows();
          if (maxRows < neededRows) sheet.insertRowsAfter(maxRows, neededRows - maxRows + 20);
          if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
          
          const targetRange = sheet.getRange(2, 1, rowsToWrite.length, headers.length);
          targetRange.setNumberFormat("@");
          targetRange.setValues(rowsToWrite);
          return responseJSON({ status: "success", message: "Berhasil menyimpan " + rowsToWrite.length + " data GTK sebagai teks dd/MM/yyyy!" });
        }
      }

      // Hapus GTK (Delete)
      if (action === "delete") {
        const gItem = contents.gtk || contents.item || contents.data || contents;
        const targetNip = String(gItem.nip || "").trim();
        const targetNuptk = String(gItem.nuptk || "").trim();
        const targetNama = String(gItem.nama || "").trim().toLowerCase();
        let foundRow = -1;

        for (let i = 1; i < data.length; i++) {
          const rNip = String(data[i][6] || "").trim();
          const rNuptk = String(data[i][2] || "").trim();
          const rNama = String(data[i][1] || "").trim().toLowerCase();
          if ((targetNip && rNip === targetNip) || (targetNuptk && rNuptk === targetNuptk) || (targetNama && rNama === targetNama)) {
            foundRow = i + 1;
            break;
          }
        }

        if (foundRow > 1) {
          sheet.deleteRow(foundRow);
          return responseJSON({ status: "success", message: "Data GTK berhasil dihapus dari Google Sheets", row: foundRow });
        }
        return responseJSON({ status: "warning", message: "Baris GTK tidak ditemukan untuk dihapus" });
      }

      // Single Add / Update GTK
      const gItem = contents.gtk || contents.item || contents.data || contents;
      const targetNip = String(gItem.nip || "").trim();
      const targetNuptk = String(gItem.nuptk || "").trim();
      let foundRow = -1;

      for (let i = 1; i < data.length; i++) {
        const rNip = String(data[i][6] || "").trim();
        const rNuptk = String(data[i][2] || "").trim();
        const rNama = String(data[i][1] || "").trim().toLowerCase();
        const targetNama = String(gItem.nama || "").trim().toLowerCase();
        if ((targetNip && rNip === targetNip) || (targetNuptk && rNuptk === targetNuptk) || (targetNama && rNama === targetNama)) {
          foundRow = i + 1;
          break;
        }
      }

      const rowValues = headers.map((h, colIdx) => {
        const hClean = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (hClean === "no") return String(gItem.no || (foundRow > 1 ? data[foundRow - 1][0] : sheet.getLastRow()));
        if (hClean.includes("tgl") || hClean.includes("tanggal") || hClean.includes("tmt")) {
          const val = gItem[h] || gItem[hClean];
          if (val) return formatToDDMMYYYY(val);
        }
        if (gItem[h] !== undefined && gItem[h] !== null) return String(gItem[h]);
        if (gItem[hClean] !== undefined && gItem[hClean] !== null) return String(gItem[hClean]);
        if (hClean.includes("akses") || hClean.includes("menu")) {
          const val = gItem.akses_menu ?? gItem.aksesMenu ?? gItem.status_menu ?? gItem.statusMenu ?? gItem.hak_akses;
          if (val !== undefined && val !== null) return String(val);
        }
        if (hClean.includes("statuslogin") || hClean.includes("login") || hClean.includes("role")) {
          const val = gItem.status_login ?? gItem.statusLogin;
          if (val !== undefined && val !== null) return String(val);
        }
        return foundRow > 1 ? String(data[foundRow - 1][colIdx] || "") : "";
      });

      if (foundRow > 1) {
        const cellRange = sheet.getRange(foundRow, 1, 1, headers.length);
        cellRange.setNumberFormat("@");
        cellRange.setValues([rowValues]);
        return responseJSON({ status: "success", message: "Data GTK berhasil diperbarui sebagai teks dd/MM/yyyy", row: foundRow });
      } else {
        const newRowIdx = sheet.getLastRow() + 1;
        const cellRange = sheet.getRange(newRowIdx, 1, 1, headers.length);
        cellRange.setNumberFormat("@");
        cellRange.setValues([rowValues]);
        return responseJSON({ status: "success", message: "Data GTK baru berhasil ditambahkan sebagai teks dd/MM/yyyy" });
      }
    }

    // 4. Default: SISWA batch update / sync
    const sheet = getStudentSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());

    if ((action === "batch_update" || action === "batchUpdate" || action === "batch") && (Array.isArray(contents.updates) || Array.isArray(contents.students))) {
      const items = Array.isArray(contents.updates) ? contents.updates : contents.students;
      let updatedCount = 0;

      const nisnCol = headers.findIndex(h => {
        const hc = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return hc === 'nisn';
      });
      const nipdCol = headers.findIndex(h => {
        const hc = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return hc === 'nipd';
      });
      const namaCol = headers.findIndex(h => {
        const hc = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return hc === 'nama';
      });
      const statusCol = headers.findIndex(h => {
        const hc = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return hc === 'status';
      });
      const ketCol = headers.findIndex(h => {
        const hc = String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return hc === 'ket' || hc === 'keterangan';
      });

      items.forEach(item => {
        const targetNisn = String(item.nisn || item.NISN || "").trim();
        const targetNipd = String(item.nipd || item.NIPD || "").trim();
        const targetNama = String(item.nama || item.Nama || "").trim().toLowerCase();
        const targetId   = String(item.id || item.ID || "").trim();

        for (let i = 1; i < data.length; i++) {
          const rNisn = nisnCol !== -1 ? String(data[i][nisnCol] || "").trim() : "";
          const rNipd = nipdCol !== -1 ? String(data[i][nipdCol] || "").trim() : "";
          const rNama = namaCol !== -1 ? String(data[i][namaCol] || "").trim().toLowerCase() : String(data[i][1] || "").trim().toLowerCase();

          const matched = (targetNisn && rNisn && targetNisn === rNisn) ||
                          (targetNipd && rNipd && targetNipd === rNipd) ||
                          (targetNama && rNama && targetNama === rNama) ||
                          (targetId && (targetId === rNisn || targetId === rNipd || targetId.toLowerCase() === rNama || targetId === String(data[i][1] || "").trim()));

          if (matched) {
            if (statusCol !== -1 && item.status !== undefined) {
              const r = sheet.getRange(i + 1, statusCol + 1);
              r.setNumberFormat("@").setValue(String(item.status || "Aktif"));
            }
            if (ketCol !== -1 && item.ket !== undefined) {
              const r = sheet.getRange(i + 1, ketCol + 1);
              r.setNumberFormat("@").setValue(String(item.ket || ""));
            }
            updatedCount++;
            break;
          }
        }
      });
      return responseJSON({ status: "success", message: "Sinkronisasi status selesai", updated: updatedCount });
    }

    // Hapus Siswa (Delete)
    if (action === "delete") {
      const sItem = contents.student || contents.item || contents.data || contents;
      const targetNisn = String(sItem.nisn || sItem.NISN || "").trim();
      const targetNipd = String(sItem.nipd || sItem.NIPD || "").trim();
      const targetNama = String(sItem.nama || sItem.Nama || "").trim().toLowerCase();
      let foundRow = -1;

      for (let i = 1; i < data.length; i++) {
        const rNisn = String(data[i][3] || "").trim();
        const rNipd = String(data[i][2] || "").trim();
        const rNama = String(data[i][1] || "").trim().toLowerCase();
        if ((targetNisn && rNisn === targetNisn) || (targetNipd && rNipd === targetNipd) || (targetNama && rNama === targetNama)) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow > 1) {
        sheet.deleteRow(foundRow);
        return responseJSON({ status: "success", message: "Data siswa berhasil dihapus dari Google Sheets", row: foundRow });
      }
      return responseJSON({ status: "warning", message: "Baris siswa tidak ditemukan untuk dihapus" });
    }

    return responseJSON({ status: "success", message: "Operasi selesai" });
  } catch (error) {
    return responseJSON({ status: "error", message: error.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
