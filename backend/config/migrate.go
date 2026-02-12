package config

import (
	"log"
	"sim-sekolah/app/models"
)

func MigrateDB() {
	err := DB.AutoMigrate(
		// Auth & RBAC
		&models.Role{},
		&models.User{},
		&models.ActivityLog{},

		// Akademik
		&models.Guru{},
		&models.Siswa{},
		&models.OrangTua{},
		&models.OrangTuaSiswa{},
		&models.TahunAjaran{},
		&models.Semester{},
		&models.Jurusan{},
		&models.Kelas{},
		&models.MataPelajaran{},

		// Jadwal, Absensi, Nilai
		&models.Jadwal{},
		&models.Absensi{},
		&models.Nilai{},
		&models.Rapor{},
	)
	if err != nil {
		log.Fatal("❌ AutoMigrate gagal:", err)
	}
	log.Println("✅ Migrasi database selesai")
}