package controllers

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jung-kurt/gofpdf"
	"sim-sekolah/app/middlewares"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// ── Handlers ──────────────────────────────────────────────────

// GetRapor godoc
// @Summary Daftar rapor
// @Tags Rapor
// @Security BearerAuth
// @Param siswa_id query int false "Filter siswa"
// @Param semester_id query int false "Filter semester"
// @Router /rapor [get]
func GetRapor(c *gin.Context) {
	query := config.DB.Model(&models.Rapor{}).
		Preload("Siswa.Kelas").
		Preload("Semester.TahunAjaran")

	if v := c.Query("siswa_id"); v != "" {
		query = query.Where("siswa_id = ?", v)
	}
	if v := c.Query("semester_id"); v != "" {
		query = query.Where("semester_id = ?", v)
	}

	var list []models.Rapor
	query.Order("created_at DESC").Find(&list)
	utils.ResponseOK(c, "Daftar rapor", list)
}

// GetRaporByID godoc
// @Summary Detail rapor
// @Tags Rapor
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /rapor/{id} [get]
func GetRaporByID(c *gin.Context) {
	var rapor models.Rapor
	err := config.DB.
		Preload("Siswa.Kelas.Jurusan").
		Preload("Semester.TahunAjaran").
		First(&rapor, c.Param("id")).Error
	if err != nil {
		utils.ResponseNotFound(c, "Rapor tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail rapor", rapor)
}

// GenerateRapor godoc
// @Summary Generate rapor PDF untuk siswa di semester tertentu
// @Tags Rapor
// @Security BearerAuth
// @Router /rapor/generate [post]
func GenerateRapor(c *gin.Context) {
	var req struct {
		SiswaID    uint `json:"siswa_id" binding:"required"`
		SemesterID uint `json:"semester_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Validasi FK
	var siswa models.Siswa
	if err := config.DB.Preload("Kelas.Jurusan").Preload("Kelas.WaliKelas").First(&siswa, req.SiswaID).Error; err != nil {
		utils.ResponseBadRequest(c, "Siswa tidak ditemukan", nil)
		return
	}
	var semester models.Semester
	if err := config.DB.Preload("TahunAjaran").First(&semester, req.SemesterID).Error; err != nil {
		utils.ResponseBadRequest(c, "Semester tidak ditemukan", nil)
		return
	}

	// Ambil semua nilai siswa di semester ini
	var nilaiList []models.Nilai
	config.DB.Preload("MataPelajaran").
		Where("siswa_id = ? AND semester_id = ?", req.SiswaID, req.SemesterID).
		Order("mata_pelajaran_id ASC").
		Find(&nilaiList)

	if len(nilaiList) == 0 {
		utils.ResponseBadRequest(c, "Belum ada nilai untuk siswa di semester ini", nil)
		return
	}

	// Ambil data absensi (ringkasan)
	// type AbsensiRekap struct {
	// 	Hadir int64
	// 	Izin  int64
	// 	Sakit int64
	// 	Alfa  int64
	// }
	var absensiRekap AbsensiRekap
	config.DB.Model(&models.Absensi{}).
		Select("SUM(CASE WHEN status='hadir' THEN 1 ELSE 0 END) as hadir, "+
			"SUM(CASE WHEN status='izin' THEN 1 ELSE 0 END) as izin, "+
			"SUM(CASE WHEN status='sakit' THEN 1 ELSE 0 END) as sakit, "+
			"SUM(CASE WHEN status='alfa' THEN 1 ELSE 0 END) as alfa").
		Joins("JOIN jadwals ON jadwals.id = absensis.jadwal_id").
		Where("absensis.siswa_id = ? AND jadwals.semester_id = ?", req.SiswaID, req.SemesterID).
		Scan(&absensiRekap)

	// Generate PDF
	filename := fmt.Sprintf("rapor_%d_sem%d_%d.pdf", req.SiswaID, req.SemesterID, time.Now().Unix())
	outputDir := "./storage/rapor"
	os.MkdirAll(outputDir, 0755)
	filepath := filepath.Join(outputDir, filename)

	err := buatPDFRapor(filepath, siswa, semester, nilaiList, absensiRekap)
	if err != nil {
		utils.ResponseInternalError(c, "Gagal membuat PDF rapor: "+err.Error())
		return
	}

	// Simpan record rapor ke DB
	rapor := models.Rapor{
		SiswaID:    req.SiswaID,
		SemesterID: req.SemesterID,
		FilePath:   filepath,
		Status:     "published",
	}
	config.DB.Create(&rapor)
	config.DB.Preload("Siswa").Preload("Semester").First(&rapor, rapor.ID)

	utils.ResponseCreated(c, "Rapor berhasil digenerate", gin.H{
		"rapor":    rapor,
		"download": "/api/v1/rapor/" + strconv.Itoa(int(rapor.ID)) + "/download",
	})
}

// DownloadRapor godoc
// @Summary Download file PDF rapor
// @Tags Rapor
// @Security BearerAuth
// @Param id path int true "Rapor ID"
// @Router /rapor/{id}/download [get]
func DownloadRapor(c *gin.Context) {
	var rapor models.Rapor
	if err := config.DB.First(&rapor, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Rapor tidak ditemukan")
		return
	}

	// Cek file ada
	if _, err := os.Stat(rapor.FilePath); os.IsNotExist(err) {
		utils.ResponseNotFound(c, "File rapor tidak ditemukan di server")
		return
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+filepath.Base(rapor.FilePath))
	c.Header("Content-Type", "application/pdf")
	c.File(rapor.FilePath)
}

// GetRaporSaya godoc
// @Summary Rapor untuk siswa/orang tua yang sedang login
// @Tags Rapor
// @Security BearerAuth
// @Router /rapor/saya [get]
func GetRaporSaya(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)

	switch claims.Role {
	case models.RoleSiswa:
		var siswa models.Siswa
		if err := config.DB.Where("user_id = ?", claims.UserID).First(&siswa).Error; err != nil {
			utils.ResponseNotFound(c, "Data siswa tidak ditemukan")
			return
		}
		var raporList []models.Rapor
		config.DB.Preload("Semester.TahunAjaran").
			Where("siswa_id = ?", siswa.ID).
			Order("created_at DESC").
			Find(&raporList)
		utils.ResponseOK(c, "Daftar rapor saya", raporList)

	case models.RoleOrangTua:
		var ot models.OrangTua
		if err := config.DB.Where("user_id = ?", claims.UserID).First(&ot).Error; err != nil {
			utils.ResponseNotFound(c, "Data orang tua tidak ditemukan")
			return
		}
		var link models.OrangTuaSiswa
		if err := config.DB.Where("orang_tua_id = ?", ot.ID).First(&link).Error; err != nil {
			utils.ResponseBadRequest(c, "Belum ada data anak terdaftar", nil)
			return
		}
		var raporList []models.Rapor
		config.DB.Preload("Semester.TahunAjaran").Preload("Siswa").
			Where("siswa_id = ?", link.SiswaID).
			Order("created_at DESC").
			Find(&raporList)
		utils.ResponseOK(c, "Daftar rapor anak", raporList)

	default:
		utils.ResponseForbidden(c, "Role ini tidak memiliki rapor personal")
	}
}

// DeleteRapor godoc
// @Summary Hapus rapor (soft, ubah status jadi draft)
// @Tags Rapor
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /rapor/{id} [delete]
func DeleteRapor(c *gin.Context) {
	var rapor models.Rapor
	if err := config.DB.First(&rapor, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Rapor tidak ditemukan")
		return
	}
	// Soft delete: ubah status jadi draft
	config.DB.Model(&rapor).Update("status", "draft")
	utils.ResponseOK(c, "Rapor berhasil diarsipkan (status: draft)", nil)
}

// ── PDF Generator ─────────────────────────────────────────────

type AbsensiRekap struct {
	Hadir int64
	Izin  int64
	Sakit int64
	Alfa  int64
}

func buatPDFRapor(
	outputPath string,
	siswa models.Siswa,
	semester models.Semester,
	nilaiList []models.Nilai,
	absensi AbsensiRekap,
) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Header
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, "RAPOR SISWA")
	pdf.Ln(6)
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, "Tahun Ajaran: "+semester.TahunAjaran.Nama+" - Semester "+semester.Nama)
	pdf.Ln(10)

	// Identitas Siswa
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(0, 6, "IDENTITAS SISWA")
	pdf.Ln(6)
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(40, 6, "Nama")
	pdf.Cell(5, 6, ":")
	pdf.Cell(0, 6, siswa.Nama)
	pdf.Ln(5)
	pdf.Cell(40, 6, "NISN")
	pdf.Cell(5, 6, ":")
	pdf.Cell(0, 6, siswa.NISN)
	pdf.Ln(5)
	if siswa.Kelas != nil {
		pdf.Cell(40, 6, "Kelas")
		pdf.Cell(5, 6, ":")
		pdf.Cell(0, 6, siswa.Kelas.Nama)
		pdf.Ln(5)
	}
	pdf.Ln(5)

	// Tabel Nilai
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(0, 6, "DAFTAR NILAI")
	pdf.Ln(6)

	// Header tabel
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(220, 220, 220)
	pdf.CellFormat(10, 7, "No", "1", 0, "C", true, 0, "")
	pdf.CellFormat(70, 7, "Mata Pelajaran", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 7, "Harian", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 7, "UTS", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 7, "UAS", "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 7, "Akhir", "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 7, "Predikat", "1", 0, "C", true, 0, "")
	pdf.Ln(-1)

	// Isi tabel
	pdf.SetFont("Arial", "", 9)
	totalNilai := 0.0
	for i, n := range nilaiList {
		pdf.CellFormat(10, 6, strconv.Itoa(i+1), "1", 0, "C", false, 0, "")
		pdf.CellFormat(70, 6, n.MataPelajaran.Nama, "1", 0, "L", false, 0, "")
		pdf.CellFormat(20, 6, fmt.Sprintf("%.1f", n.NilaiHarian), "1", 0, "C", false, 0, "")
		pdf.CellFormat(20, 6, fmt.Sprintf("%.1f", n.NilaiUTS), "1", 0, "C", false, 0, "")
		pdf.CellFormat(20, 6, fmt.Sprintf("%.1f", n.NilaiUAS), "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 6, fmt.Sprintf("%.2f", n.NilaiAkhir), "1", 0, "C", false, 0, "")
		pdf.CellFormat(25, 6, n.Predikat, "1", 0, "C", false, 0, "")
		pdf.Ln(-1)
		totalNilai += n.NilaiAkhir
	}

	// Rata-rata
	rataRata := totalNilai / float64(len(nilaiList))
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(140, 6, "RATA-RATA", "1", 0, "R", false, 0, "")
	pdf.CellFormat(25, 6, fmt.Sprintf("%.2f", rataRata), "1", 0, "C", false, 0, "")
	pdf.CellFormat(25, 6, tentukanPredikat(rataRata), "1", 0, "C", false, 0, "")
	pdf.Ln(10)

	// Kehadiran
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(0, 6, "KEHADIRAN")
	pdf.Ln(6)
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(40, 6, "Hadir")
	pdf.Cell(5, 6, ":")
	pdf.Cell(0, 6, fmt.Sprintf("%d hari", absensi.Hadir))
	pdf.Ln(5)
	pdf.Cell(40, 6, "Izin")
	pdf.Cell(5, 6, ":")
	pdf.Cell(0, 6, fmt.Sprintf("%d hari", absensi.Izin))
	pdf.Ln(5)
	pdf.Cell(40, 6, "Sakit")
	pdf.Cell(5, 6, ":")
	pdf.Cell(0, 6, fmt.Sprintf("%d hari", absensi.Sakit))
	pdf.Ln(5)
	pdf.Cell(40, 6, "Alfa")
	pdf.Cell(5, 6, ":")
	pdf.Cell(0, 6, fmt.Sprintf("%d hari", absensi.Alfa))
	pdf.Ln(15)

	// TTD
	pdf.SetFont("Arial", "", 9)
	pdf.Cell(100, 6, "")
	pdf.Cell(0, 6, "Banda Aceh, "+time.Now().Format("02 January 2006"))
	pdf.Ln(5)
	pdf.Cell(100, 6, "Orang Tua / Wali")
	pdf.Cell(0, 6, "Wali Kelas")
	pdf.Ln(20)
	pdf.Cell(100, 6, "___________________")
	if siswa.Kelas != nil && siswa.Kelas.WaliKelas != nil {
		pdf.Cell(0, 6, siswa.Kelas.WaliKelas.Nama)
	} else {
		pdf.Cell(0, 6, "___________________")
	}

	return pdf.OutputFileAndClose(outputPath)
}

// Helper untuk predikat (sama seperti di nilai_controller)
// func tentukanPredikat(nilaiAkhir float64) string {
// 	if nilaiAkhir >= 90 {
// 		return "A"
// 	} else if nilaiAkhir >= 80 {
// 		return "B"
// 	} else if nilaiAkhir >= 70 {
// 		return "C"
// 	} else if nilaiAkhir >= 60 {
// 		return "D"
// 	}
// 	return "E"
// }