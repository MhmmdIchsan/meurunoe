package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// GetKelas godoc
// @Summary Daftar kelas
// @Tags Kelas
// @Security BearerAuth
// @Param tahun_ajaran_id query int false "Filter tahun ajaran"
// @Param jurusan_id query int false "Filter jurusan"
// @Param tingkat query string false "Filter tingkat: X/XI/XII"
// @Router /kelas [get]
func GetKelas(c *gin.Context) {
	query := config.DB.Model(&models.Kelas{}).
		Preload("Jurusan").
		Preload("WaliKelas").
		Preload("TahunAjaran")

	if taID := c.Query("tahun_ajaran_id"); taID != "" {
		query = query.Where("tahun_ajaran_id = ?", taID)
	}
	if jID := c.Query("jurusan_id"); jID != "" {
		query = query.Where("jurusan_id = ?", jID)
	}
	if tingkat := c.Query("tingkat"); tingkat != "" {
		query = query.Where("tingkat = ?", tingkat)
	}

	var list []models.Kelas
	query.Order("tingkat ASC, nama ASC").Find(&list)
	utils.ResponseOK(c, "Daftar kelas", list)
}

// GetKelasWithJumlahSiswa mengembalikan kelas beserta jumlah siswa di dalamnya
// @Summary Daftar kelas dengan jumlah siswa
// @Tags Kelas
// @Security BearerAuth
// @Router /kelas/summary [get]
func GetKelasWithJumlahSiswa(c *gin.Context) {
	type KelasResult struct {
		models.Kelas
		JumlahSiswa int64 `json:"jumlah_siswa"`
	}

	var kelasList []models.Kelas
	config.DB.Preload("Jurusan").Preload("WaliKelas").Preload("TahunAjaran").
		Order("tingkat ASC, nama ASC").Find(&kelasList)

	results := make([]KelasResult, len(kelasList))
	for i, k := range kelasList {
		var count int64
		config.DB.Model(&models.Siswa{}).Where("kelas_id = ?", k.ID).Count(&count)
		results[i] = KelasResult{Kelas: k, JumlahSiswa: count}
	}

	utils.ResponseOK(c, "Daftar kelas dengan jumlah siswa", results)
}

