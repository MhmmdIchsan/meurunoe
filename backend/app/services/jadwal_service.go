package services

import (
	"fmt"

	"sim-sekolah/app/models"
	"sim-sekolah/config"
)

// KonflikJadwal menyimpan detail bentrok yang ditemukan
type KonflikJadwal struct {
	Tipe       string        `json:"tipe"`        // "guru" | "kelas"
	JadwalID   uint          `json:"jadwal_id"`
	Keterangan string        `json:"keterangan"`
	Jadwal     models.Jadwal `json:"jadwal"`
}

// HasilValidasi berisi semua konflik yang ditemukan
type HasilValidasi struct {
	AdaKonflik bool            `json:"ada_konflik"`
	Konflik    []KonflikJadwal `json:"konflik,omitempty"`
}

// ValidasiKonflikJadwal mengecek apakah slot waktu yang diberikan
// bentrok dengan jadwal yang sudah ada, dari dua sisi: guru dan kelas.
// Parameter excludeID digunakan saat update (mengecualikan jadwal itu sendiri).
func ValidasiKonflikJadwal(
	semesterID uint,
	kelasID uint,
	guruID uint,
	hariKe int,
	jamMulai string,
	jamSelesai string,
	excludeID uint, // 0 = tidak ada (mode create)
) HasilValidasi {
	hasil := HasilValidasi{}

	query := config.DB.
		Preload("Kelas").
		Preload("Guru").
		Preload("MataPelajaran").
		Where("semester_id = ? AND hari_ke = ?", semesterID, hariKe)

	// Saat update, kecualikan jadwal itu sendiri
	if excludeID > 0 {
		query = query.Where("id != ?", excludeID)
	}

	// ── Kondisi tumpang tindih waktu ─────────────────────────────
	// Dua slot bentrok jika: jamMulaiA < jamSelesaiB AND jamSelesaiA > jamMulaiB
	query = query.Where(
		"jam_mulai < ? AND jam_selesai > ?",
		jamSelesai, jamMulai,
	)

	var kandidat []models.Jadwal
	query.Find(&kandidat)

	for _, j := range kandidat {
		// 1. Cek bentrok GURU (guru yang sama, slot waktu overlap)
		if j.GuruID == guruID {
			hasil.Konflik = append(hasil.Konflik, KonflikJadwal{
				Tipe:     "guru",
				JadwalID: j.ID,
				Keterangan: fmt.Sprintf(
					"Guru sudah mengajar %s di kelas %s pada %s %s–%s",
					j.MataPelajaran.Nama, j.Kelas.Nama,
					namaHari(hariKe), j.JamMulai, j.JamSelesai,
				),
				Jadwal: j,
			})
		}

		// 2. Cek bentrok KELAS (kelas yang sama, slot waktu overlap)
		if j.KelasID == kelasID {
			hasil.Konflik = append(hasil.Konflik, KonflikJadwal{
				Tipe:     "kelas",
				JadwalID: j.ID,
				Keterangan: fmt.Sprintf(
					"Kelas sudah memiliki pelajaran %s diajar %s pada %s %s–%s",
					j.MataPelajaran.Nama, j.Guru.Nama,
					namaHari(hariKe), j.JamMulai, j.JamSelesai,
				),
				Jadwal: j,
			})
		}
	}

	hasil.AdaKonflik = len(hasil.Konflik) > 0
	return hasil
}

// GetJadwalMingguanGuru mengembalikan semua jadwal seorang guru
// dalam satu semester, dikelompokkan per hari.
func GetJadwalMingguanGuru(guruID, semesterID uint) map[string][]models.Jadwal {
	var jadwalList []models.Jadwal
	config.DB.
		Preload("Kelas.Jurusan").
		Preload("MataPelajaran").
		Where("guru_id = ? AND semester_id = ?", guruID, semesterID).
		Order("hari_ke ASC, jam_mulai ASC").
		Find(&jadwalList)

	hasil := map[string][]models.Jadwal{}
	for _, j := range jadwalList {
		hari := namaHari(j.HariKe)
		hasil[hari] = append(hasil[hari], j)
	}
	return hasil
}

// GetJadwalMingguanKelas mengembalikan jadwal satu kelas
// dalam satu semester, dikelompokkan per hari.
func GetJadwalMingguanKelas(kelasID, semesterID uint) map[string][]models.Jadwal {
	var jadwalList []models.Jadwal
	config.DB.
		Preload("Guru").
		Preload("MataPelajaran").
		Where("kelas_id = ? AND semester_id = ?", kelasID, semesterID).
		Order("hari_ke ASC, jam_mulai ASC").
		Find(&jadwalList)

	hasil := map[string][]models.Jadwal{}
	for _, j := range jadwalList {
		hari := namaHari(j.HariKe)
		hasil[hari] = append(hasil[hari], j)
	}
	return hasil
}

// namaHari mengubah int hari ke nama hari
func namaHari(hariKe int) string {
	nama := map[int]string{
		1: "Senin", 2: "Selasa", 3: "Rabu",
		4: "Kamis", 5: "Jumat", 6: "Sabtu",
	}
	if n, ok := nama[hariKe]; ok {
		return n
	}
	return "Tidak diketahui"
}