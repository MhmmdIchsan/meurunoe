package controllers

import (
	"fmt"
	//"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"sim-sekolah/app/middlewares"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"

	"github.com/gin-gonic/gin"
)

// ── GET /profile ───────────────────────────────────────────────────────────
// Ambil profil user yang sedang login (lebih lengkap dari /auth/me)
func GetProfile(c *gin.Context) {
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

	utils.ResponseOK(c, "Data profil", gin.H{
		"id":          user.ID,
		"nama":        user.Nama,
		"email":       user.Email,
		"telepon":     user.Telepon,
		"foto_profil": buildFotoURL(c, user.FotoProfil),
		"is_active":   user.IsActive,
		"last_login":  user.LastLogin,
		"created_at":  user.CreatedAt,
		"role": gin.H{
			"id":        user.Role.ID,
			"nama_role": user.Role.Nama,
		},
	})
}

// ── PUT /profile ───────────────────────────────────────────────────────────
// Update nama & telepon user yang sedang login
func UpdateProfile(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	if claims == nil {
		utils.ResponseUnauthorized(c, "Tidak terautentikasi")
		return
	}

	var req struct {
		Nama    string `json:"nama" binding:"required,min=2,max=100"`
		Telepon string `json:"telepon"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	var user models.User
	if err := config.DB.Preload("Role").First(&user, claims.UserID).Error; err != nil {
		utils.ResponseNotFound(c, "User tidak ditemukan")
		return
	}

	// Update hanya field yang diizinkan
	updates := map[string]interface{}{
		"nama":    strings.TrimSpace(req.Nama),
		"telepon": strings.TrimSpace(req.Telepon),
	}
	if err := config.DB.Model(&user).Updates(updates).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal memperbarui profil")
		return
	}

	utils.ResponseOK(c, "Profil berhasil diperbarui", gin.H{
		"id":          user.ID,
		"nama":        user.Nama,
		"email":       user.Email,
		"telepon":     user.Telepon,
		"foto_profil": buildFotoURL(c, user.FotoProfil),
		"role": gin.H{
			"id":        user.Role.ID,
			"nama_role": user.Role.Nama,
		},
	})
}

// ── POST /profile/foto ─────────────────────────────────────────────────────
// Upload foto profil — simpan ke disk, update path di DB
func UploadFotoProfil(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	if claims == nil {
		utils.ResponseUnauthorized(c, "Tidak terautentikasi")
		return
	}

	// Ambil file dari form-data field "foto"
	file, header, err := c.Request.FormFile("foto")
	if err != nil {
		utils.ResponseBadRequest(c, "File tidak ditemukan", err.Error())
		return
	}
	defer file.Close()

	// Validasi tipe file
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExt := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowedExt[ext] {
		utils.ResponseBadRequest(c, "Format file tidak didukung. Gunakan JPG, PNG, atau WebP", nil)
		return
	}

	// Validasi ukuran file (maks 2MB)
	if header.Size > 2*1024*1024 {
		utils.ResponseBadRequest(c, "Ukuran file maksimal 2MB", nil)
		return
	}

	// Buat direktori uploads/foto-profil jika belum ada
	uploadDir := "uploads/foto-profil"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.ResponseInternalError(c, "Gagal membuat direktori upload")
		return
	}

	// Hapus foto lama jika ada
	var user models.User
	if err := config.DB.First(&user, claims.UserID).Error; err != nil {
		utils.ResponseNotFound(c, "User tidak ditemukan")
		return
	}
	if user.FotoProfil != "" {
		oldPath := strings.TrimPrefix(user.FotoProfil, "/")
		os.Remove(oldPath) // ignore error jika file sudah tidak ada
	}

	// Generate nama file unik: foto_{userID}_{timestamp}{ext}
	fileName := fmt.Sprintf("foto_%d_%d%s", claims.UserID, time.Now().UnixMilli(), ext)
	filePath := filepath.Join(uploadDir, fileName)

	// Simpan file ke disk
	if err := c.SaveUploadedFile(header, filePath); err != nil {
		utils.ResponseInternalError(c, "Gagal menyimpan file")
		return
	}

	// Simpan path relatif ke DB (misal: uploads/foto-profil/foto_1_xxx.jpg)
	if err := config.DB.Model(&user).Update("foto_profil", filePath).Error; err != nil {
		os.Remove(filePath) // rollback: hapus file yang baru diupload
		utils.ResponseInternalError(c, "Gagal menyimpan path foto")
		return
	}

	utils.ResponseOK(c, "Foto profil berhasil diperbarui", gin.H{
		"foto_profil": buildFotoURL(c, filePath),
	})
}

// ── DELETE /profile/foto ───────────────────────────────────────────────────
// Hapus foto profil
func DeleteFotoProfil(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	if claims == nil {
		utils.ResponseUnauthorized(c, "Tidak terautentikasi")
		return
	}

	var user models.User
	if err := config.DB.First(&user, claims.UserID).Error; err != nil {
		utils.ResponseNotFound(c, "User tidak ditemukan")
		return
	}

	if user.FotoProfil == "" {
		utils.ResponseBadRequest(c, "Tidak ada foto profil untuk dihapus", nil)
		return
	}

	// Hapus file dari disk
	oldPath := strings.TrimPrefix(user.FotoProfil, "/")
	os.Remove(oldPath)

	// Kosongkan di DB
	if err := config.DB.Model(&user).Update("foto_profil", "").Error; err != nil {
		utils.ResponseInternalError(c, "Gagal menghapus foto profil")
		return
	}

	utils.ResponseOK(c, "Foto profil dihapus", nil)
}

// ── Helper ─────────────────────────────────────────────────────────────────
// buildFotoURL mengubah path lokal menjadi URL lengkap
func buildFotoURL(c *gin.Context, path string) string {
	if path == "" {
		return ""
	}
	// Jika sudah berupa URL penuh, kembalikan apa adanya
	if strings.HasPrefix(path, "http") {
		return path
	}
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	// Kembalikan: http://host/uploads/foto-profil/xxx.jpg
	return fmt.Sprintf("%s://%s/%s", scheme, c.Request.Host, path)
}