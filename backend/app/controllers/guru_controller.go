package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
	"gorm.io/gorm"
)

// ── DTOs ──────────────────────────────────────────────────────

type CreateGuruRequest struct {
	// Data User (akun login)
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	// Data Guru
	NIP          string `json:"nip"`
	Nama         string `json:"nama" binding:"required,min=3,max=100"`
	JenisKelamin string `json:"jenis_kelamin" binding:"oneof=L P ''"`
	Alamat       string `json:"alamat"`
	Telepon      string `json:"telepon"`
}

type UpdateGuruRequest struct {
	NIP          string `json:"nip"`
	Nama         string `json:"nama" binding:"omitempty,min=3,max=100"`
	JenisKelamin string `json:"jenis_kelamin"`
	Alamat       string `json:"alamat"`
	Telepon      string `json:"telepon"`
	// Untuk update email / status akun
	Email    string `json:"email" binding:"omitempty,email"`
	IsActive *bool  `json:"is_active"`
}

// ── Handlers ──────────────────────────────────────────────────

// GetGuru godoc
// @Summary Daftar semua guru
// @Tags Guru
// @Security BearerAuth
// @Param page query int false "Halaman"
// @Param limit query int false "Limit"
// @Param search query string false "Cari nama/NIP"
// @Router /guru [get]
func GetGuru(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}

	query := config.DB.Model(&models.Guru{}).Preload("User.Role")
	if search != "" {
		query = query.Where("nama ILIKE ? OR nip ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var list []models.Guru
	query.Offset((page - 1) * limit).Limit(limit).Order("nama ASC").Find(&list)

	utils.ResponsePaginated(c, "Daftar guru", list, page, limit, total)
}

// GetGuruByID godoc
// @Summary Detail guru
// @Tags Guru
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /guru/{id} [get]
func GetGuruByID(c *gin.Context) {
	var guru models.Guru
	if err := config.DB.Preload("User.Role").First(&guru, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Guru tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail guru", guru)
}

// CreateGuru godoc
// @Summary Buat guru baru beserta akun login-nya
// @Tags Guru
// @Security BearerAuth
// @Accept json
// @Produce json
// @Router /guru [post]
func CreateGuru(c *gin.Context) {
	var req CreateGuruRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Cek email belum dipakai
	var existingUser models.User
	if err := config.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		utils.ResponseBadRequest(c, "Email sudah digunakan", nil)
		return
	}

	// Cek NIP belum dipakai (jika diisi)
	if req.NIP != "" {
		var existingGuru models.Guru
		if err := config.DB.Where("nip = ?", req.NIP).First(&existingGuru).Error; err == nil {
			utils.ResponseBadRequest(c, "NIP sudah digunakan", nil)
			return
		}
	}

	// Ambil role "guru"
	var roleGuru models.Role
	if err := config.DB.Where("nama = ?", models.RoleGuru).First(&roleGuru).Error; err != nil {
		utils.ResponseInternalError(c, "Role guru tidak ditemukan")
		return
	}

	// Buat user + guru dalam satu transaksi
	var guru models.Guru
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		user := models.User{
			RoleID:   roleGuru.ID,
			Nama:     req.Nama,
			Email:    req.Email,
			Password: req.Password,
			IsActive: true,
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		guru = models.Guru{
			UserID:       user.ID,
			NIP:          req.NIP,
			Nama:         req.Nama,
			JenisKelamin: req.JenisKelamin,
			Alamat:       req.Alamat,
			Telepon:      req.Telepon,
		}
		return tx.Create(&guru).Error
	})

	if err != nil {
		utils.ResponseInternalError(c, "Gagal membuat data guru")
		return
	}

	config.DB.Preload("User.Role").First(&guru, guru.ID)
	utils.ResponseCreated(c, "Guru berhasil ditambahkan", guru)
}

// UpdateGuru godoc
// @Summary Update data guru
// @Tags Guru
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /guru/{id} [put]
func UpdateGuru(c *gin.Context) {
	var guru models.Guru
	if err := config.DB.Preload("User").First(&guru, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Guru tidak ditemukan")
		return
	}

	var req UpdateGuruRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Update data guru
		guruUpdates := map[string]interface{}{}
		if req.NIP != "" {
			guruUpdates["nip"] = req.NIP
		}
		if req.Nama != "" {
			guruUpdates["nama"] = req.Nama
		}
		if req.JenisKelamin != "" {
			guruUpdates["jenis_kelamin"] = req.JenisKelamin
		}
		if req.Alamat != "" {
			guruUpdates["alamat"] = req.Alamat
		}
		if req.Telepon != "" {
			guruUpdates["telepon"] = req.Telepon
		}
		if len(guruUpdates) > 0 {
			if err := tx.Model(&guru).Updates(guruUpdates).Error; err != nil {
				return err
			}
		}

		// Update data user terkait (jika ada)
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
			return tx.Model(&models.User{}).Where("id = ?", guru.UserID).Updates(userUpdates).Error
		}
		return nil
	})

	if err != nil {
		utils.ResponseInternalError(c, "Gagal mengupdate data guru")
		return
	}

	config.DB.Preload("User.Role").First(&guru, guru.ID)
	utils.ResponseOK(c, "Data guru berhasil diupdate", guru)
}

// DeleteGuru godoc
// @Summary Hapus guru (soft delete)
// @Tags Guru
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /guru/{id} [delete]
func DeleteGuru(c *gin.Context) {
	var guru models.Guru
	if err := config.DB.First(&guru, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Guru tidak ditemukan")
		return
	}

	// Cek apakah masih jadi wali kelas
	var count int64
	config.DB.Model(&models.Kelas{}).Where("wali_kelas_id = ?", guru.ID).Count(&count)
	if count > 0 {
		utils.ResponseBadRequest(c, "Guru masih menjadi wali kelas, tidak bisa dihapus", nil)
		return
	}

	config.DB.Transaction(func(tx *gorm.DB) error {
		tx.Delete(&guru)
		// Nonaktifkan akun user juga
		tx.Model(&models.User{}).Where("id = ?", guru.UserID).Update("is_active", false)
		return nil
	})

	utils.ResponseOK(c, "Data guru berhasil dihapus", nil)
}