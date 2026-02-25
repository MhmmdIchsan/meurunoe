import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const HARI = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};

/**
 * Export Jadwal Mingguan ke PDF
 * @param {Object} options - { kelas, semester, jadwalPerHari }
 */
export function exportJadwalToPDF(options) {
  const { kelas, semester, jadwalPerHari } = options;
  
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('JADWAL PELAJARAN', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Kelas: ${kelas?.nama || '-'}`, pageWidth / 2, 22, { align: 'center' });
  doc.text(
    `Semester ${semester?.nama || '-'} • Tahun Ajaran ${semester?.tahun_ajaran?.nama || '-'}`,
    pageWidth / 2,
    28,
    { align: 'center' }
  );
  
  // Tabel Jadwal per Hari
  const tableData = [];
  let maxSlots = 0;
  
  // Hitung max slots per hari
  Object.values(jadwalPerHari).forEach(jadwal => {
    if (jadwal.length > maxSlots) maxSlots = jadwal.length;
  });
  
  // Build table rows
  for (let slotIndex = 0; slotIndex < maxSlots; slotIndex++) {
    const row = [];
    
    for (let hariKe = 1; hariKe <= 6; hariKe++) {
      const jadwalHari = jadwalPerHari[hariKe] || [];
      const jadwal = jadwalHari[slotIndex];
      
      if (jadwal) {
        const cellContent = [
          `${jadwal.jam_mulai} - ${jadwal.jam_selesai}`,
          jadwal.mata_pelajaran?.nama || '-',
          jadwal.guru?.nama || '-',
        ].join('\n');
        row.push(cellContent);
      } else {
        row.push('-');
      }
    }
    
    tableData.push(row);
  }
  
  // Generate table menggunakan autoTable
  autoTable(doc, {
    startY: 35,
    head: [['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [30, 58, 138], // primary color
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 'auto' },
    },
  });
  
  // Footer
  const pageCount = doc.internal.pages.length - 1; // jsPDF pages dimulai dari 1
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })}`,
      10,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - 10,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }
  
  // Download
  const filename = `Jadwal_${kelas?.nama || 'Kelas'}_${semester?.nama || 'Semester'}.pdf`;
  doc.save(filename);
}

/**
 * Export Jadwal List (Tabel) ke PDF
 * @param {Object} options - { title, jadwalList, semester }
 */
export function exportJadwalListToPDF(options) {
  const { title, jadwalList, semester } = options;
  
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'DAFTAR JADWAL PELAJARAN', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (semester) {
    doc.text(
      `Semester ${semester.nama} • ${semester.tahun_ajaran?.nama || '-'}`,
      pageWidth / 2,
      22,
      { align: 'center' }
    );
  }
  
  // Table data
  const tableData = jadwalList.map(j => [
    HARI[j.hari_ke] || '-',
    `${j.jam_mulai} - ${j.jam_selesai}`,
    j.kelas?.nama || '-',
    j.mata_pelajaran?.nama || '-',
    j.guru?.nama || '-',
  ]);
  
  // Generate table
  autoTable(doc, {
    startY: semester ? 28 : 22,
    head: [['Hari', 'Jam', 'Kelas', 'Mata Pelajaran', 'Guru']],
    body: tableData,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 50 },
      4: { cellWidth: 'auto' },
    },
  });
  
  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
      10,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - 10,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }
  
  // Download
  const filename = `Jadwal_List_${new Date().getTime()}.pdf`;
  doc.save(filename);
}

/**
 * Export Rekap Absensi ke PDF
 * @param {Object} options - { kelas, semester, rekapAbsensi }
 */
