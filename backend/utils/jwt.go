package utils

import (
	"errors"
	"os"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID uint   `json:"user_id"`
	RoleID uint   `json:"role_id"`
	Nama   string `json:"nama"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "sim-sekolah-default-secret-change-in-production"
	}
	return []byte(secret)
}

// GenerateToken membuat JWT access token
func GenerateToken(userID, roleID uint, nama, email, role string) (string, error) {
	expHours := 24 // default 24 jam
	claims := JWTClaims{
		UserID: userID,
		RoleID: roleID,
		Nama:   nama,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "sim-sekolah",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

// GenerateRefreshToken membuat refresh token (masa berlaku lebih lama)
func GenerateRefreshToken(userID uint) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   fmt.Sprintf("%d", userID),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)), // 7 hari
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    "sim-sekolah",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

// ValidateToken memvalidasi dan mengurai JWT
func ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("metode signing tidak valid")
		}
		return getJWTSecret(), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, errors.New("token tidak valid")
	}

	return claims, nil
}