// GetKelasByID godoc
// @Summary Detail kelas
// @Tags Kelas
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /kelas/{id} [get]
func GetKelasByID(c *gin.Context) {
	var kelas models.Kelas
	if err := config.DB.
		Preload("Jurusan").Preload("WaliKelas").Preload("TahunAjaran").
		First(&kelas, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Kelas tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail kelas", kelas)
}

// GetSiswaByKelas godoc
// @Summary Daftar siswa dalam kelas tertentu
// @Tags Kelas
// @Security BearerAuth
// @Param id path int true "Kelas ID"
// @Router /kelas/{id}/siswa [get]
func GetSiswaByKelas(c *gin.Context) {
	kelasID := c.Param("id")

	// Validasi kelas ada
	var kelas models.Kelas
	if err := config.DB.First(&kelas, kelasID).Error; err != nil {
		utils.ResponseNotFound(c, "Kelas tidak ditemukan")
		return
	}

	var siswaList []models.Siswa
	config.DB.Preload("User").Where("kelas_id = ?", kelasID).Order("nama ASC").Find(&siswaList)

	utils.ResponseOK(c, "Daftar siswa dalam kelas "+kelas.Nama, gin.H{
		"kelas": kelas,
		"siswa": siswaList,
		"total": len(siswaList),
	})
}

// CreateKelas godoc
// @Summary Buat kelas baru
// @Tags Kelas
// @Security BearerAuth
// @Router /kelas [post]
func CreateKelas(c *gin.Context) {
	var req struct {
		Nama          string `json:"nama" binding:"required,max=20"`
		Tingkat       string `json:"tingkat" binding:"required,oneof=X XI XII"`
		JurusanID     uint   `json:"jurusan_id" binding:"required"`
		TahunAjaranID uint   `json:"tahun_ajaran_id" binding:"required"`
		WaliKelasID   *uint  `json:"wali_kelas_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Validasi foreign keys
	var jurusan models.Jurusan
	if err := config.DB.First(&jurusan, req.JurusanID).Error; err != nil {
		utils.ResponseBadRequest(c, "Jurusan tidak ditemukan", nil)
		return
	}
	var ta models.TahunAjaran
	if err := config.DB.First(&ta, req.TahunAjaranID).Error; err != nil {
		utils.ResponseBadRequest(c, "Tahun ajaran tidak ditemukan", nil)
		return
	}

	// Cek nama kelas duplikat dalam tahun ajaran yang sama
	var existing models.Kelas
	if err := config.DB.Where("nama = ? AND tahun_ajaran_id = ?", req.Nama, req.TahunAjaranID).
		First(&existing).Error; err == nil {
		utils.ResponseBadRequest(c, "Nama kelas sudah ada untuk tahun ajaran ini", nil)
		return
	}

	// Jika wali kelas diisi, pastikan guru ada
	if req.WaliKelasID != nil {
		var guru models.Guru
		if err := config.DB.First(&guru, *req.WaliKelasID).Error; err != nil {
			utils.ResponseBadRequest(c, "Guru wali kelas tidak ditemukan", nil)
			return
		}
		// Update role guru ke wali_kelas
		var roleWK models.Role
		if err := config.DB.Where("nama = ?", models.RoleWaliKelas).First(&roleWK).Error; err == nil {
			config.DB.Model(&models.User{}).Where("id = ?", guru.UserID).Update("role_id", roleWK.ID)
		}
	}

	kelas := models.Kelas{
		Nama:          req.Nama,
		Tingkat:       req.Tingkat,
		JurusanID:     req.JurusanID,
		TahunAjaranID: req.TahunAjaranID,
		WaliKelasID:   req.WaliKelasID,
	}
	if err := config.DB.Create(&kelas).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal membuat kelas")
		return
	}

	config.DB.Preload("Jurusan").Preload("WaliKelas").Preload("TahunAjaran").First(&kelas, kelas.ID)
	utils.ResponseCreated(c, "Kelas berhasil dibuat", kelas)
}

// UpdateKelas godoc
// @Summary Update kelas (termasuk ganti wali kelas)
// @Tags Kelas
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /kelas/{id} [put]
func UpdateKelas(c *gin.Context) {
	var kelas models.Kelas
	if err := config.DB.First(&kelas, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Kelas tidak ditemukan")
		return
	}

	var req struct {
		Nama        string `json:"nama"`
		Tingkat     string `json:"tingkat" binding:"omitempty,oneof=X XI XII"`
		WaliKelasID *uint  `json:"wali_kelas_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	if req.Nama != "" {
		kelas.Nama = req.Nama
	}
	if req.Tingkat != "" {
		kelas.Tingkat = req.Tingkat
	}
	if req.WaliKelasID != nil {
		// Validasi guru baru ada
		var guru models.Guru
		if err := config.DB.First(&guru, *req.WaliKelasID).Error; err != nil {
			utils.ResponseBadRequest(c, "Guru wali kelas tidak ditemukan", nil)
			return
		}
		// Update role guru lama (jika ada) kembali ke "guru"
		if kelas.WaliKelasID != nil && *kelas.WaliKelasID != *req.WaliKelasID {
			var guruLama models.Guru
			if err := config.DB.First(&guruLama, *kelas.WaliKelasID).Error; err == nil {
				var roleGuru models.Role
				if err := config.DB.Where("nama = ?", models.RoleGuru).First(&roleGuru).Error; err == nil {
					config.DB.Model(&models.User{}).Where("id = ?", guruLama.UserID).Update("role_id", roleGuru.ID)
				}
			}
		}
		// Update role guru baru ke wali_kelas
		var roleWK models.Role
		if err := config.DB.Where("nama = ?", models.RoleWaliKelas).First(&roleWK).Error; err == nil {
			config.DB.Model(&models.User{}).Where("id = ?", guru.UserID).Update("role_id", roleWK.ID)
		}
		kelas.WaliKelasID = req.WaliKelasID
	}

	config.DB.Save(&kelas)
	config.DB.Preload("Jurusan").Preload("WaliKelas").Preload("TahunAjaran").First(&kelas, kelas.ID)
	utils.ResponseOK(c, "Kelas berhasil diupdate", kelas)
}

// DeleteKelas godoc
// @Summary Hapus kelas
// @Tags Kelas
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /kelas/{id} [delete]
func DeleteKelas(c *gin.Context) {
	var kelas models.Kelas
	if err := config.DB.First(&kelas, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Kelas tidak ditemukan")
		return
	}

	// Cek masih punya siswa
	var count int64
	config.DB.Model(&models.Siswa{}).Where("kelas_id = ?", kelas.ID).Count(&count)
	if count > 0 {
		utils.ResponseBadRequest(c, "Kelas masih memiliki "+strconv.FormatInt(count, 10)+" siswa", nil)
		return
	}

	config.DB.Delete(&kelas)
	utils.ResponseOK(c, "Kelas berhasil dihapus", nil)
}