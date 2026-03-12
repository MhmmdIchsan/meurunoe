package controllers

import (
	"strconv"

	"sim-sekolah/app/middlewares"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"

	"github.com/gin-gonic/gin"
)

// ── GET /notifications ─────────────────────────────────────────────────────
// Ambil semua notifikasi milik user yang sedang login
func GetNotifications(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	if claims == nil {
		utils.ResponseUnauthorized(c, "Tidak terautentikasi")
		return
	}

	var notifications []models.Notification
	query := config.DB.
		Where("user_id = ?", claims.UserID).
		Order("created_at DESC")

	// Filter: hanya yang belum dibaca
	if c.Query("unread") == "true" {
		query = query.Where("is_read = false")
	}

	// Limit (default 50)
	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}
	query = query.Limit(limit)

	if err := query.Find(&notifications).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal mengambil notifikasi")
		return
	}

	// Hitung unread count
	var unreadCount int64
	config.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", claims.UserID).
		Count(&unreadCount)

	utils.ResponseOK(c, "Daftar notifikasi", gin.H{
		"notifications": notifications,
		"unread_count":  unreadCount,
	})
}

// ── PUT /notifications/:id/read ────────────────────────────────────────────
// Tandai satu notifikasi sebagai sudah dibaca
func MarkNotificationRead(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	if claims == nil {
		utils.ResponseUnauthorized(c, "Tidak terautentikasi")
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ResponseBadRequest(c, "ID tidak valid", nil)
		return
	}

	// Pastikan notifikasi milik user ini
	result := config.DB.
		Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, claims.UserID).
		Update("is_read", true)

	if result.Error != nil {
		utils.ResponseInternalError(c, "Gagal memperbarui notifikasi")
		return
	}
	if result.RowsAffected == 0 {
		utils.ResponseNotFound(c, "Notifikasi tidak ditemukan")
		return
	}

	utils.ResponseOK(c, "Notifikasi ditandai sudah dibaca", nil)
}

// ── PUT /notifications/read-all ────────────────────────────────────────────
// Tandai semua notifikasi user sebagai sudah dibaca
func MarkAllNotificationsRead(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	if claims == nil {
		utils.ResponseUnauthorized(c, "Tidak terautentikasi")
		return
	}

	if err := config.DB.
		Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", claims.UserID).
		Update("is_read", true).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal memperbarui notifikasi")
		return
	}

	utils.ResponseOK(c, "Semua notifikasi ditandai sudah dibaca", nil)
}

// ── DELETE /notifications/:id ──────────────────────────────────────────────
// Hapus satu notifikasi
func DeleteNotification(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	if claims == nil {
		utils.ResponseUnauthorized(c, "Tidak terautentikasi")
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		utils.ResponseBadRequest(c, "ID tidak valid", nil)
		return
	}

	result := config.DB.
		Where("id = ? AND user_id = ?", id, claims.UserID).
		Delete(&models.Notification{})

	if result.Error != nil {
		utils.ResponseInternalError(c, "Gagal menghapus notifikasi")
		return
	}
	if result.RowsAffected == 0 {
		utils.ResponseNotFound(c, "Notifikasi tidak ditemukan")
		return
	}

	utils.ResponseOK(c, "Notifikasi dihapus", nil)
}

// ── DELETE /notifications ──────────────────────────────────────────────────
// Hapus semua notifikasi user
func DeleteAllNotifications(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	if claims == nil {
		utils.ResponseUnauthorized(c, "Tidak terautentikasi")
		return
	}

	if err := config.DB.
		Where("user_id = ?", claims.UserID).
		Delete(&models.Notification{}).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal menghapus semua notifikasi")
		return
	}

	utils.ResponseOK(c, "Semua notifikasi dihapus", nil)
}

// ── Helper: Kirim notifikasi ke user tertentu ──────────────────────────────
// Dipanggil dari controller lain, misal setelah input absensi / nilai
func SendNotification(userID uint, notifType models.NotificationType, icon, title, message, link string) {
	notif := models.Notification{
		UserID:  userID,
		Type:    notifType,
		Icon:    icon,
		Title:   title,
		Message: message,
		Link:    link,
	}
	// Fire and forget — tidak perlu block request utama
	config.DB.Create(&notif)
}

// SendNotificationToRole — kirim notifikasi ke semua user dengan role tertentu
func SendNotificationToRole(roleID uint, notifType models.NotificationType, icon, title, message, link string) {
	var users []models.User
	config.DB.Where("role_id = ? AND is_active = true", roleID).Find(&users)

	for _, u := range users {
		SendNotification(u.ID, notifType, icon, title, message, link)
	}
}