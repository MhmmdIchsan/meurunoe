import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  
  // Generate table
  doc.autoTable({
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
  const pageCount = doc.internal.getNumberOfPages();
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
  doc.autoTable({
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
  const pageCount = doc.internal.getNumberOfPages();
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
  doc.autoTable({
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
  const pageCount = doc.internal.getNumberOfPages();
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