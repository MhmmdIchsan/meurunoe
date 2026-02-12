package models

import (
	"time"
)

// Nama role yang valid di sistem
const (
	RoleAdmin        = "admin"
	RoleKepalaSekolah = "kepala_sekolah"
	RoleGuru         = "guru"
	RoleWaliKelas    = "wali_kelas"
	RoleSiswa        = "siswa"
	RoleOrangTua     = "orang_tua"
)

type Role struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Nama        string    `gorm:"type:varchar(50);uniqueIndex;not null" json:"nama"`
	Deskripsi   string    `gorm:"type:varchar(255)" json:"deskripsi"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relasi
	Users []User `gorm:"foreignKey:RoleID" json:"-"`
}