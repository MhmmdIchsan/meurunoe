package controllers

import (
	"github.com/gin-gonic/gin"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// ── Jurusan ───────────────────────────────────────────────────

// GetJurusan godoc
// @Summary Daftar jurusan
// @Tags Jurusan
// @Security BearerAuth
// @Router /jurusan [get]
func GetJurusan(c *gin.Context) {
	var list []models.Jurusan
	config.DB.Order("nama ASC").Find(&list)
	utils.ResponseOK(c, "Daftar jurusan", list)
}

// GetJurusanByID godoc
// @Summary Detail jurusan
// @Tags Jurusan
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /jurusan/{id} [get]
func GetJurusanByID(c *gin.Context) {
	var j models.Jurusan
	if err := config.DB.First(&j, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Jurusan tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail jurusan", j)
}

// CreateJurusan godoc
// @Summary Buat jurusan baru
// @Tags Jurusan
// @Security BearerAuth
// @Router /jurusan [post]
func CreateJurusan(c *gin.Context) {
	var req struct {
		Kode string `json:"kode" binding:"required,max=10"`
		Nama string `json:"nama" binding:"required,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	var existing models.Jurusan
	if err := config.DB.Where("kode = ?", req.Kode).First(&existing).Error; err == nil {
		utils.ResponseBadRequest(c, "Kode jurusan sudah digunakan", nil)
		return
	}

	j := models.Jurusan{Kode: req.Kode, Nama: req.Nama}
	config.DB.Create(&j)
	utils.ResponseCreated(c, "Jurusan berhasil dibuat", j)
}

// UpdateJurusan godoc
// @Summary Update jurusan
// @Tags Jurusan
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /jurusan/{id} [put]
func UpdateJurusan(c *gin.Context) {
	var j models.Jurusan
	if err := config.DB.First(&j, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Jurusan tidak ditemukan")
		return
	}

	var req struct {
		Kode string `json:"kode"`
		Nama string `json:"nama"`
	}
	c.ShouldBindJSON(&req)

	if req.Kode != "" {
		j.Kode = req.Kode
	}
	if req.Nama != "" {
		j.Nama = req.Nama
	}

	config.DB.Save(&j)
	utils.ResponseOK(c, "Jurusan berhasil diupdate", j)
}

// DeleteJurusan godoc
// @Summary Hapus jurusan
// @Tags Jurusan
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /jurusan/{id} [delete]
func DeleteJurusan(c *gin.Context) {
	var j models.Jurusan
	if err := config.DB.First(&j, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Jurusan tidak ditemukan")
		return
	}

	var count int64
	config.DB.Model(&models.Kelas{}).Where("jurusan_id = ?", j.ID).Count(&count)
	if count > 0 {
		utils.ResponseBadRequest(c, "Jurusan masih memiliki kelas, tidak bisa dihapus", nil)
		return
	}

	config.DB.Delete(&j)
	utils.ResponseOK(c, "Jurusan berhasil dihapus", nil)
}

// ── Mata Pelajaran ────────────────────────────────────────────

// GetMataPelajaran godoc
// @Summary Daftar mata pelajaran
// @Tags Mata Pelajaran
// @Security BearerAuth
// @Param search query string false "Cari nama/kode"
// @Router /mata-pelajaran [get]
func GetMataPelajaran(c *gin.Context) {
	query := config.DB.Model(&models.MataPelajaran{})
	if search := c.Query("search"); search != "" {
		query = query.Where("nama ILIKE ? OR kode ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var list []models.MataPelajaran
	query.Order("nama ASC").Find(&list)
	utils.ResponseOK(c, "Daftar mata pelajaran", list)
}

// GetMataPelajaranByID godoc
// @Summary Detail mata pelajaran
// @Tags Mata Pelajaran
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /mata-pelajaran/{id} [get]
func GetMataPelajaranByID(c *gin.Context) {
	var mp models.MataPelajaran
	if err := config.DB.First(&mp, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Mata pelajaran tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail mata pelajaran", mp)
}

// CreateMataPelajaran godoc
// @Summary Buat mata pelajaran baru
// @Tags Mata Pelajaran
// @Security BearerAuth
// @Router /mata-pelajaran [post]
func CreateMataPelajaran(c *gin.Context) {
	var req struct {
		Kode string  `json:"kode" binding:"required,max=20"`
		Nama string  `json:"nama" binding:"required,max=100"`
		KKM  float64 `json:"kkm"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	var existing models.MataPelajaran
	if err := config.DB.Where("kode = ?", req.Kode).First(&existing).Error; err == nil {
		utils.ResponseBadRequest(c, "Kode mata pelajaran sudah digunakan", nil)
		return
	}

	if req.KKM == 0 {
		req.KKM = 75 // default KKM
	}

	mp := models.MataPelajaran{Kode: req.Kode, Nama: req.Nama, KKM: req.KKM}
	config.DB.Create(&mp)
	utils.ResponseCreated(c, "Mata pelajaran berhasil dibuat", mp)
}

// UpdateMataPelajaran godoc
// @Summary Update mata pelajaran
// @Tags Mata Pelajaran
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /mata-pelajaran/{id} [put]
func UpdateMataPelajaran(c *gin.Context) {
	var mp models.MataPelajaran
	if err := config.DB.First(&mp, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Mata pelajaran tidak ditemukan")
		return
	}

	var req struct {
		Kode string  `json:"kode"`
		Nama string  `json:"nama"`
		KKM  float64 `json:"kkm"`
	}
	c.ShouldBindJSON(&req)

	if req.Kode != "" {
		mp.Kode = req.Kode
	}
	if req.Nama != "" {
		mp.Nama = req.Nama
	}
	if req.KKM > 0 {
		mp.KKM = req.KKM
	}

	config.DB.Save(&mp)
	utils.ResponseOK(c, "Mata pelajaran berhasil diupdate", mp)
}

// DeleteMataPelajaran godoc
// @Summary Hapus mata pelajaran
// @Tags Mata Pelajaran
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /mata-pelajaran/{id} [delete]
func DeleteMataPelajaran(c *gin.Context) {
	var mp models.MataPelajaran
	if err := config.DB.First(&mp, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Mata pelajaran tidak ditemukan")
		return
	}

	var count int64
	config.DB.Model(&models.Jadwal{}).Where("mata_pelajaran_id = ?", mp.ID).Count(&count)
	if count > 0 {
		utils.ResponseBadRequest(c, "Mata pelajaran masih digunakan di jadwal", nil)
		return
	}

	config.DB.Delete(&mp)
	utils.ResponseOK(c, "Mata pelajaran berhasil dihapus", nil)
}