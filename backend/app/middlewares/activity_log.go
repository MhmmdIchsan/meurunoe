package middlewares

import (
	"sim-sekolah/app/models"
	"sim-sekolah/config"

	"github.com/gin-gonic/gin"
)

// ActivityLogger mencatat aktivitas user secara otomatis
func ActivityLogger(action, entity string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Hanya log setelah request berhasil (2xx)
		if c.Writer.Status() >= 200 && c.Writer.Status() < 300 {
			claims := GetCurrentUser(c)
			if claims == nil {
				return
			}

			log := models.ActivityLog{
				UserID:    claims.UserID,
				Action:    action,
				Entity:    entity,
				IPAddress: c.ClientIP(),
				UserAgent: c.Request.UserAgent(),
			}
			// Fire and forget — jangan blok response
			go config.DB.Create(&log)
		}
	}
}