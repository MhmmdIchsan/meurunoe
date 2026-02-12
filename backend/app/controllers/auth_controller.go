package controllers

import (
	"time"

	"github.com/gin-gonic/gin"
	"sim-sekolah/app/middlewares"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// ── Request / Response DTOs ────────────────────────────────────

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginResponse struct {
	AccessToken string    `json:"access_token"`
	TokenType   string    `json:"token_type"`
	ExpiresAt   time.Time `json:"expires_at"`
	User        UserInfo  `json:"user"`
}

type UserInfo struct {
	ID    uint   `json:"id"`
	Nama  string `json:"nama"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// ── Handler ────────────────────────────────────────────────────

// Login godoc
// @Summary Login pengguna
// @Tags Auth
// @Accept json
// @Produce json
// @Param body body LoginRequest true "Kredensial login"
// @Success 200 {object} utils.APIResponse{data=LoginResponse}
// @Failure 400 {object} utils.APIResponse
// @Failure 401 {object} utils.APIResponse
// @Router /auth/login [post]
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Cari user berdasarkan email, eager load Role
	var user models.User
	if err := config.DB.Preload("Role").Where("email = ? AND is_active = true", req.Email).First(&user).Error; err != nil {
		utils.ResponseUnauthorized(c, "Email atau password salah")
		return
	}

	// Verifikasi password
	if !user.CheckPassword(req.Password) {
		utils.ResponseUnauthorized(c, "Email atau password salah")
		return
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.RoleID, user.Nama, user.Email, user.Role.Nama)
	if err != nil {
		utils.ResponseInternalError(c, "Gagal membuat token")
		return
	}

	// Update last login
	now := time.Now()
	config.DB.Model(&user).Update("last_login", now)

	utils.ResponseOK(c, "Login berhasil", LoginResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresAt:   now.Add(24 * time.Hour),
		User: UserInfo{
			ID:    user.ID,
			Nama:  user.Nama,
			Email: user.Email,
			Role:  user.Role.Nama,
		},
	})
}

// Me godoc
// @Summary Ambil data pengguna yang sedang login
// @Tags Auth
// @Security BearerAuth
// @Produce json
// @Success 200 {object} utils.APIResponse
// @Router /auth/me [get]
func Me(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	if claims == nil {
		utils.ResponseUnauthorized(c, "Tidak terautentikasi")
		return
	}

	var user models.User
	if err := config.DB.Preload("Role").First(&user, claims.UserID).Error; err != nil {
		utils.ResponseNotFound(c, "User tidak ditemukan")
		return
	}

	utils.ResponseOK(c, "Data pengguna", gin.H{
		"id":         user.ID,
		"nama":       user.Nama,
		"email":      user.Email,
		"role":       user.Role.Nama,
		"is_active":  user.IsActive,
		"last_login": user.LastLogin,
	})
}

// ChangePassword godoc
// @Summary Ganti password pengguna yang sedang login
// @Tags Auth
// @Security BearerAuth
// @Accept json
// @Produce json
// @Router /auth/change-password [put]
func ChangePassword(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)

	var req struct {
		PasswordLama string `json:"password_lama" binding:"required"`
		PasswordBaru string `json:"password_baru" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	var user models.User
	if err := config.DB.First(&user, claims.UserID).Error; err != nil {
		utils.ResponseNotFound(c, "User tidak ditemukan")
		return
	}

	if !user.CheckPassword(req.PasswordLama) {
		utils.ResponseBadRequest(c, "Password lama salah", nil)
		return
	}

	if err := user.HashPassword(req.PasswordBaru); err != nil {
		utils.ResponseInternalError(c, "Gagal memproses password")
		return
	}

	// Simpan langsung (bypass BeforeCreate hook)
	if err := config.DB.Model(&user).Update("password", user.Password).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal menyimpan password baru")
		return
	}

	utils.ResponseOK(c, "Password berhasil diubah", nil)
}