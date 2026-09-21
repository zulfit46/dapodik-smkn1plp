/**
 * ==============================================================================
 * SCRIPT GOOGLE APPS SCRIPT (code.gs) - APLIKASI DATA SISWA DAPODIK
 * Spreadsheet ID : 1t_i5_kMDb00AT2uL0Km49_37CHJB2RWUv3tZjVgLlAk
 * Nama Sheet     : data
 * Kunci Utama    : NISN
 * ==============================================================================
 */

const SPREADSHEET_ID = "1t_i5_kMDb00AT2uL0Km49_37CHJB2RWUv3tZjVgLlAk";
const SHEET_NAME = "data";

// List Header Resmi
const OFFICIAL_HEADERS = [
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

function getSheet() {
  let ss;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(OFFICIAL_HEADERS);
    sheet.getRange(1, 1, 1, OFFICIAL_HEADERS.length).setFontWeight("bold").setBackground("#e0f2fe");
  } else {
    ensureHeadersExist(sheet);
  }
  return sheet;
}

function ensureHeadersExist(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return;
  const headers = data[0].map(h => String(h).trim());
  const hCleanList = headers.map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ""));

  let modified = false;

  if (!hCleanList.includes("status")) {
    headers.push("status");
    modified = true;
  }
  if (!hCleanList.includes("ket") && !hCleanList.includes("keterangan")) {
    headers.push("ket");
    modified = true;
  }

  if (modified) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

/**
 * Endpoint HTTP GET: Membaca data siswa dari Google Sheets
 */
function doGet(e) {
  try {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return responseJSON({
        status: "success",
        total: 0,
        data: []
      });
    }

    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1);

    const students = rows.map((row, index) => {
      const obj = { rowIndex: index + 2 };
      
      headers.forEach((header, colIdx) => {
        let val = row[colIdx];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
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
        if (hClean === "tgllahir" || hClean === "tanggallahir") obj["tanggalLahir"] = strVal;
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

      // Gunakan NISN sebagai ID utama jika ada
      if (!obj.id) {
        obj.id = obj.nisn ? obj.nisn : (obj.nipd ? obj.nipd : "STU-" + String(index + 1).padStart(3, '0'));
      }

      return obj;
    });

    return responseJSON({
      status: "success",
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
 * Helper: Menyusun array baris data sesuai urutan header kolom sheet
 */
function buildRowArray(headers, student, defaultId, existingRow) {
  return headers.map((header, colIdx) => {
    const hClean = String(header).trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (hClean === "status") {
      if (student.status !== undefined) return student.status;
      if (student.Status !== undefined) return student.Status;
    }
    if (hClean === "ket" || hClean === "keterangan") {
      if (student.ket !== undefined) return student.ket;
      if (student.Ket !== undefined) return student.Ket;
      if (student.keterangan !== undefined) return student.keterangan;
    }

    if (hClean === "nisn") return student.nisn || student.NISN || (existingRow ? existingRow[colIdx] : "");
    if (hClean === "nipd") return student.nipd || student.NIPD || (existingRow ? existingRow[colIdx] : "");
    if (hClean === "id") return student.id || student.nisn || defaultId || (existingRow ? existingRow[colIdx] : "");
    if (hClean === "nama") return student.nama || student.Nama || (existingRow ? existingRow[colIdx] : "");
    if (hClean === "jk") return student.jk || student.JK || (existingRow ? existingRow[colIdx] : "");
    if (hClean === "rombel" || hClean === "kelas") return student.kelas || student.rombel || student.Kelas || (existingRow ? existingRow[colIdx] : "");
    if (hClean === "kerjaayah" || hClean === "kerja_ayah" || hClean === "pekerjaanayah") {
      return student.pekerjaanAyah || student.kerja_ayah || student.kerjaayah || student.pekerjaan_ayah || (existingRow ? existingRow[colIdx] : "");
    }
    if (hClean === "kerjaibu" || hClean === "kerja_ibu" || hClean === "pekerjaanibu") {
      return student.pekerjaanIbu || student.kerja_ibu || student.kerjaibu || student.pekerjaan_ibu || (existingRow ? existingRow[colIdx] : "");
    }
    if (hClean === "namaayah" || hClean === "ayah") {
      return student.ayah || student.nama_ayah || student.namaayah || (existingRow ? existingRow[colIdx] : "");
    }
    if (hClean === "namaibu" || hClean === "ibu") {
      return student.ibu || student.nama_ibu || student.namaibu || (existingRow ? existingRow[colIdx] : "");
    }

    if (student[header] !== undefined) return student[header];
    if (student[hClean] !== undefined) return student[hClean];
    if (existingRow && existingRow[colIdx] !== undefined) return existingRow[colIdx];

    return "";
  });
}

/**
 * Helper: Update 1 baris siswa berdasarkan pencarian NISN (Kunci Utama), NIPD, Nama, atau ID
 */
function updateSingleStudent(sheet, headers, data, student) {
  const targetNisn = String(student.nisn || student.NISN || "").trim();
  const targetNipd = String(student.nipd || student.NIPD || "").trim();
  const targetNama = String(student.nama || student.Nama || "").trim().toLowerCase();
  const targetId   = String(student.id || student.ID || "").trim();

  const nisnCol = headers.findIndex(h => String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, "") === "nisn");
  const nipdCol = headers.findIndex(h => String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, "") === "nipd");
  const namaCol = headers.findIndex(h => String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, "") === "nama");
  const idCol   = headers.findIndex(h => String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, "") === "id");

  let foundRowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNisn = nisnCol !== -1 ? String(row[nisnCol]).trim() : "";
    const rowNipd = nipdCol !== -1 ? String(row[nipdCol]).trim() : "";
    const rowNama = namaCol !== -1 ? String(row[namaCol]).trim().toLowerCase() : "";
    const rowId   = idCol   !== -1 ? String(row[idCol]).trim() : "";

    // KUNCI UTAMA: PRIORTASKAN UTAMA MATCH NISN
    if (
      (targetNisn && rowNisn === targetNisn) ||
      (targetNipd && rowNipd === targetNipd) ||
      (targetId   && rowId   === targetId)   ||
      (targetId   && (targetId.toLowerCase() === rowNama || targetId === rowNisn || targetId === rowNipd)) ||
      (targetNama && rowNama === targetNama)
    ) {
      foundRowIndex = i + 1;
      break;
    }
  }

  if (foundRowIndex === -1) return false;

  const updatedRow = buildRowArray(headers, student, targetId, data[foundRowIndex - 1]);
  sheet.getRange(foundRowIndex, 1, 1, headers.length).setValues([updatedRow]);
  return true;
}

