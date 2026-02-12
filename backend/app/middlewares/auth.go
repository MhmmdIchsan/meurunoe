package middlewares

import (
	"strings"

	"github.com/gin-gonic/gin"
	"sim-sekolah/utils"
)

const UserClaimsKey = "userClaims"

// AuthMiddleware memvalidasi JWT token dari header Authorization
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.ResponseUnauthorized(c, "Token autentikasi tidak ditemukan")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			utils.ResponseUnauthorized(c, "Format token tidak valid. Gunakan: Bearer <token>")
			c.Abort()
			return
		}

		claims, err := utils.ValidateToken(parts[1])
		if err != nil {
			utils.ResponseUnauthorized(c, "Token tidak valid atau sudah kadaluarsa")
			c.Abort()
			return
		}

		// Simpan claims ke context agar bisa dipakai di handler
		c.Set(UserClaimsKey, claims)
		c.Next()
	}
}

// RoleMiddleware membatasi akses berdasarkan role
func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsRaw, exists := c.Get(UserClaimsKey)
		if !exists {
			utils.ResponseUnauthorized(c, "Data autentikasi tidak ditemukan")
			c.Abort()
			return
		}

		claims, ok := claimsRaw.(*utils.JWTClaims)
		if !ok {
			utils.ResponseUnauthorized(c, "Data autentikasi tidak valid")
			c.Abort()
			return
		}

		for _, role := range allowedRoles {
			if claims.Role == role {
				c.Next()
				return
			}
		}

		utils.ResponseForbidden(c, "Anda tidak memiliki akses ke resource ini")
		c.Abort()
	}
}

// GetCurrentUser mengambil claims dari context
func GetCurrentUser(c *gin.Context) *utils.JWTClaims {
	claimsRaw, _ := c.Get(UserClaimsKey)
	claims, _ := claimsRaw.(*utils.JWTClaims)
	return claims
}