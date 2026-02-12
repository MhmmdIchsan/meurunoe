package controllers

import (
	"github.com/gin-gonic/gin"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// GetTahunAjaran godoc
// @Summary Daftar semua tahun ajaran
// @Tags Tahun Ajaran
// @Security BearerAuth
// @Router /tahun-ajaran [get]
func GetTahunAjaran(c *gin.Context) {
	var list []models.TahunAjaran
	if err := config.DB.Order("nama DESC").Find(&list).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal mengambil data tahun ajaran")
		return
	}
	utils.ResponseOK(c, "Daftar tahun ajaran", list)
}

// GetTahunAjaranByID godoc
// @Summary Detail tahun ajaran
// @Tags Tahun Ajaran
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /tahun-ajaran/{id} [get]
func GetTahunAjaranByID(c *gin.Context) {
	var ta models.TahunAjaran
	if err := config.DB.First(&ta, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Tahun ajaran tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail tahun ajaran", ta)
}

// CreateTahunAjaran godoc
// @Summary Buat tahun ajaran baru
// @Tags Tahun Ajaran
// @Security BearerAuth
// @Router /tahun-ajaran [post]
func CreateTahunAjaran(c *gin.Context) {
	var req struct {
		Nama    string `json:"nama" binding:"required"`    // "2025/2026"
		IsAktif bool   `json:"is_aktif"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Cek nama sudah ada
	var existing models.TahunAjaran
	if err := config.DB.Where("nama = ?", req.Nama).First(&existing).Error; err == nil {
		utils.ResponseBadRequest(c, "Tahun ajaran sudah ada", nil)
		return
	}

	// Jika di-set aktif, nonaktifkan yang lain dulu
	if req.IsAktif {
		config.DB.Model(&models.TahunAjaran{}).Where("is_aktif = true").Update("is_aktif", false)
	}

	ta := models.TahunAjaran{Nama: req.Nama, IsAktif: req.IsAktif}
	if err := config.DB.Create(&ta).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal membuat tahun ajaran")
		return
	}
	utils.ResponseCreated(c, "Tahun ajaran berhasil dibuat", ta)
}

// UpdateTahunAjaran godoc
// @Summary Update tahun ajaran
// @Tags Tahun Ajaran
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /tahun-ajaran/{id} [put]
func UpdateTahunAjaran(c *gin.Context) {
	var ta models.TahunAjaran
	if err := config.DB.First(&ta, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Tahun ajaran tidak ditemukan")
		return
	}

	var req struct {
		Nama    string `json:"nama"`
		IsAktif *bool  `json:"is_aktif"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	if req.Nama != "" {
		ta.Nama = req.Nama
	}
	if req.IsAktif != nil {
		if *req.IsAktif {
			// Nonaktifkan semua kecuali ini
			config.DB.Model(&models.TahunAjaran{}).Where("id != ?", ta.ID).Update("is_aktif", false)
		}
		ta.IsAktif = *req.IsAktif
	}

	if err := config.DB.Save(&ta).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal mengupdate tahun ajaran")
		return
	}
	utils.ResponseOK(c, "Tahun ajaran berhasil diupdate", ta)
}

// DeleteTahunAjaran godoc
// @Summary Hapus tahun ajaran
// @Tags Tahun Ajaran
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /tahun-ajaran/{id} [delete]
func DeleteTahunAjaran(c *gin.Context) {
	var ta models.TahunAjaran
	if err := config.DB.First(&ta, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Tahun ajaran tidak ditemukan")
		return
	}

	// Cek relasi ke semester & kelas
	var semCount, kelasCount int64
	config.DB.Model(&models.Semester{}).Where("tahun_ajaran_id = ?", ta.ID).Count(&semCount)
	config.DB.Model(&models.Kelas{}).Where("tahun_ajaran_id = ?", ta.ID).Count(&kelasCount)
	if semCount > 0 || kelasCount > 0 {
		utils.ResponseBadRequest(c, "Tahun ajaran masih digunakan, tidak bisa dihapus", nil)
		return
	}

	config.DB.Delete(&ta)
	utils.ResponseOK(c, "Tahun ajaran berhasil dihapus", nil)
}

// ── Semester ──────────────────────────────────────────────────

// GetSemester godoc
// @Summary Daftar semester (bisa filter by tahun_ajaran_id)
// @Tags Semester
// @Security BearerAuth
// @Param tahun_ajaran_id query int false "Filter tahun ajaran"
// @Router /semester [get]
func GetSemester(c *gin.Context) {
	query := config.DB.Model(&models.Semester{}).Preload("TahunAjaran")
	if taID := c.Query("tahun_ajaran_id"); taID != "" {
		query = query.Where("tahun_ajaran_id = ?", taID)
	}
	var list []models.Semester
	query.Order("tahun_ajaran_id DESC, nama ASC").Find(&list)
	utils.ResponseOK(c, "Daftar semester", list)
}

// CreateSemester godoc
// @Summary Buat semester baru
// @Tags Semester
// @Security BearerAuth
// @Router /semester [post]
func CreateSemester(c *gin.Context) {
	var req struct {
		TahunAjaranID uint   `json:"tahun_ajaran_id" binding:"required"`
		Nama          string `json:"nama" binding:"required"`  // "Ganjil" / "Genap"
		IsAktif       bool   `json:"is_aktif"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Cek tahun ajaran ada
	var ta models.TahunAjaran
	if err := config.DB.First(&ta, req.TahunAjaranID).Error; err != nil {
		utils.ResponseBadRequest(c, "Tahun ajaran tidak ditemukan", nil)
		return
	}

	// Cek duplikasi nama dalam tahun ajaran yang sama
	var existing models.Semester
	if err := config.DB.Where("tahun_ajaran_id = ? AND nama = ?", req.TahunAjaranID, req.Nama).First(&existing).Error; err == nil {
		utils.ResponseBadRequest(c, "Semester sudah ada untuk tahun ajaran ini", nil)
		return
	}

	if req.IsAktif {
		config.DB.Model(&models.Semester{}).Where("is_aktif = true").Update("is_aktif", false)
	}

	sem := models.Semester{TahunAjaranID: req.TahunAjaranID, Nama: req.Nama, IsAktif: req.IsAktif}
	config.DB.Create(&sem)
	config.DB.Preload("TahunAjaran").First(&sem, sem.ID)
	utils.ResponseCreated(c, "Semester berhasil dibuat", sem)
}

// UpdateSemester godoc
// @Summary Update semester
// @Tags Semester
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /semester/{id} [put]
func UpdateSemester(c *gin.Context) {
	var sem models.Semester
	if err := config.DB.First(&sem, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Semester tidak ditemukan")
		return
	}

	var req struct {
		Nama    string `json:"nama"`
		IsAktif *bool  `json:"is_aktif"`
	}
	c.ShouldBindJSON(&req)

	if req.Nama != "" {
		sem.Nama = req.Nama
	}
	if req.IsAktif != nil {
		if *req.IsAktif {
			config.DB.Model(&models.Semester{}).Where("id != ?", sem.ID).Update("is_aktif", false)
		}
		sem.IsAktif = *req.IsAktif
	}

	config.DB.Save(&sem)
	config.DB.Preload("TahunAjaran").First(&sem, sem.ID)
	utils.ResponseOK(c, "Semester berhasil diupdate", sem)
}

// DeleteSemester godoc
// @Summary Hapus semester
// @Tags Semester
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /semester/{id} [delete]
func DeleteSemester(c *gin.Context) {
	var sem models.Semester
	if err := config.DB.First(&sem, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Semester tidak ditemukan")
		return
	}

	var count int64
	config.DB.Model(&models.Jadwal{}).Where("semester_id = ?", sem.ID).Count(&count)
	if count > 0 {
		utils.ResponseBadRequest(c, "Semester masih digunakan oleh jadwal", nil)
		return
	}

	config.DB.Delete(&sem)
	utils.ResponseOK(c, "Semester berhasil dihapus", nil)
}