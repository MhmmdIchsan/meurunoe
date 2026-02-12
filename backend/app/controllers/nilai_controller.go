package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"sim-sekolah/app/middlewares"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// ── DTOs ──────────────────────────────────────────────────────

type InputNilaiRequest struct {
	SiswaID         uint    `json:"siswa_id" binding:"required"`
	MataPelajaranID uint    `json:"mata_pelajaran_id" binding:"required"`
	SemesterID      uint    `json:"semester_id" binding:"required"`
	NilaiHarian     float64 `json:"nilai_harian" binding:"min=0,max=100"`
	NilaiUTS        float64 `json:"nilai_uts" binding:"min=0,max=100"`
	NilaiUAS        float64 `json:"nilai_uas" binding:"min=0,max=100"`
}

// ── Handlers ──────────────────────────────────────────────────

// GetNilai godoc
// @Summary Daftar nilai (bisa filter siswa, mapel, semester)
// @Tags Nilai
// @Security BearerAuth
// @Param siswa_id query int false "Filter siswa"
// @Param mata_pelajaran_id query int false "Filter mata pelajaran"
// @Param semester_id query int false "Filter semester"
// @Router /nilai [get]
func GetNilai(c *gin.Context) {
	query := config.DB.Model(&models.Nilai{}).
		Preload("Siswa.Kelas").
		Preload("MataPelajaran").
		Preload("Semester.TahunAjaran")

	if v := c.Query("siswa_id"); v != "" {
		query = query.Where("siswa_id = ?", v)
	}
	if v := c.Query("mata_pelajaran_id"); v != "" {
		query = query.Where("mata_pelajaran_id = ?", v)
	}
	if v := c.Query("semester_id"); v != "" {
		query = query.Where("semester_id = ?", v)
	}

	var list []models.Nilai
	query.Order("semester_id DESC, siswa_id ASC").Find(&list)
	utils.ResponseOK(c, "Daftar nilai", list)
}

