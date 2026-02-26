import * as XLSX from 'xlsx';

/**
 * Export Rekap Absensi ke Excel
 */
export function exportAbsensiToExcel(options) {
  const { kelas, semester, rekapAbsensi } = options;

  // Prepare data
  const data = rekapAbsensi.map((r, i) => ({
    'No': i + 1,
    'NISN': r.nisn || '-',
    'Nama Siswa': r.nama || '-',
    'Total Pertemuan': r.total_pertemuan || 0,
    'Hadir': r.hadir || 0,
    'Izin': r.izin || 0,
    'Sakit': r.sakit || 0,
    'Alfa': r.alfa || 0,
    '% Kehadiran': (r.persentase_hadir || 0).toFixed(1) + '%',
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // NISN
    { wch: 25 }, // Nama
    { wch: 12 }, // Total
    { wch: 8 },  // Hadir
    { wch: 8 },  // Izin
    { wch: 8 },  // Sakit
    { wch: 8 },  // Alfa
    { wch: 12 }, // %
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi');

  // Add header info
  XLSX.utils.sheet_add_aoa(ws, [[
    `Rekap Absensi Kelas ${kelas?.nama || '-'}`,
  ]], { origin: 'A1' });
  XLSX.utils.sheet_add_aoa(ws, [[
    `Semester ${semester?.nama || '-'} • ${semester?.tahun_ajaran?.nama || '-'}`,
  ]], { origin: 'A2' });

  // Merge cells for header
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
  ];

  // Download
  const filename = `Absensi_${kelas?.nama || 'Kelas'}_${semester?.nama || 'Semester'}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Export Nilai ke Excel
 */
export function exportNilaiToExcel(options) {
  const { kelas, semester, nilaiData } = options;

  // Prepare data
  const rows = [];
  
  nilaiData.forEach(({ siswa, nilai, rata_rata, predikat }) => {
    // Header siswa
    rows.push({
      'Nama Siswa': siswa.nama,
      'NISN': siswa.nisn,
      'Rata-rata': rata_rata.toFixed(2),
      'Predikat': predikat,
    });

    // Nilai per mapel
    nilai.forEach(n => {
      rows.push({
        'Nama Siswa': '',
        'NISN': '',
        'Mata Pelajaran': n.mata_pelajaran?.nama || '-',
        'Harian': n.nilai_harian.toFixed(0),
        'UTS': n.nilai_uts.toFixed(0),
        'UAS': n.nilai_uas.toFixed(0),
        'Akhir': n.nilai_akhir.toFixed(2),
        'Predikat': n.predikat || '-',
      });
    });

    // Empty row sebagai separator
    rows.push({});
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 25 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Nilai');

  const filename = `Nilai_${kelas?.nama || 'Kelas'}_${semester?.nama || 'Semester'}.xlsx`;
  XLSX.writeFile(wb, filename);
}