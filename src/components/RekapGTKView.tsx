import React, { useState, useRef, useEffect } from 'react';
import { GTKData } from '../types';
import { ChevronDown, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INITIAL_GTK_LIST } from '../data/initialGTK';
import { LOGO_BASE64 } from '../assets/logoBase64';

interface RekapGTKViewProps {
  gtkList?: GTKData[];
}

export const RekapGTKView: React.FC<RekapGTKViewProps> = ({ 
  gtkList = INITIAL_GTK_LIST 
}) => {
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Total counts
  const totalGTK = gtkList.length;
  const totalLaki = gtkList.filter(g => g.jk === 'L').length;
  const totalPerempuan = gtkList.filter(g => g.jk === 'P').length;

  // 1. Rekapitulasi Berdasarkan Status Kepegawaian
  // We extract all unique statuses in the order of priority, then any remaining
  const standardStatusOrder = [
    'PNS',
    'PPPK',
    'PPPK Paruh Waktu',
    'Honor Daerah TK.I Provinsi',
    'Tenaga Honor Sekolah',
    'Guru Honor Sekolah'
  ];

  // Group items by status
  const statusMap: Record<string, { l: number; p: number; total: number }> = {};

  gtkList.forEach(g => {
    let rawStatus = (g.statusKepegawaian || '').trim();
    if (!rawStatus) rawStatus = 'Lainnya';

    // Normalize known variations
    let normalized = rawStatus;
    const sLower = rawStatus.toLowerCase();
    if (sLower === 'pns') normalized = 'PNS';
    else if (sLower === 'pppk') normalized = 'PPPK';
    else if (sLower.includes('paruh waktu')) normalized = 'PPPK Paruh Waktu';
    else if (sLower.includes('daerah') || sLower.includes('provinsi')) normalized = 'Honor Daerah TK.I Provinsi';
    else if (sLower.includes('tenaga honor') || sLower.includes('ptt')) normalized = 'Tenaga Honor Sekolah';
    else if (sLower.includes('guru honor') || sLower.includes('gtt')) normalized = 'Guru Honor Sekolah';

    if (!statusMap[normalized]) {
      statusMap[normalized] = { l: 0, p: 0, total: 0 };
    }
    statusMap[normalized].total += 1;
    if (g.jk === 'L') statusMap[normalized].l += 1;
    if (g.jk === 'P') statusMap[normalized].p += 1;
  });

  // Sort by standard order, then others
  const sortedStatuses = Object.keys(statusMap).sort((a, b) => {
    const idxA = standardStatusOrder.indexOf(a);
    const idxB = standardStatusOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return b.localeCompare(a);
  });

  const rekapStatusRows = sortedStatuses.map(status => ({
    status,
    l: statusMap[status].l,
    p: statusMap[status].p,
    jumlah: statusMap[status].total
  }));

  // 2. Rekapitulasi Berdasarkan Jenis PTK (Kepala Sekolah, Guru, Tenaga Kependidikan)
  // Strictly evaluated from header 'Jenis PTK'
  const jenisGroups: { [key: string]: { l: number; p: number; total: number } } = {
    'Kepala Sekolah': { l: 0, p: 0, total: 0 },
    'Guru': { l: 0, p: 0, total: 0 },
    'Tenaga Kependidikan': { l: 0, p: 0, total: 0 }
  };

  gtkList.forEach(g => {
    const raw = (g.jenisPtk || (g as any)['Jenis PTK'] || (g as any).jenisptk || '').trim().toLowerCase();
    
    let group = 'Tenaga Kependidikan';
    if (raw === 'kepala sekolah' || (raw.includes('kepala sekolah') && !raw.includes('wakil'))) {
      group = 'Kepala Sekolah';
    } else if (
      raw.includes('tenaga kependidikan') ||
      raw.includes('administrasi') ||
      raw.includes('perpustakaan') ||
      raw.includes('laboran') ||
      raw.includes('teknisi') ||
      raw.includes('satpam') ||
      raw.includes('penjaga') ||
      raw.includes('kebersihan') ||
      raw.includes('tata usaha') ||
      raw.includes('tu')
    ) {
      group = 'Tenaga Kependidikan';
    } else if (
      raw.includes('guru') ||
      raw.includes('mapel') ||
      raw === 'bk' ||
      raw.includes('bimbingan konseling') ||
      raw.includes('kejuruan') ||
      raw.includes('pengajar') ||
      (raw.includes('pendidik') && !raw.includes('kependidikan'))
    ) {
      group = 'Guru';
    } else {
      group = 'Tenaga Kependidikan';
    }

    jenisGroups[group].total += 1;
    if (g.jk === 'L') jenisGroups[group].l += 1;
    if (g.jk === 'P') jenisGroups[group].p += 1;
  });

  const rekapJenisRows = [
    { jenis: 'Kepala Sekolah', l: jenisGroups['Kepala Sekolah'].l, p: jenisGroups['Kepala Sekolah'].p, jumlah: jenisGroups['Kepala Sekolah'].total },
    { jenis: 'Guru', l: jenisGroups['Guru'].l, p: jenisGroups['Guru'].p, jumlah: jenisGroups['Guru'].total },
    { jenis: 'Tenaga Kependidikan', l: jenisGroups['Tenaga Kependidikan'].l, p: jenisGroups['Tenaga Kependidikan'].p, jumlah: jenisGroups['Tenaga Kependidikan'].total }
  ];

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const bulanIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const today = new Date();
    const formattedDate = `${today.getDate()} ${bulanIndo[today.getMonth()]} ${today.getFullYear()}`;

    // Sheet: Rekap PTK
    const wsData = [
      ['PEMERINTAH PROVINSI SULAWESI SELATAN'],
      ['DINAS PENDIDIKAN'],
      ['SEKOLAH MENENGAH KEJURUAN NEGERI 1 PALOPO'],
      ['Jl. KHM. Kasim NO. 10 Kota Palopo Sulawesi Selatan'],
      ['Website : http://www.smkn1-palopo.sch.id E.mail: info@smknegeri1palopo.sch.id'],
      [''],
      ['LAPORAN REKAPITULASI PTK (PENDIDIK & TENAGA KEPENDIDIKAN)'],
      [`Per Tanggal: ${formattedDate}`],
      [''],
      ['1. TABEL BERDASARKAN STATUS KEPEGAWAIAN'],
      ['Status Kepegawaian', 'L', 'P', 'Jumlah'],
      ...rekapStatusRows.map(r => [r.status, r.l, r.p, r.jumlah]),
      ['Jumlah', totalLaki, totalPerempuan, totalGTK],
      [''],
      ['2. TABEL BERDASARKAN JENIS PTK'],
      ['Jenis PTK', 'L', 'P', 'Jumlah'],
      ...rekapJenisRows.map(r => [r.jenis, r.l, r.p, r.jumlah]),
      ['Jumlah', totalLaki, totalPerempuan, totalGTK],
      [''],
      ['', '', `Palopo, ${formattedDate}`],
      ['', '', 'Kepala SMKN 1 Palopo,'],
      [''],
      [''],
      ['', '', 'RIDWAN, S.T., M.Si.'],
      ['', '', 'NIP. 19700303 200701 1 032']
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Rekapitulasi PTK');
    XLSX.writeFile(wb, `Rekapitulasi_PTK_SMKN1_Palopo_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowActionsDropdown(false);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 10;

    // Kop Surat with Logo matching Rekap Peserta Didik
    try {
      doc.addImage(LOGO_BASE64, 'PNG', 12, 7.5, 21, 21);
    } catch {
      // Ignore if image fails
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('PEMERINTAH PROVINSI SULAWESI SELATAN', (pageWidth + 12) / 2, 11, { align: 'center' });
    doc.setFontSize(10.5);
    doc.text('DINAS PENDIDIKAN', (pageWidth + 12) / 2, 15.5, { align: 'center' });
    doc.setFontSize(11.5);
    doc.text('SEKOLAH MENENGAH KEJURUAN NEGERI 1 PALOPO', (pageWidth + 12) / 2, 20.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Jl. KHM. Kasim NO. 10 Kota Palopo Sulawesi Selatan', (pageWidth + 12) / 2, 25, { align: 'center' });
    doc.text('Website : http://www.smkn1-palopo.sch.id E.mail: info@smknegeri1palopo.sch.id', (pageWidth + 12) / 2, 28.5, { align: 'center' });

    // Double separator line
    doc.setLineWidth(0.6);
    doc.line(marginX, 31, pageWidth - marginX, 31);
    doc.setLineWidth(0.15);
    doc.line(marginX, 31.8, pageWidth - marginX, 31.8);

    // Document Title & Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('LAPORAN REKAPITULASI PTK (PENDIDIK & TENAGA KEPENDIDIKAN)', pageWidth / 2, 38, { align: 'center' });

    const bulanIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const today = new Date();
    const formattedDate = `Palopo, ${today.getDate()} ${bulanIndo[today.getMonth()]} ${today.getFullYear()}`;
    const subtitle = `Per Tanggal: ${today.getDate()} ${bulanIndo[today.getMonth()]} ${today.getFullYear()}`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(subtitle, pageWidth / 2, 42.5, { align: 'center' });

    let currentY = 48;

    // Table 1: Status Kepegawaian
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('1. Tabel Berdasarkan Status Kepegawaian', marginX + 2, currentY);

    const tableBodyStatus: any[] = [
      ...rekapStatusRows.map(r => [r.status, r.l, r.p, r.jumlah]),
      [{ content: 'Jumlah', styles: { fontStyle: 'bold' } }, { content: totalLaki, styles: { fontStyle: 'bold' } }, { content: totalPerempuan, styles: { fontStyle: 'bold' } }, { content: totalGTK, styles: { fontStyle: 'bold' } }]
    ];

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Status Kepegawaian', 'L', 'P', 'Jumlah']],
      body: tableBodyStatus,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.2, lineColor: [203, 213, 225] },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 40 }
      },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.15 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Table 2: Jenis PTK
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('2. Tabel Berdasarkan Jenis PTK', marginX + 2, currentY);

    const tableBodyJenis: any[] = [
      ...rekapJenisRows.map(r => [r.jenis, r.l, r.p, r.jumlah]),
      [{ content: 'Jumlah', styles: { fontStyle: 'bold' } }, { content: totalLaki, styles: { fontStyle: 'bold' } }, { content: totalPerempuan, styles: { fontStyle: 'bold' } }, { content: totalGTK, styles: { fontStyle: 'bold' } }]
    ];

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Jenis PTK', 'L', 'P', 'Jumlah']],
      body: tableBodyJenis,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', lineWidth: 0.2, lineColor: [203, 213, 225] },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 40 }
      },
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.15 }
    });

    // Signature matching Rekap Peserta Didik
    const pageHeight = doc.internal.pageSize.getHeight();
    let signY = (doc as any).lastAutoTable.finalY + 12;
    if (signY + 35 > pageHeight - 10) {
      doc.addPage();
      signY = 20;
    }

    const signX = pageWidth - marginX - 65;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(formattedDate, signX, signY);
    doc.text('Kepala SMKN 1 Palopo,', signX, signY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.text('RIDWAN, S.T., M.Si.', signX, signY + 22);
    doc.setFont('helvetica', 'normal');
    doc.text('NIP. 19700303 200701 1 032', signX, signY + 26);

    doc.save(`Rekapitulasi_PTK_SMKN1_Palopo_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowActionsDropdown(false);
  };

  const handlePrint = () => {
    setShowActionsDropdown(false);
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Header with Title and Actions Dropdown matching screenshot */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">
          Rekapitulasi PTK
        </h1>

        {/* Actions Dropdown Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowActionsDropdown(!showActionsDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-md border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          >
            <span>Actions</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {showActionsDropdown && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-xs text-slate-700 animate-in fade-in duration-100">
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Unduh Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>Unduh PDF (.pdf)</span>
              </button>
              <div className="h-px bg-slate-100 my-1" />
              <button
                type="button"
                onClick={handlePrint}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Cetak Rekap</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Two Clean Cards Grid matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Tabel Berdasarkan Status Kepegawaian */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">
              Tabel Berdasarkan Status Kepegawaian
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                  <th className="py-2.5 px-5 text-left font-semibold">Status</th>
                  <th className="py-2.5 px-4 text-center font-semibold w-20">L</th>
                  <th className="py-2.5 px-4 text-center font-semibold w-20">P</th>
                  <th className="py-2.5 px-5 text-center font-semibold w-24">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rekapStatusRows.map((row) => (
                  <tr key={row.status} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-5 font-normal text-slate-700">
                      {row.status}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600 font-normal">
                      {row.l}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600 font-normal">
                      {row.p}
                    </td>
                    <td className="py-2.5 px-5 text-center text-slate-700 font-normal">
                      {row.jumlah}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 text-slate-900 font-bold bg-slate-50/40">
                  <td className="py-3 px-5 font-bold">Jumlah</td>
                  <td className="py-3 px-4 text-center font-bold">{totalLaki}</td>
                  <td className="py-3 px-4 text-center font-bold">{totalPerempuan}</td>
                  <td className="py-3 px-5 text-center font-bold">{totalGTK}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Card 2: Tabel Berdasarkan Jenis PTK */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">
              Tabel Berdasarkan Jenis PTK
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-semibold text-xs border-b border-slate-300">
                  <th className="py-2.5 px-5 text-left font-semibold">Jenis</th>
                  <th className="py-2.5 px-4 text-center font-semibold w-20">L</th>
                  <th className="py-2.5 px-4 text-center font-semibold w-20">P</th>
                  <th className="py-2.5 px-5 text-center font-semibold w-24">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rekapJenisRows.map((row) => (
                  <tr key={row.jenis} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-5 font-normal text-slate-700">
                      {row.jenis}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600 font-normal">
                      {row.l}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600 font-normal">
                      {row.p}
                    </td>
                    <td className="py-2.5 px-5 text-center text-slate-700 font-normal">
                      {row.jumlah}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 text-slate-900 font-bold bg-slate-50/40">
                  <td className="py-3 px-5 font-bold">Jumlah</td>
                  <td className="py-3 px-4 text-center font-bold">{totalLaki}</td>
                  <td className="py-3 px-4 text-center font-bold">{totalPerempuan}</td>
                  <td className="py-3 px-5 text-center font-bold">{totalGTK}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RekapGTKView;
