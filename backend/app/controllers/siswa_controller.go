package controllers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// ── DTOs ──────────────────────────────────────────────────────

type CreateSiswaRequest struct {
	// Akun login
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	// Data siswa
	NISN         string `json:"nisn" binding:"required"`
	NIS          string `json:"nis"`
	Nama         string `json:"nama" binding:"required,min=3,max=100"`
	JenisKelamin string `json:"jenis_kelamin" binding:"oneof=L P ''"`
	TanggalLahir string `json:"tanggal_lahir"` // format "2006-01-02"
	Alamat       string `json:"alamat"`
	KelasID      *uint  `json:"kelas_id"`
}

type UpdateSiswaRequest struct {
	NISN         string `json:"nisn"`
	NIS          string `json:"nis"`
	Nama         string `json:"nama" binding:"omitempty,min=3,max=100"`
	JenisKelamin string `json:"jenis_kelamin"`
	TanggalLahir string `json:"tanggal_lahir"`
	Alamat       string `json:"alamat"`
	KelasID      *uint  `json:"kelas_id"`
	Email        string `json:"email" binding:"omitempty,email"`
	IsActive     *bool  `json:"is_active"`
}

// ── Handlers ──────────────────────────────────────────────────

// GetSiswa godoc
// @Summary Daftar semua siswa
// @Tags Siswa
// @Security BearerAuth
// @Param page query int false "Halaman"
// @Param limit query int false "Limit"
// @Param search query string false "Cari nama/NISN/NIS"
// @Param kelas_id query int false "Filter kelas"
// @Router /siswa [get]
func GetSiswa(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "15"))
	search := c.Query("search")
	kelasID := c.Query("kelas_id")

	if page < 1 {
		page = 1
	}

	query := config.DB.Model(&models.Siswa{}).
		Preload("User").
		Preload("Kelas.Jurusan")

	if search != "" {
		query = query.Where("nama ILIKE ? OR nisn ILIKE ? OR nis ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}
	if kelasID != "" {
		query = query.Where("kelas_id = ?", kelasID)
	}

	var total int64
	query.Count(&total)

	var list []models.Siswa
	query.Offset((page - 1) * limit).Limit(limit).Order("nama ASC").Find(&list)

	utils.ResponsePaginated(c, "Daftar siswa", list, page, limit, total)
}

// GetSiswaByID godoc
// @Summary Detail siswa
// @Tags Siswa
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /siswa/{id} [get]
func GetSiswaByID(c *gin.Context) {
	var siswa models.Siswa
	if err := config.DB.
		Preload("User").
		Preload("Kelas.Jurusan").
		Preload("Kelas.WaliKelas").
		First(&siswa, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Siswa tidak ditemukan")
		return
	}

	// Ambil data orang tua
	var orangTuaList []models.OrangTuaSiswa
	config.DB.Preload("OrangTua.User").Where("siswa_id = ?", siswa.ID).Find(&orangTuaList)

	utils.ResponseOK(c, "Detail siswa", gin.H{
		"siswa":      siswa,
		"orang_tua":  orangTuaList,
	})
}

// CreateSiswa godoc
// @Summary Daftarkan siswa baru beserta akun login
// @Tags Siswa
// @Security BearerAuth
// @Router /siswa [post]
func CreateSiswa(c *gin.Context) {
	var req CreateSiswaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Cek email belum terpakai
	var existingUser models.User
	if err := config.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		utils.ResponseBadRequest(c, "Email sudah digunakan", nil)
		return
	}

	// Cek NISN belum terpakai
	var existingSiswa models.Siswa
	if err := config.DB.Where("nisn = ?", req.NISN).First(&existingSiswa).Error; err == nil {
		utils.ResponseBadRequest(c, "NISN sudah terdaftar", nil)
		return
	}

	// Ambil role siswa
	var roleSiswa models.Role
	if err := config.DB.Where("nama = ?", models.RoleSiswa).First(&roleSiswa).Error; err != nil {
		utils.ResponseInternalError(c, "Role siswa tidak ditemukan")
		return
	}

	// Parse tanggal lahir
	var tanggalLahir *time.Time
	if req.TanggalLahir != "" {
		t, err := time.Parse("2006-01-02", req.TanggalLahir)
		if err != nil {
			utils.ResponseBadRequest(c, "Format tanggal lahir tidak valid (gunakan YYYY-MM-DD)", nil)
			return
		}
		tanggalLahir = &t
	}

	var siswa models.Siswa
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		user := models.User{
			RoleID:   roleSiswa.ID,
			Nama:     req.Nama,
			Email:    req.Email,
			Password: req.Password,
			IsActive: true,
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		siswa = models.Siswa{
			UserID:       user.ID,
			NISN:         req.NISN,
			NIS:          req.NIS,
			Nama:         req.Nama,
			JenisKelamin: req.JenisKelamin,
			TanggalLahir: tanggalLahir,
			Alamat:       req.Alamat,
			KelasID:      req.KelasID,
		}
		return tx.Create(&siswa).Error
	})

	if err != nil {
		utils.ResponseInternalError(c, "Gagal mendaftarkan siswa")
		return
	}

	config.DB.Preload("User").Preload("Kelas.Jurusan").First(&siswa, siswa.ID)
	utils.ResponseCreated(c, "Siswa berhasil didaftarkan", siswa)
}

