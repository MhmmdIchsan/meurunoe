package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	ID         uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	RoleID     uint           `gorm:"not null;index" json:"role_id"`
	Nama       string         `gorm:"type:varchar(100);not null" json:"nama"`
	Email      string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
	Password   string         `gorm:"type:varchar(255);not null" json:"-"`
	IsActive   bool           `gorm:"default:true" json:"is_active"`
	LastLogin  *time.Time     `json:"last_login,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`

	// Relasi
	Role Role `gorm:"foreignKey:RoleID" json:"role,omitempty"`
}

// HashPassword meng-hash password sebelum disimpan
func (u *User) HashPassword(plain string) error {
	hashed, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashed)
	return nil
}

// CheckPassword memverifikasi password
func (u *User) CheckPassword(plain string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(plain))
	return err == nil
}

// BeforeCreate hook untuk hash password otomatis
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		u.Password = string(hashed)
	}
	return nil
}