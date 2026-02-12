package controllers

import (
	"github.com/gin-gonic/gin"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// GetRoles godoc
// @Summary Daftar semua role
// @Tags Roles
// @Security BearerAuth
// @Produce json
// @Router /roles [get]
func GetRoles(c *gin.Context) {
	var roles []models.Role
	if err := config.DB.Order("id ASC").Find(&roles).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal mengambil data role")
		return
	}
	utils.ResponseOK(c, "Daftar role", roles)
}

// GetRoleByID godoc
// @Summary Detail role
// @Tags Roles
// @Security BearerAuth
// @Produce json
// @Param id path int true "Role ID"
// @Router /roles/{id} [get]
func GetRoleByID(c *gin.Context) {
	id := c.Param("id")
	var role models.Role
	if err := config.DB.First(&role, id).Error; err != nil {
		utils.ResponseNotFound(c, "Role tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail role", role)
}

// CreateRole godoc
// @Summary Buat role baru
// @Tags Roles
// @Security BearerAuth
// @Accept json
// @Produce json
// @Router /roles [post]
func CreateRole(c *gin.Context) {
	var req struct {
		Nama      string `json:"nama" binding:"required,min=3,max=50"`
		Deskripsi string `json:"deskripsi" binding:"max=255"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Cek nama sudah ada
	var existing models.Role
	if err := config.DB.Where("nama = ?", req.Nama).First(&existing).Error; err == nil {
		utils.ResponseBadRequest(c, "Nama role sudah digunakan", nil)
		return
	}

	role := models.Role{Nama: req.Nama, Deskripsi: req.Deskripsi}
	if err := config.DB.Create(&role).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal membuat role")
		return
	}

	utils.ResponseCreated(c, "Role berhasil dibuat", role)
}

// UpdateRole godoc
// @Summary Update role
// @Tags Roles
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "Role ID"
// @Router /roles/{id} [put]
func UpdateRole(c *gin.Context) {
	id := c.Param("id")
	var role models.Role
	if err := config.DB.First(&role, id).Error; err != nil {
		utils.ResponseNotFound(c, "Role tidak ditemukan")
		return
	}

	var req struct {
		Nama      string `json:"nama" binding:"omitempty,min=3,max=50"`
		Deskripsi string `json:"deskripsi"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	if req.Nama != "" {
		role.Nama = req.Nama
	}
	role.Deskripsi = req.Deskripsi

	if err := config.DB.Save(&role).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal mengupdate role")
		return
	}

	utils.ResponseOK(c, "Role berhasil diupdate", role)
}

// DeleteRole godoc
// @Summary Hapus role
// @Tags Roles
// @Security BearerAuth
// @Produce json
// @Param id path int true "Role ID"
// @Router /roles/{id} [delete]
func DeleteRole(c *gin.Context) {
	id := c.Param("id")
	var role models.Role
	if err := config.DB.First(&role, id).Error; err != nil {
		utils.ResponseNotFound(c, "Role tidak ditemukan")
		return
	}

	// Cek apakah role masih dipakai user
	var count int64
	config.DB.Model(&models.User{}).Where("role_id = ?", id).Count(&count)
	if count > 0 {
		utils.ResponseBadRequest(c, "Role masih digunakan oleh user, tidak bisa dihapus", nil)
		return
	}

	if err := config.DB.Delete(&role).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal menghapus role")
		return
	}

	utils.ResponseOK(c, "Role berhasil dihapus", nil)
}