// UpdateSiswa godoc
// @Summary Update data siswa
// @Tags Siswa
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /siswa/{id} [put]
func UpdateSiswa(c *gin.Context) {
	var siswa models.Siswa
	if err := config.DB.Preload("User").First(&siswa, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Siswa tidak ditemukan")
		return
	}

	var req UpdateSiswaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		siswaUpdates := map[string]interface{}{}
		if req.NISN != "" {
			siswaUpdates["nisn"] = req.NISN
		}
		if req.NIS != "" {
			siswaUpdates["nis"] = req.NIS
		}
		if req.Nama != "" {
			siswaUpdates["nama"] = req.Nama
		}
		if req.JenisKelamin != "" {
			siswaUpdates["jenis_kelamin"] = req.JenisKelamin
		}
		if req.Alamat != "" {
			siswaUpdates["alamat"] = req.Alamat
		}
		if req.KelasID != nil {
			siswaUpdates["kelas_id"] = req.KelasID
		}
		if req.TanggalLahir != "" {
			t, err := time.Parse("2006-01-02", req.TanggalLahir)
			if err != nil {
				return err
			}
			siswaUpdates["tanggal_lahir"] = t
		}
		if len(siswaUpdates) > 0 {
			if err := tx.Model(&siswa).Updates(siswaUpdates).Error; err != nil {
				return err
			}
		}

		// Update user
		userUpdates := map[string]interface{}{}
		if req.Nama != "" {
			userUpdates["nama"] = req.Nama
		}
		if req.Email != "" {
			userUpdates["email"] = req.Email
		}
		if req.IsActive != nil {
			userUpdates["is_active"] = *req.IsActive
		}
		if len(userUpdates) > 0 {
			return tx.Model(&models.User{}).Where("id = ?", siswa.UserID).Updates(userUpdates).Error
		}
		return nil
	})

	if err != nil {
		utils.ResponseInternalError(c, "Gagal mengupdate data siswa")
		return
	}

	config.DB.Preload("User").Preload("Kelas.Jurusan").First(&siswa, siswa.ID)
	utils.ResponseOK(c, "Data siswa berhasil diupdate", siswa)
}

// PindahKelas godoc
// @Summary Pindahkan siswa ke kelas lain
// @Tags Siswa
// @Security BearerAuth
// @Param id path int true "Siswa ID"
// @Router /siswa/{id}/pindah-kelas [patch]
func PindahKelas(c *gin.Context) {
	var siswa models.Siswa
	if err := config.DB.First(&siswa, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Siswa tidak ditemukan")
		return
	}

	var req struct {
		KelasID uint   `json:"kelas_id" binding:"required"`
		Alasan  string `json:"alasan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	var kelas models.Kelas
	if err := config.DB.Preload("Jurusan").First(&kelas, req.KelasID).Error; err != nil {
		utils.ResponseBadRequest(c, "Kelas tujuan tidak ditemukan", nil)
		return
	}

	config.DB.Model(&siswa).Update("kelas_id", req.KelasID)
	config.DB.Preload("User").Preload("Kelas.Jurusan").First(&siswa, siswa.ID)

	utils.ResponseOK(c, "Siswa berhasil dipindah ke kelas "+kelas.Nama, siswa)
}

// DeleteSiswa godoc
// @Summary Hapus siswa (soft delete)
// @Tags Siswa
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /siswa/{id} [delete]
func DeleteSiswa(c *gin.Context) {
	var siswa models.Siswa
	if err := config.DB.First(&siswa, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Siswa tidak ditemukan")
		return
	}

	config.DB.Transaction(func(tx *gorm.DB) error {
		tx.Delete(&siswa)
		tx.Model(&models.User{}).Where("id = ?", siswa.UserID).Update("is_active", false)
		return nil
	})

	utils.ResponseOK(c, "Data siswa berhasil dihapus", nil)
}

// ── Orang Tua ─────────────────────────────────────────────────

// LinkOrangTuaSiswa godoc
// @Summary Hubungkan orang tua dengan siswa
// @Tags Siswa
// @Security BearerAuth
// @Param id path int true "Siswa ID"
// @Router /siswa/{id}/orang-tua [post]
func LinkOrangTuaSiswa(c *gin.Context) {
	siswaID, _ := strconv.Atoi(c.Param("id"))

	var siswa models.Siswa
	if err := config.DB.First(&siswa, siswaID).Error; err != nil {
		utils.ResponseNotFound(c, "Siswa tidak ditemukan")
		return
	}

	var req struct {
		OrangTuaID uint   `json:"orang_tua_id" binding:"required"`
		Hubungan   string `json:"hubungan" binding:"required,oneof=Ayah Ibu Wali"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	var ot models.OrangTua
	if err := config.DB.First(&ot, req.OrangTuaID).Error; err != nil {
		utils.ResponseBadRequest(c, "Data orang tua tidak ditemukan", nil)
		return
	}

	// Cek relasi belum ada
	var existing models.OrangTuaSiswa
	if err := config.DB.Where("orang_tua_id = ? AND siswa_id = ?", req.OrangTuaID, siswaID).
		First(&existing).Error; err == nil {
		utils.ResponseBadRequest(c, "Relasi orang tua – siswa sudah ada", nil)
		return
	}

	link := models.OrangTuaSiswa{
		OrangTuaID: req.OrangTuaID,
		SiswaID:    uint(siswaID),
		Hubungan:   req.Hubungan,
	}
	config.DB.Create(&link)
	utils.ResponseCreated(c, "Orang tua berhasil dihubungkan", link)
}