// GetNilaiByID godoc
// @Summary Detail nilai
// @Tags Nilai
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /nilai/{id} [get]
func GetNilaiByID(c *gin.Context) {
	var nilai models.Nilai
	err := config.DB.
		Preload("Siswa.Kelas").
		Preload("MataPelajaran").
		Preload("Semester.TahunAjaran").
		First(&nilai, c.Param("id")).Error
	if err != nil {
		utils.ResponseNotFound(c, "Data nilai tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail nilai", nilai)
}

// InputNilai godoc
// @Summary Input nilai siswa (auto-hitung nilai akhir & predikat)
// @Tags Nilai
// @Security BearerAuth
// @Router /nilai [post]
func InputNilai(c *gin.Context) {
	var req InputNilaiRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Validasi FK
	var siswa models.Siswa
	if err := config.DB.First(&siswa, req.SiswaID).Error; err != nil {
		utils.ResponseBadRequest(c, "Siswa tidak ditemukan", nil)
		return
	}
	var mapel models.MataPelajaran
	if err := config.DB.First(&mapel, req.MataPelajaranID).Error; err != nil {
		utils.ResponseBadRequest(c, "Mata pelajaran tidak ditemukan", nil)
		return
	}
	var semester models.Semester
	if err := config.DB.First(&semester, req.SemesterID).Error; err != nil {
		utils.ResponseBadRequest(c, "Semester tidak ditemukan", nil)
		return
	}

	// Cek duplikasi: 1 siswa 1 mapel 1 semester = 1 record nilai
	var existing models.Nilai
	err := config.DB.Where("siswa_id = ? AND mata_pelajaran_id = ? AND semester_id = ?",
		req.SiswaID, req.MataPelajaranID, req.SemesterID).First(&existing).Error
	if err == nil {
		utils.ResponseBadRequest(c, "Nilai untuk siswa, mapel, dan semester ini sudah ada. Gunakan PUT untuk update.", nil)
		return
	}

	// Hitung nilai akhir dan predikat
	nilaiAkhir := hitungNilaiAkhir(req.NilaiHarian, req.NilaiUTS, req.NilaiUAS)
	predikat := tentukanPredikat(nilaiAkhir)

	nilai := models.Nilai{
		SiswaID:         req.SiswaID,
		MataPelajaranID: req.MataPelajaranID,
		SemesterID:      req.SemesterID,
		NilaiHarian:     req.NilaiHarian,
		NilaiUTS:        req.NilaiUTS,
		NilaiUAS:        req.NilaiUAS,
		NilaiAkhir:      nilaiAkhir,
		Predikat:        predikat,
	}
	config.DB.Create(&nilai)
	config.DB.Preload("Siswa").Preload("MataPelajaran").Preload("Semester").First(&nilai, nilai.ID)

	utils.ResponseCreated(c, "Nilai berhasil diinput", nilai)
}

// UpdateNilai godoc
// @Summary Update nilai (auto-recalculate akhir & predikat)
// @Tags Nilai
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /nilai/{id} [put]
func UpdateNilai(c *gin.Context) {
	var nilai models.Nilai
	if err := config.DB.First(&nilai, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Data nilai tidak ditemukan")
		return
	}

	var req struct {
		NilaiHarian float64 `json:"nilai_harian" binding:"omitempty,min=0,max=100"`
		NilaiUTS    float64 `json:"nilai_uts" binding:"omitempty,min=0,max=100"`
		NilaiUAS    float64 `json:"nilai_uas" binding:"omitempty,min=0,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Update nilai komponen
	if req.NilaiHarian > 0 {
		nilai.NilaiHarian = req.NilaiHarian
	}
	if req.NilaiUTS > 0 {
		nilai.NilaiUTS = req.NilaiUTS
	}
	if req.NilaiUAS > 0 {
		nilai.NilaiUAS = req.NilaiUAS
	}

	// Recalculate
	nilai.NilaiAkhir = hitungNilaiAkhir(nilai.NilaiHarian, nilai.NilaiUTS, nilai.NilaiUAS)
	nilai.Predikat = tentukanPredikat(nilai.NilaiAkhir)

	config.DB.Save(&nilai)
	config.DB.Preload("Siswa").Preload("MataPelajaran").Preload("Semester").First(&nilai, nilai.ID)
	utils.ResponseOK(c, "Nilai berhasil diupdate", nilai)
}

// DeleteNilai godoc
// @Summary Hapus nilai
// @Tags Nilai
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /nilai/{id} [delete]
func DeleteNilai(c *gin.Context) {
	var nilai models.Nilai
	if err := config.DB.First(&nilai, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Data nilai tidak ditemukan")
		return
	}
	config.DB.Delete(&nilai)
	utils.ResponseOK(c, "Nilai berhasil dihapus", nil)
}

// ── Rekap & Rapor ─────────────────────────────────────────────

// GetNilaiSiswa godoc
// @Summary Daftar nilai seorang siswa dalam satu semester
// @Tags Nilai
// @Security BearerAuth
// @Param siswa_id path int true "Siswa ID"
// @Param semester_id query int true "Semester ID"
// @Router /nilai/siswa/{siswa_id} [get]
func GetNilaiSiswa(c *gin.Context) {
	siswaID := c.Param("siswa_id")
	semesterID := c.Query("semester_id")

	if semesterID == "" {
		utils.ResponseBadRequest(c, "Parameter semester_id wajib diisi", nil)
		return
	}

	var siswa models.Siswa
	if err := config.DB.Preload("Kelas.Jurusan").First(&siswa, siswaID).Error; err != nil {
		utils.ResponseNotFound(c, "Siswa tidak ditemukan")
		return
	}

	var nilaiList []models.Nilai
	config.DB.
		Preload("MataPelajaran").
		Where("siswa_id = ? AND semester_id = ?", siswaID, semesterID).
		Order("mata_pelajaran_id ASC").
		Find(&nilaiList)

	// Hitung rata-rata
	total := 0.0
	for _, n := range nilaiList {
		total += n.NilaiAkhir
	}
	rataRata := 0.0
	if len(nilaiList) > 0 {
		rataRata = total / float64(len(nilaiList))
	}

	utils.ResponseOK(c, "Daftar nilai siswa", gin.H{
		"siswa":          siswa,
		"nilai":          nilaiList,
		"total_mapel":    len(nilaiList),
		"rata_rata":      rataRata,
		"predikat_umum":  tentukanPredikat(rataRata),
	})
}

// GetNilaiSaya godoc
// @Summary Nilai untuk siswa yang sedang login
// @Tags Nilai
// @Security BearerAuth
// @Param semester_id query int true "Semester ID"
// @Router /nilai/saya [get]
func GetNilaiSaya(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	semesterID := c.Query("semester_id")

	if semesterID == "" {
		utils.ResponseBadRequest(c, "Parameter semester_id wajib diisi", nil)
		return
	}

	if claims.Role != models.RoleSiswa {
		utils.ResponseForbidden(c, "Endpoint ini hanya untuk siswa", nil)
		return
	}

	var siswa models.Siswa
	if err := config.DB.Where("user_id = ?", claims.UserID).First(&siswa).Error; err != nil {
		utils.ResponseNotFound(c, "Data siswa tidak ditemukan")
		return
	}

	c.Params = append(c.Params, gin.Param{Key: "siswa_id", Value: strconv.Itoa(int(siswa.ID))})
	GetNilaiSiswa(c)
}

// ── Helper Functions ──────────────────────────────────────────

// hitungNilaiAkhir dengan bobot: Harian 40%, UTS 30%, UAS 30%
func hitungNilaiAkhir(harian, uts, uas float64) float64 {
	return (harian * 0.4) + (uts * 0.3) + (uas * 0.3)
}

// tentukanPredikat berdasarkan nilai akhir
func tentukanPredikat(nilaiAkhir float64) string {
	if nilaiAkhir >= 90 {
		return "A"
	} else if nilaiAkhir >= 80 {
		return "B"
	} else if nilaiAkhir >= 70 {
		return "C"
	} else if nilaiAkhir >= 60 {
		return "D"
	}
	return "E"
}