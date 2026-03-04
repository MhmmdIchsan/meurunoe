package controllers

import (
	"bytes"
	"encoding/json"
	"io"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"sim-sekolah/app/middlewares"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// GetOrangTua godoc
// @Summary Daftar semua orang tua
// @Tags Orang Tua
// @Security BearerAuth
// @Param page query int false "Halaman"
// @Param limit query int false "Limit"
// @Param search query string false "Cari nama"
// @Router /orang-tua [get]
func GetOrangTua(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}

	query := config.DB.Model(&models.OrangTua{}).
		Preload("User").
		Preload("Anak").              // ← TAMBAH INI
		Preload("Anak.Siswa.Kelas")   // ← TAMBAH INI

	if search != "" {
		query = query.Where("nama ILIKE ?", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	var list []models.OrangTua
	query.Offset((page - 1) * limit).Limit(limit).Order("nama ASC").Find(&list)

	utils.ResponsePaginated(c, "Daftar orang tua", list, page, limit, total)
}

// GetOrangTuaByID godoc
// @Summary Detail orang tua beserta daftar anak
// @Tags Orang Tua
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /orang-tua/{id} [get]
func GetOrangTuaByID(c *gin.Context) {
	var ot models.OrangTua
	if err := config.DB.Preload("User").Preload("Anak.Siswa.Kelas.Jurusan").First(&ot, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Data orang tua tidak ditemukan")
		return
	}

	utils.ResponseOK(c, "Detail orang tua", ot)
}

// GetAnakByOrangTuaID - ENDPOINT BARU
// @Summary Daftar anak dari orang tua tertentu (by ID)
// @Tags Orang Tua
// @Security BearerAuth
// @Param id path int true "ID Orang Tua"
// @Router /orang-tua/{id}/siswa [get]
func GetAnakByOrangTuaID(c *gin.Context) {
	var ot models.OrangTua
	if err := config.DB.First(&ot, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Orang tua tidak ditemukan")
		return
	}

	var anakList []models.OrangTuaSiswa
	config.DB.
		Preload("Siswa.Kelas.Jurusan").
		Where("orang_tua_id = ?", ot.ID).
		Find(&anakList)

	utils.ResponseOK(c, "Daftar anak", gin.H{
		"anak": anakList,
	})
}

// CreateOrangTua godoc
// @Summary Daftarkan orang tua baru beserta akun login
// @Tags Orang Tua
// @Security BearerAuth
// @Router /orang-tua [post]
func CreateOrangTua(c *gin.Context) {
	var req struct {
		Email     string `json:"email" binding:"required,email"`
		Password  string `json:"password" binding:"required,min=8"`
		Nama      string `json:"nama" binding:"required,min=3,max=100"`
		Telepon   string `json:"telepon"`
		Pekerjaan string `json:"pekerjaan"` // ← TAMBAH INI
		Alamat    string `json:"alamat"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	var count int64
	config.DB.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		utils.ResponseBadRequest(c, "Email sudah digunakan", nil)
		return
	}

	var roleOT models.Role
	if err := config.DB.Where("nama = ?", models.RoleOrangTua).First(&roleOT).Error; err != nil {
		utils.ResponseInternalError(c, "Role orang tua tidak ditemukan")
		return
	}

	var ot models.OrangTua
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		user := models.User{
			RoleID:   roleOT.ID,
			Nama:     req.Nama,
			Email:    req.Email,
			Password: req.Password,
			IsActive: true,
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		ot = models.OrangTua{
			UserID:    user.ID,
			Nama:      req.Nama,
			Telepon:   req.Telepon,
			Pekerjaan: req.Pekerjaan, // ← TAMBAH INI
			Alamat:    req.Alamat,
		}
		return tx.Create(&ot).Error
	})

	if err != nil {
		utils.ResponseInternalError(c, "Gagal mendaftarkan orang tua")
		return
	}

	config.DB.Preload("User").First(&ot, ot.ID)
	utils.ResponseCreated(c, "Orang tua berhasil didaftarkan", ot)
}

// UpdateOrangTua godoc
// @Summary Update data orang tua
// @Tags Orang Tua
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /orang-tua/{id} [put]
func UpdateOrangTua(c *gin.Context) {
	var ot models.OrangTua
	if err := config.DB.First(&ot, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Data orang tua tidak ditemukan")
		return
	}

	var req struct {
		Nama      string `json:"nama" binding:"omitempty,min=3,max=100"`
		Telepon   string `json:"telepon"`
		Pekerjaan string `json:"pekerjaan"` // ← TAMBAH INI
		Alamat    string `json:"alamat"`
		Email     string `json:"email" binding:"omitempty,email"`
		IsActive  *bool  `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	config.DB.Transaction(func(tx *gorm.DB) error {
		otUpdates := map[string]interface{}{}
		if req.Nama != "" {
			otUpdates["nama"] = req.Nama
		}
		if req.Telepon != "" {
			otUpdates["telepon"] = req.Telepon
		}
		if req.Pekerjaan != "" {
			otUpdates["pekerjaan"] = req.Pekerjaan // ← TAMBAH INI
		}
		if req.Alamat != "" {
			otUpdates["alamat"] = req.Alamat
		}
		if len(otUpdates) > 0 {
			tx.Model(&ot).Updates(otUpdates)
		}

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
			tx.Model(&models.User{}).Where("id = ?", ot.UserID).Updates(userUpdates)
		}
		return nil
	})

	config.DB.Preload("User").First(&ot, ot.ID)
	utils.ResponseOK(c, "Data orang tua berhasil diupdate", ot)
}

// DeleteOrangTua godoc
// @Summary Hapus orang tua (soft delete)
// @Tags Orang Tua
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /orang-tua/{id} [delete]
func DeleteOrangTua(c *gin.Context) {
	var ot models.OrangTua
	if err := config.DB.First(&ot, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Data orang tua tidak ditemukan")
		return
	}

	config.DB.Transaction(func(tx *gorm.DB) error {
		tx.Where("orang_tua_id = ?", ot.ID).Delete(&models.OrangTuaSiswa{})
		tx.Delete(&ot)
		tx.Model(&models.User{}).Where("id = ?", ot.UserID).Update("is_active", false)
		return nil
	})

	utils.ResponseOK(c, "Data orang tua berhasil dihapus", nil)
}

// GetAnakByOrangTua godoc
// @Summary Daftar anak dari orang tua yang sedang login
// @Tags Orang Tua
// @Security BearerAuth
// @Router /orang-tua/saya/anak [get]
func GetAnakByOrangTua(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)

	var ot models.OrangTua
	if err := config.DB.Where("user_id = ?", claims.UserID).First(&ot).Error; err != nil {
		utils.ResponseNotFound(c, "Data orang tua tidak ditemukan")
		return
	}

	var anakList []models.OrangTuaSiswa
	config.DB.
		Preload("Siswa.Kelas.Jurusan").
		Preload("Siswa.User").
		Where("orang_tua_id = ?", ot.ID).
		Find(&anakList)

	// Format response untuk frontend
	var siswaList []map[string]interface{}
	for _, anak := range anakList {
		siswaList = append(siswaList, map[string]interface{}{
			"id":    anak.Siswa.ID,
			"nama":  anak.Siswa.Nama,
			"nisn":  anak.Siswa.NISN,
			"kelas": anak.Siswa.Kelas,
		})
	}

	utils.ResponseOK(c, "Daftar anak", gin.H{
		"siswa": siswaList,
	})
}

// AssignSiswa godoc
// @Summary Assign siswa ke orang tua dengan hubungan
// @Tags Orang Tua
// @Security BearerAuth
// @Router /orang-tua/{id}/assign-siswa [post]
func AssignSiswa(c *gin.Context) {
	var ot models.OrangTua
	if err := config.DB.First(&ot, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Orang tua tidak ditemukan")
		return
	}

	// Read body
	bodyBytes, _ := io.ReadAll(c.Request.Body)
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// Try new format first
	var reqNew struct {
		Assignments []struct {
			SiswaID  uint   `json:"siswa_id"`
			Hubungan string `json:"hubungan"`
		} `json:"assignments"`
	}

	// Try old format
	var reqOld struct {
		SiswaIDs []uint `json:"siswa_ids"`
	}

	var siswaAssignments []models.OrangTuaSiswa

	// Parse new format
	if err := json.Unmarshal(bodyBytes, &reqNew); err == nil && len(reqNew.Assignments) > 0 {
		for _, assign := range reqNew.Assignments {
			hubungan := assign.Hubungan
			if hubungan == "" {
				hubungan = "wali"
			}
			siswaAssignments = append(siswaAssignments, models.OrangTuaSiswa{
				OrangTuaID: ot.ID,
				SiswaID:    assign.SiswaID,
				Hubungan:   hubungan,
			})
		}
	} else {
		// Fallback to old format
		if err := json.Unmarshal(bodyBytes, &reqOld); err != nil || len(reqOld.SiswaIDs) == 0 {
			utils.ResponseBadRequest(c, "Validasi gagal", "siswa_ids atau assignments required")
			return
		}
		for _, siswaID := range reqOld.SiswaIDs {
			siswaAssignments = append(siswaAssignments, models.OrangTuaSiswa{
				OrangTuaID: ot.ID,
				SiswaID:    siswaID,
				Hubungan:   "wali",
			})
		}
	}

	config.DB.Transaction(func(tx *gorm.DB) error {
		tx.Where("orang_tua_id = ?", ot.ID).Delete(&models.OrangTuaSiswa{})
		for _, assign := range siswaAssignments {
			tx.Create(&assign)
		}
		return nil
	})

	utils.ResponseOK(c, "Siswa berhasil di-assign", gin.H{
		"total": len(siswaAssignments),
	})
}