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

	log.Println("🌱 Mulai seeding data siswa...")

	seedSiswa()

	log.Println("✅ Seeding siswa selesai!")
}

func seedSiswa() {
	// Cari role siswa
	var roleSiswa models.Role
	if err := config.DB.Where("nama = ?", models.RoleSiswa).First(&roleSiswa).Error; err != nil {
		log.Fatal("❌ Role siswa tidak ditemukan — jalankan `make seed` dulu")
	}

	// Cari kelas yang tersedia
	var kelasList []models.Kelas
	config.DB.Find(&kelasList)
	if len(kelasList) == 0 {
		log.Println("⚠️  Tidak ada kelas — siswa dibuat tanpa kelas. Isi data kelas dulu lewat admin panel.")
	}

	// Daftar siswa yang akan di-seed
	type siswaSeed struct {
		Nama         string
		Email        string
		Password     string
		NISN         string
		NIS          string
		JenisKelamin string
		Alamat       string
		KelasIndex   int // index ke kelasList, -1 = tanpa kelas
	}

	seeds := []siswaSeed{
		{
			Nama: "Andi Pratama", Email: "andi@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345678", NIS: "2024001", JenisKelamin: "L",
			Alamat: "Jl. Merdeka No. 1, Jakarta", KelasIndex: 0,
		},
		{
			Nama: "Bunga Citra Lestari", Email: "bunga@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345679", NIS: "2024002", JenisKelamin: "P",
			Alamat: "Jl. Sudirman No. 2, Jakarta", KelasIndex: 0,
		},
		{
			Nama: "Candra Wijaya", Email: "candra@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345680", NIS: "2024003", JenisKelamin: "L",
			Alamat: "Jl. Thamrin No. 3, Jakarta", KelasIndex: 0,
		},
		{
			Nama: "Dewi Sartika", Email: "dewi@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345681", NIS: "2024004", JenisKelamin: "P",
			Alamat: "Jl. Gatot Subroto No. 4, Jakarta", KelasIndex: 0,
		},
		{
			Nama: "Eko Prasetyo", Email: "eko@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345682", NIS: "2024005", JenisKelamin: "L",
			Alamat: "Jl. Diponegoro No. 5, Jakarta", KelasIndex: 0,
		},
		{
			Nama: "Fitri Handayani", Email: "fitri@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345683", NIS: "2024006", JenisKelamin: "P",
			Alamat: "Jl. Ahmad Yani No. 6, Jakarta", KelasIndex: 0,
		},
		{
			Nama: "Gilang Ramadhan", Email: "gilang@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345684", NIS: "2024007", JenisKelamin: "L",
			Alamat: "Jl. Pemuda No. 7, Jakarta", KelasIndex: 0,
		},
		{
			Nama: "Hana Safira", Email: "hana@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345685", NIS: "2024008", JenisKelamin: "P",
			Alamat: "Jl. Gajah Mada No. 8, Jakarta", KelasIndex: 0,
		},
		{
			Nama: "Irfan Hakim", Email: "irfan@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345686", NIS: "2024009", JenisKelamin: "L",
			Alamat: "Jl. Hayam Wuruk No. 9, Jakarta", KelasIndex: 0,
		},
		{
			Nama: "Jasmine Aurelia", Email: "jasmine@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345687", NIS: "2024010", JenisKelamin: "P",
			Alamat: "Jl. Mangga Dua No. 10, Jakarta", KelasIndex: 0,
		},
		{
			Nama: "Kevin Ardiansyah", Email: "kevin@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345688", NIS: "2024011", JenisKelamin: "L",
			Alamat: "Jl. Kelapa Gading No. 11, Jakarta", KelasIndex: -1,
		},
		{
			Nama: "Luna Maya Sari", Email: "luna@siswa.sch.id", Password: "Siswa@123",
			NISN: "0012345689", NIS: "2024012", JenisKelamin: "P",
			Alamat: "Jl. Pondok Indah No. 12, Jakarta", KelasIndex: -1,
		},
	}

	created := 0
	skipped := 0

	for i, s := range seeds {
		// Cek email sudah ada
		var existingUser models.User
		if err := config.DB.Where("email = ?", s.Email).First(&existingUser).Error; err == nil {
			log.Printf("   - User %s sudah ada, dilewati", s.Email)
			skipped++
			continue
		}

		// Cek NISN sudah ada
		var existingSiswa models.Siswa
		if err := config.DB.Where("nisn = ?", s.NISN).First(&existingSiswa).Error; err == nil {
			log.Printf("   - NISN %s sudah ada, dilewati", s.NISN)
			skipped++
			continue
		}

		// Tentukan kelas
		var kelasID *uint
		if s.KelasIndex >= 0 && s.KelasIndex < len(kelasList) {
			kelasID = &kelasList[s.KelasIndex].ID
		}

		// Buat user + siswa
		user := models.User{
			RoleID:   roleSiswa.ID,
			Nama:     s.Nama,
			Email:    s.Email,
			Password: s.Password,
			IsActive: true,
		}
		if err := config.DB.Create(&user).Error; err != nil {
			log.Printf("❌ Gagal membuat user %s: %v", s.Email, err)
			continue
		}

		siswa := models.Siswa{
			UserID:       user.ID,
			NISN:         s.NISN,
			NIS:          s.NIS,
			Nama:         s.Nama,
			JenisKelamin: s.JenisKelamin,
			Alamat:       s.Alamat,
			KelasID:      kelasID,
		}
		if err := config.DB.Create(&siswa).Error; err != nil {
			log.Printf("❌ Gagal membuat siswa %s: %v", s.NISN, err)
			continue
		}

		created++
		kelasNama := "(tanpa kelas)"
		if kelasID != nil {
			kelasNama = fmt.Sprintf("kelas %s", kelasList[s.KelasIndex].Nama)
		}
		log.Printf("   ✔ #%d %s — %s (%s)", i+1, s.Nama, s.Email, kelasNama)
	}

	fmt.Println()
	log.Printf("✅ %d siswa baru dibuat, %d dilewati (sudah ada)", created, skipped)

	// Tampilkan ringkasan login
	if created > 0 {
		fmt.Println()
		log.Println("📋 Contoh login siswa:")
		log.Println("   Email    : andi@siswa.sch.id")
		log.Println("   Password : Siswa@123")
		log.Println()
		log.Println("   (semua siswa menggunakan password yang sama: Siswa@123)")
	}
}