/**
 * Endpoint HTTP POST: Tambah, Edit, Batch Update, atau Hapus Data Siswa
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
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim());

    if ((action === "batch_update" || action === "batchUpdate" || action === "batch") && (Array.isArray(contents.updates) || Array.isArray(contents.students))) {
      const items = Array.isArray(contents.updates) ? contents.updates : contents.students;
      let updatedCount = 0;
      items.forEach(item => {
        if (updateSingleStudent(sheet, headers, data, item)) {
          updatedCount++;
        }
      });
      return responseJSON({ status: "success", message: "Batch update selesai", updated: updatedCount });
    }

    if (action === "create" || action === "add") {
      const student = contents.data || contents;
      const newId = student.nisn || student.id || student.nipd || ("STU-" + String(data.length).padStart(3, '0'));
      const newRow = buildRowArray(headers, student, newId, null);

      sheet.appendRow(newRow);

      return responseJSON({
        status: "success",
        message: "Data siswa berhasil ditambahkan ke Google Sheets!",
        data: { id: newId, ...student }
      });
    }

    if (action === "update" || action === "edit") {
      const student = contents.data || contents;
      const success = updateSingleStudent(sheet, headers, data, student);

      if (success) {
        return responseJSON({
          status: "success",
          message: "Data siswa berhasil diperbarui di Google Sheets!",
          data: student
        });
      } else {
        return responseJSON({
          status: "error",
          message: "Data siswa tidak ditemukan berdasarkan NISN / NIPD."
        });
      }
    }

    return responseJSON({
      status: "error",
      message: "Aksi tidak dikenali: " + action
    });

  } catch (error) {
    return responseJSON({
      status: "error",
      message: error.toString()
    });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
