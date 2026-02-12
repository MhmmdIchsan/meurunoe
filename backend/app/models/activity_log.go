package models

import "time"

type ActivityLog struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     uint      `gorm:"not null;index" json:"user_id"`
	Action     string    `gorm:"type:varchar(100);not null" json:"action"`
	Entity     string    `gorm:"type:varchar(100)" json:"entity"`
	EntityID   *uint     `json:"entity_id,omitempty"`
	IPAddress  string    `gorm:"type:varchar(45)" json:"ip_address"`
	UserAgent  string    `gorm:"type:text" json:"user_agent"`
	CreatedAt  time.Time `json:"created_at"`

	// Relasi
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}