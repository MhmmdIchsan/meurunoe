package main

import (
	"fmt"
	"log"

	"sim-sekolah/app/models"
	"sim-sekolah/config"
)

func main() {
	config.LoadEnv()
	config.ConnectDB()

	log.Println("🌱 Mulai seeding database...")

	seedRoles()
	seedAdminUser()

	log.Println("✅ Seeding selesai!")
}

func seedRoles() {
	roles := []models.Role{
		{Nama: models.RoleAdmin, Deskripsi: "Administrator sistem, akses penuh"},
		{Nama: models.RoleKepalaSekolah, Deskripsi: "Kepala sekolah, akses monitoring dan laporan"},
		{Nama: models.RoleGuru, Deskripsi: "Guru, akses absensi dan penilaian"},
		{Nama: models.RoleWaliKelas, Deskripsi: "Wali kelas, akses rekap kelas"},
		{Nama: models.RoleSiswa, Deskripsi: "Siswa, akses jadwal dan nilai sendiri"},
		{Nama: models.RoleOrangTua, Deskripsi: "Orang tua, monitoring anak"},
	}

	for _, role := range roles {
		var existing models.Role
		if err := config.DB.Where("nama = ?", role.Nama).First(&existing).Error; err != nil {
			if err := config.DB.Create(&role).Error; err != nil {
				log.Printf("❌ Gagal membuat role %s: %v", role.Nama, err)
			} else {
				log.Printf("   ✔ Role '%s' dibuat", role.Nama)
			}
		} else {
			log.Printf("   - Role '%s' sudah ada, dilewati", role.Nama)
		}
	}
}

func seedAdminUser() {
	var adminRole models.Role
	if err := config.DB.Where("nama = ?", models.RoleAdmin).First(&adminRole).Error; err != nil {
		log.Fatal("Role admin tidak ditemukan")
	}

	var existing models.User
	if err := config.DB.Where("email = ?", "admin@simsekolah.sch.id").First(&existing).Error; err == nil {
		log.Println("   - User admin sudah ada, dilewati")
		return
	}

	admin := models.User{
		RoleID:   adminRole.ID,
		Nama:     "Administrator",
		Email:    "admin@simsekolah.sch.id",
		Password: "Admin@12345", // akan di-hash oleh BeforeCreate
		IsActive: true,
	}

	if err := config.DB.Create(&admin).Error; err != nil {
		log.Fatal("❌ Gagal membuat admin:", err)
	}

	fmt.Println()
	log.Println("   ✔ User admin dibuat:")
	log.Println("     Email    : admin@simsekolah.sch.id")
	log.Println("     Password : Admin@12345")
	log.Println("     ⚠️  Segera ganti password setelah login pertama!")
}