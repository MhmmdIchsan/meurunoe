package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// ── DTOs ───────────────────────────────────────────────────────

type CreateUserRequest struct {
	RoleID   uint   `json:"role_id" binding:"required"`
	Nama     string `json:"nama" binding:"required,min=3,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type UpdateUserRequest struct {
	RoleID   uint   `json:"role_id"`
	Nama     string `json:"nama" binding:"omitempty,min=3,max=100"`
	Email    string `json:"email" binding:"omitempty,email"`
	IsActive *bool  `json:"is_active"`
}

// ── Handlers ───────────────────────────────────────────────────

// GetUsers godoc
// @Summary Daftar semua user
// @Tags Users
// @Security BearerAuth
// @Produce json
// @Param page query int false "Halaman" default(1)
// @Param limit query int false "Jumlah per halaman" default(10)
// @Param search query string false "Cari nama/email"
// @Param role_id query int false "Filter role"
// @Router /users [get]
func GetUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	search := c.Query("search")
	roleID := c.Query("role_id")

	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	query := config.DB.Model(&models.User{}).Preload("Role")

	if search != "" {
		query = query.Where("nama ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if roleID != "" {
		query = query.Where("role_id = ?", roleID)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	if err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&users).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal mengambil data user")
		return
	}

	utils.ResponsePaginated(c, "Daftar user", users, page, limit, total)
}

// GetUserByID godoc
// @Summary Detail user berdasarkan ID
// @Tags Users
// @Security BearerAuth
// @Produce json
// @Param id path int true "User ID"
// @Router /users/{id} [get]
func GetUserByID(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := config.DB.Preload("Role").First(&user, id).Error; err != nil {
		utils.ResponseNotFound(c, "User tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail user", user)
}

// CreateUser godoc
// @Summary Buat user baru
// @Tags Users
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param body body CreateUserRequest true "Data user baru"
// @Router /users [post]
func CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Cek email sudah ada
	var existing models.User
	if err := config.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		utils.ResponseBadRequest(c, "Email sudah digunakan", nil)
		return
	}

	// Cek role valid
	var role models.Role
	if err := config.DB.First(&role, req.RoleID).Error; err != nil {
		utils.ResponseBadRequest(c, "Role tidak ditemukan", nil)
		return
	}

	user := models.User{
		RoleID:   req.RoleID,
		Nama:     req.Nama,
		Email:    req.Email,
		Password: req.Password, // akan di-hash oleh BeforeCreate hook
		IsActive: true,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal membuat user")
		return
	}

	config.DB.Preload("Role").First(&user, user.ID)
	utils.ResponseCreated(c, "User berhasil dibuat", user)
}

// UpdateUser godoc
// @Summary Update data user
// @Tags Users
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Param body body UpdateUserRequest true "Data yang diupdate"
// @Router /users/{id} [put]
func UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		utils.ResponseNotFound(c, "User tidak ditemukan")
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	updates := map[string]interface{}{}
	if req.Nama != "" {
		updates["nama"] = req.Nama
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.RoleID != 0 {
		updates["role_id"] = req.RoleID
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if err := config.DB.Model(&user).Updates(updates).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal mengupdate user")
		return
	}

	config.DB.Preload("Role").First(&user, user.ID)
	utils.ResponseOK(c, "User berhasil diupdate", user)
}

// DeleteUser godoc
// @Summary Hapus user (soft delete)
// @Tags Users
// @Security BearerAuth
// @Produce json
// @Param id path int true "User ID"
// @Router /users/{id} [delete]
func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		utils.ResponseNotFound(c, "User tidak ditemukan")
		return
	}

	if err := config.DB.Delete(&user).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal menghapus user")
		return
	}

	utils.ResponseOK(c, "User berhasil dihapus", nil)
}