export function exportAbsensiToPDF(options) {
  const { kelas, semester, rekapAbsensi } = options;
  
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REKAP ABSENSI KELAS', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Kelas: ${kelas?.nama || '-'}`, pageWidth / 2, 22, { align: 'center' });
  doc.text(
    `Semester ${semester?.nama || '-'} • ${semester?.tahun_ajaran?.nama || '-'}`,
    pageWidth / 2,
    28,
    { align: 'center' }
  );
  
  // Table data
  const tableData = rekapAbsensi.map((r, i) => [
    i + 1,
    r.nama || '-',
    r.total_pertemuan || 0,
    r.hadir || 0,
    r.izin || 0,
    r.sakit || 0,
    r.alfa || 0,
    `${(r.persentase_hadir || 0).toFixed(1)}%`,
  ]);
  
  // Generate table
  autoTable(doc, {
    startY: 35,
    head: [['No', 'Nama Siswa', 'Pertemuan', 'Hadir', 'Izin', 'Sakit', 'Alfa', 'Kehadiran']],
    body: tableData,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      halign: 'center',
    },
    columnStyles: {
      1: { halign: 'left' }, // Nama siswa align left
      7: { 
        halign: 'center',
        cellWidth: 25,
      },
    },
    didParseCell: function(data) {
      // Color coding untuk kolom Kehadiran
      if (data.column.index === 7 && data.section === 'body') {
        const persen = parseFloat(data.cell.text[0]);
        if (persen >= 80) {
          data.cell.styles.textColor = [34, 197, 94]; // green
          data.cell.styles.fontStyle = 'bold';
        } else if (persen >= 60) {
          data.cell.styles.textColor = [234, 179, 8]; // yellow
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [239, 68, 68]; // red
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });
  
  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
      10,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - 10,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }
  
  // Download
  const filename = `Rekap_Absensi_${kelas?.nama || 'Kelas'}_${semester?.nama || 'Semester'}.pdf`;
  doc.save(filename);
}

/**
 * Export Rapor Siswa ke PDF
 * @param {Object} options - { siswa, semester, nilai, rataRata, predikat, absensi }
 */
export function exportRaporToPDF(options) {
  const { siswa, semester, nilai, rataRata, predikat, absensi } = options;
  
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPOR SISWA', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Semester ${semester?.nama || '-'} • Tahun Ajaran ${semester?.tahun_ajaran?.nama || '-'}`,
    pageWidth / 2,
    22,
    { align: 'center' }
  );
  
  // Garis pemisah
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.5);
  doc.line(15, 25, pageWidth - 15, 25);
  
  // Identitas Siswa
  let yPos = 32;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTITAS SISWA', 15, yPos);
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const identitas = [
    ['Nama', siswa?.nama || '-'],
    ['NISN', siswa?.nisn || '-'],
    ['Kelas', siswa?.kelas?.nama || '-'],
    ['Jurusan', siswa?.kelas?.jurusan?.nama || '-'],
  ];
  
  identitas.forEach(([label, value]) => {
    doc.text(label, 20, yPos);
    doc.text(':', 50, yPos);
    doc.text(value, 55, yPos);
    yPos += 6;
  });
  
  yPos += 5;
  
  // Tabel Nilai
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DAFTAR NILAI', 15, yPos);
  
  yPos += 5;
  
  // Table data
  const tableData = nilai.map(n => [
    n.mata_pelajaran?.nama || '-',
    n.nilai_harian.toFixed(0),
    n.nilai_uts.toFixed(0),
    n.nilai_uas.toFixed(0),
    n.nilai_akhir.toFixed(2),
    n.predikat || '-',
  ]);
  
  // Generate table
  autoTable(doc, {
    startY: yPos,
    head: [['Mata Pelajaran', 'Harian', 'UTS', 'UAS', 'Akhir', 'Predikat']],
    body: tableData,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 80 },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
    },
    didParseCell: function(data) {
      if (data.column.index === 5 && data.section === 'body') {
        const pred = data.cell.text[0];
        if (pred === 'A') {
          data.cell.styles.textColor = [34, 197, 94];
          data.cell.styles.fontStyle = 'bold';
        } else if (pred === 'B') {
          data.cell.styles.textColor = [59, 130, 246];
          data.cell.styles.fontStyle = 'bold';
        } else if (pred === 'C' || pred === 'D') {
          data.cell.styles.textColor = [234, 179, 8];
          data.cell.styles.fontStyle = 'bold';
        } else if (pred === 'E') {
          data.cell.styles.textColor = [239, 68, 68];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });
  
  // Rata-rata
  yPos = doc.lastAutoTable.finalY + 2;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RATA-RATA NILAI', 15, yPos);
  doc.text(`: ${rataRata.toFixed(2)}`, 50, yPos);
  doc.text('PREDIKAT', 100, yPos);
  doc.text(`: ${predikat}`, 130, yPos);
  
  yPos += 10;
  
  // Kehadiran
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('KEHADIRAN', 15, yPos);
  
  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const kehadiran = [
    ['Hadir', `${absensi?.hadir || 0} hari`],
    ['Izin', `${absensi?.izin || 0} hari`],
    ['Sakit', `${absensi?.sakit || 0} hari`],
    ['Alfa', `${absensi?.alfa || 0} hari`],
  ];
  
  kehadiran.forEach(([label, value]) => {
    doc.text(label, 20, yPos);
    doc.text(':', 50, yPos);
    doc.text(value, 55, yPos);
    yPos += 6;
  });
  
  // Tanda Tangan
  yPos = doc.internal.pageSize.getHeight() - 50;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const tanggal = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  
  doc.text(`Banda Aceh, ${tanggal}`, pageWidth - 70, yPos);
  
  yPos += 7;
  
  const col1X = 30;
  const col2X = pageWidth - 70;
  
  doc.text('Orang Tua/Wali', col1X, yPos);
  doc.text('Wali Kelas', col2X, yPos);
  
  yPos += 20;
  
  doc.setLineWidth(0.5);
  doc.line(col1X - 5, yPos, col1X + 35, yPos);
  doc.line(col2X - 5, yPos, col2X + 35, yPos);
  
  yPos += 5;
  doc.text('(...........................)', col1X - 5, yPos);
  
  const waliKelasNama = siswa?.kelas?.wali_kelas?.nama || '(...........................)';
  doc.text(waliKelasNama, col2X - 5, yPos);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
    10,
    doc.internal.pageSize.getHeight() - 10
  );
  
  // Download
  const filename = `Rapor_${siswa?.nama?.replace(/\s+/g, '_')}_${semester?.nama}_${semester?.tahun_ajaran?.nama}.pdf`;
  doc.save(filename);
}