package main

import (
	"log"

	"sim-sekolah/app/models"
	"sim-sekolah/config"
)

func main() {
	config.LoadEnv()
	config.ConnectDB()

	log.Println("🌱 Mulai seeding data akademik (kelas, mapel, guru)...")

	seedMataPelajaran()
	seedGuru()
	seedKelas()

	log.Println("✅ Seeding akademik selesai!")
}

func seedMataPelajaran() {
	mapel := []models.MataPelajaran{
		{Kode: "MTK", Nama: "Matematika", KKM: 75},
		{Kode: "BIN", Nama: "Bahasa Indonesia", KKM: 75},
		{Kode: "BIG", Nama: "Bahasa Inggris", KKM: 75},
		{Kode: "PBO", Nama: "Pemrograman Berorientasi Objek", KKM: 78},
		{Kode: "BDT", Nama: "Basis Data", KKM: 78},
		{Kode: "PWD", Nama: "Pemrograman Web Dinamis", KKM: 78},
		{Kode: "PPL", Nama: "Pemrograman Perangkat Lunak", KKM: 78},
		{Kode: "PKK", Nama: "Produk Kreatif dan Kewirausahaan", KKM: 75},
		{Kode: "AGM", Nama: "Pendidikan Agama Islam", KKM: 75},
		{Kode: "PKN", Nama: "PPKn", KKM: 75},
		{Kode: "PJO", Nama: "Pendidikan Jasmani & Olahraga", KKM: 75},
	}

	created := 0
	for _, m := range mapel {
		var existing models.MataPelajaran
		if err := config.DB.Where("kode = ?", m.Kode).First(&existing).Error; err == nil {
			log.Printf("   - Mapel %s sudah ada, dilewati", m.Nama)
			continue
		}
		if err := config.DB.Create(&m).Error; err != nil {
			log.Printf("❌ Gagal membuat mapel %s: %v", m.Nama, err)
			continue
		}
		log.Printf("   ✔ %s (%s) — KKM %.0f", m.Nama, m.Kode, m.KKM)
		created++
	}
	log.Printf("✅ %d mata pelajaran baru dibuat", created)
}

func seedGuru() {
	// Cari role guru
	var roleGuru models.Role
	if err := config.DB.Where("nama = ?", models.RoleGuru).First(&roleGuru).Error; err != nil {
		log.Fatal("❌ Role guru tidak ditemukan")
	}

	type guruData struct {
		Email        string
		Password     string
		Nama         string
		NIP          string
		JenisKelamin string
		Telepon      string
		Alamat       string
	}

	gurus := []guruData{
		{Email: "budi.santoso@sekolah.sch.id", Password: "Guru@123", Nama: "Budi Santoso, S.Pd.", NIP: "198501012010011001", JenisKelamin: "L", Telepon: "081234567890", Alamat: "Jl. Melati No. 1"},
		{Email: "siti.nuraini@sekolah.sch.id", Password: "Guru@123", Nama: "Siti Nuraini, S.Kom.", NIP: "198702022011012002", JenisKelamin: "P", Telepon: "081234567891", Alamat: "Jl. Mawar No. 2"},
		{Email: "ahmad.ridwan@sekolah.sch.id", Password: "Guru@123", Nama: "Ahmad Ridwan, S.T.", NIP: "198903032012011003", JenisKelamin: "L", Telepon: "081234567892", Alamat: "Jl. Anggrek No. 3"},
		{Email: "dewi.kartika@sekolah.sch.id", Password: "Guru@123", Nama: "Dewi Kartika, S.Pd.", NIP: "199004042013012004", JenisKelamin: "P", Telepon: "081234567893", Alamat: "Jl. Dahlia No. 4"},
	}

	created := 0
	for _, g := range gurus {
		// Cek email
		var existingUser models.User
		if err := config.DB.Where("email = ?", g.Email).First(&existingUser).Error; err == nil {
			log.Printf("   - User %s sudah ada, dilewati", g.Email)
			continue
		}

		// Buat user + guru dalam transaksi
		user := models.User{
			RoleID:   roleGuru.ID,
			Nama:     g.Nama,
			Email:    g.Email,
			Password: g.Password,
			IsActive: true,
		}
		if err := config.DB.Create(&user).Error; err != nil {
			log.Printf("❌ Gagal buat user %s: %v", g.Email, err)
			continue
		}

		guru := models.Guru{
			UserID:       user.ID,
			NIP:          g.NIP,
			Nama:         g.Nama,
			JenisKelamin: g.JenisKelamin,
			Telepon:      g.Telepon,
			Alamat:       g.Alamat,
		}
		if err := config.DB.Create(&guru).Error; err != nil {
			log.Printf("❌ Gagal buat guru %s: %v", g.Nama, err)
			continue
		}

		log.Printf("   ✔ %s — %s / %s", g.Nama, g.Email, g.Password)
		created++
	}
	log.Printf("✅ %d guru baru dibuat", created)
}

func seedKelas() {
	// Cari jurusan & tahun ajaran
	var jurusan models.Jurusan
	if err := config.DB.First(&jurusan).Error; err != nil {
		log.Println("⚠️  Tidak ada jurusan — kelas tidak dibuat")
		return
	}
	var ta models.TahunAjaran
	if err := config.DB.First(&ta).Error; err != nil {
		log.Println("⚠️  Tidak ada tahun ajaran — kelas tidak dibuat")
		return
	}

	kelasList := []struct {
		Nama    string
		Tingkat string
	}{
		{Nama: "X RPL 1", Tingkat: "X"},
		{Nama: "X RPL 2", Tingkat: "X"},
		{Nama: "XI RPL 1", Tingkat: "XI"},
		{Nama: "XI RPL 2", Tingkat: "XI"},
		{Nama: "XII RPL 1", Tingkat: "XII"},
		{Nama: "XII RPL 2", Tingkat: "XII"},
	}

	created := 0
	for _, k := range kelasList {
		var existing models.Kelas
		if err := config.DB.Where("nama = ? AND tahun_ajaran_id = ?", k.Nama, ta.ID).First(&existing).Error; err == nil {
			log.Printf("   - Kelas %s sudah ada, dilewati", k.Nama)
			continue
		}

		kelas := models.Kelas{
			Nama:          k.Nama,
			Tingkat:       k.Tingkat,
			JurusanID:     jurusan.ID,
			TahunAjaranID: ta.ID,
		}
		if err := config.DB.Create(&kelas).Error; err != nil {
			log.Printf("❌ Gagal buat kelas %s: %v", k.Nama, err)
			continue
		}
		log.Printf("   ✔ %s (Tingkat %s, %s, TA %s)", k.Nama, k.Tingkat, jurusan.Nama, ta.Nama)
		created++
	}
	log.Printf("✅ %d kelas baru dibuat", created)
}
