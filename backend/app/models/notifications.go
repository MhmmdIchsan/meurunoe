package models

import (
	"time"

	"gorm.io/gorm"
)

// NotificationType mendefinisikan jenis notifikasi
type NotificationType string

const (
	NotifAbsensi   NotificationType = "absensi"
	NotifNilai     NotificationType = "nilai"
	NotifJadwal    NotificationType = "jadwal"
	NotifRapor     NotificationType = "rapor"
	NotifKehadiran NotificationType = "kehadiran"
	NotifGeneral   NotificationType = "general"
)

type Notification struct {
	ID        uint             `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint             `gorm:"not null;index" json:"user_id"`
	Type      NotificationType `gorm:"type:varchar(50);not null;default:'general'" json:"type"`
	Icon      string           `gorm:"type:varchar(10);default:'📢'" json:"icon"`
	Title     string           `gorm:"type:varchar(200);not null" json:"title"`
	Message   string           `gorm:"type:text;not null" json:"message"`
	Link      string           `gorm:"type:varchar(255)" json:"link,omitempty"`
	IsRead    bool             `gorm:"default:false;index" json:"is_read"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	DeletedAt gorm.DeletedAt   `gorm:"index" json:"-"`

	// Relasi
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// TableName override nama tabel
func (Notification) TableName() string {
	return "notifications"
}