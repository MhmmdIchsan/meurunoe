package controllers

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"sim-sekolah/app/middlewares"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// ═══════════════════════════════════════════════════════════════
// PERTEMUAN
// ═══════════════════════════════════════════════════════════════

func GetPertemuan(c *gin.Context) {
	jadwalID := c.Query("jadwal_id")
	kelasID := c.Query("kelas_id")

	query := config.DB.Model(&models.Pertemuan{}).
		Preload("Jadwal.Kelas").
		Preload("Jadwal.MataPelajaran").
		Preload("Jadwal.Guru").
		Order("pertemuan_ke ASC")

	if jadwalID != "" {
		query = query.Where("jadwal_id = ?", jadwalID)
	}
	if kelasID != "" {
		query = query.Where("jadwal_id IN (SELECT id FROM jadwals WHERE kelas_id = ?)", kelasID)
	}

	// Filter guru: hanya lihat pertemuan dari jadwal miliknya
	claims := middlewares.GetCurrentUser(c)
	if claims != nil {
		role := claims.Role
		if role == models.RoleGuru || role == models.RoleWaliKelas {
			query = query.Where("jadwal_id IN (SELECT id FROM jadwals WHERE guru_id = (SELECT id FROM gurus WHERE user_id = ?))", claims.UserID)
		} else if role == models.RoleSiswa {
			query = query.Where("jadwal_id IN (SELECT id FROM jadwals WHERE kelas_id = (SELECT kelas_id FROM siswas WHERE user_id = ?))", claims.UserID)
		}
	}

	var list []models.Pertemuan
	query.Find(&list)
	utils.ResponseOK(c, "Daftar pertemuan", list)
}

func GetPertemuanByID(c *gin.Context) {
	var p models.Pertemuan
	if err := config.DB.
		Preload("Jadwal.Kelas").
		Preload("Jadwal.MataPelajaran").
		Preload("Jadwal.Guru").
		Preload("Kehadiran.Siswa").
		Preload("Materi").
		First(&p, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Pertemuan tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail pertemuan", p)
}

func CreatePertemuan(c *gin.Context) {
	var req struct {
		JadwalID    uint   `json:"jadwal_id" binding:"required"`
		PertemuanKe int    `json:"pertemuan_ke" binding:"required"`
		Tanggal     string `json:"tanggal" binding:"required"`
		Topik       string `json:"topik"`
		Deskripsi   string `json:"deskripsi"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	tanggal, _ := time.Parse("2006-01-02", req.Tanggal)

	p := models.Pertemuan{
		JadwalID:    req.JadwalID,
		PertemuanKe: req.PertemuanKe,
		Tanggal:     tanggal,
		Topik:       req.Topik,
		Deskripsi:   req.Deskripsi,
	}
	config.DB.Create(&p)
	utils.ResponseCreated(c, "Pertemuan berhasil dibuat", p)
}

func UpdatePertemuan(c *gin.Context) {
	var p models.Pertemuan
	if err := config.DB.First(&p, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Pertemuan tidak ditemukan")
		return
	}

	var req struct {
		Topik     string `json:"topik"`
		Deskripsi string `json:"deskripsi"`
		Tanggal   string `json:"tanggal"`
	}
	c.ShouldBindJSON(&req)

	updates := map[string]interface{}{}
	if req.Topik != "" {
		updates["topik"] = req.Topik
	}
	if req.Deskripsi != "" {
		updates["deskripsi"] = req.Deskripsi
	}
	if req.Tanggal != "" {
		t, _ := time.Parse("2006-01-02", req.Tanggal)
		updates["tanggal"] = t
	}
	config.DB.Model(&p).Updates(updates)
	utils.ResponseOK(c, "Pertemuan berhasil diupdate", p)
}

func DeletePertemuan(c *gin.Context) {
	config.DB.Delete(&models.Pertemuan{}, c.Param("id"))
	utils.ResponseOK(c, "Pertemuan berhasil dihapus", nil)
}

// ═══════════════════════════════════════════════════════════════
// KEHADIRAN (per pertemuan)
// ═══════════════════════════════════════════════════════════════

func GetKehadiran(c *gin.Context) {
	pertemuanID := c.Query("pertemuan_id")

	query := config.DB.Model(&models.Kehadiran{}).Preload("Siswa")
	if pertemuanID != "" {
		query = query.Where("pertemuan_id = ?", pertemuanID)
	}

	var list []models.Kehadiran
	query.Find(&list)
	utils.ResponseOK(c, "Daftar kehadiran", list)
}

func InputKehadiran(c *gin.Context) {
	var req struct {
		PertemuanID uint                   `json:"pertemuan_id" binding:"required"`
		Kehadiran   []KehadiranItem        `json:"kehadiran" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	for _, item := range req.Kehadiran {
		var k models.Kehadiran
		config.DB.Where("pertemuan_id = ? AND siswa_id = ?", req.PertemuanID, item.SiswaID).First(&k)

		if k.ID != 0 {
			config.DB.Model(&k).Updates(map[string]interface{}{
				"status":     item.Status,
				"keterangan": item.Keterangan,
			})
		} else {
			config.DB.Create(&models.Kehadiran{
				PertemuanID: req.PertemuanID,
				SiswaID:     item.SiswaID,
				Status:      item.Status,
				Keterangan:  item.Keterangan,
			})
		}
	}

	utils.ResponseOK(c, "Kehadiran berhasil disimpan", nil)
}

type KehadiranItem struct {
	SiswaID    uint   `json:"siswa_id"`
	Status     string `json:"status"` // hadir/izin/sakit/alfa
	Keterangan string `json:"keterangan"`
}

// ═══════════════════════════════════════════════════════════════
// MATERI
// ═══════════════════════════════════════════════════════════════

func GetMateri(c *gin.Context) {
	var list []models.Materi
	config.DB.Where("pertemuan_id = ?", c.Query("pertemuan_id")).Find(&list)
	utils.ResponseOK(c, "Daftar materi", list)
}

func CreateMateri(c *gin.Context) {
	var req struct {
		PertemuanID uint   `json:"pertemuan_id" binding:"required"`
		Judul       string `json:"judul" binding:"required"`
		Tipe        string `json:"tipe" binding:"required,oneof=video dokumen link"`
		FilePath    string `json:"file_path"`
		URL         string `json:"url"`
		Deskripsi   string `json:"deskripsi"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	m := models.Materi{
		PertemuanID: req.PertemuanID,
		Judul:       req.Judul,
		Tipe:        req.Tipe,
		FilePath:    req.FilePath,
		URL:         req.URL,
		Deskripsi:   req.Deskripsi,
	}
	config.DB.Create(&m)
	utils.ResponseCreated(c, "Materi berhasil ditambahkan", m)
}

func DeleteMateri(c *gin.Context) {
	config.DB.Delete(&models.Materi{}, c.Param("id"))
	utils.ResponseOK(c, "Materi berhasil dihapus", nil)
}

// ═══════════════════════════════════════════════════════════════
// QUIZ
// ═══════════════════════════════════════════════════════════════

func GetQuiz(c *gin.Context) {
	pertemuanID := c.Query("pertemuan_id")
	query := config.DB.Model(&models.Quiz{}).Preload("Soal")
	if pertemuanID != "" {
		query = query.Where("pertemuan_id = ?", pertemuanID)
	}
	var list []models.Quiz
	query.Find(&list)
	utils.ResponseOK(c, "Daftar quiz", list)
}

func GetQuizByID(c *gin.Context) {
	var q models.Quiz
	config.DB.Preload("Soal").First(&q, c.Param("id"))

	// Untuk siswa: jangan tampilkan jawaban benar
	claims := middlewares.GetCurrentUser(c)
	if claims != nil && claims.Role == models.RoleSiswa {
		for i := range q.Soal {
			q.Soal[i].JawabanBenar = ""
		}
	}

	utils.ResponseOK(c, "Detail quiz", q)
}

func CreateQuiz(c *gin.Context) {
	var req struct {
		PertemuanID uint                `json:"pertemuan_id" binding:"required"`
		Judul       string              `json:"judul" binding:"required"`
		Deskripsi   string              `json:"deskripsi"`
		Deadline    string              `json:"deadline"`
		DurasiMenit int                 `json:"durasi_menit"`
		Soal        []CreateSoalRequest `json:"soal"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	deadline, _ := time.Parse("2006-01-02T15:04", req.Deadline)
	if req.DurasiMenit == 0 {
		req.DurasiMenit = 30
	}

	quiz := models.Quiz{
		PertemuanID: req.PertemuanID,
		Judul:       req.Judul,
		Deskripsi:   req.Deskripsi,
		Deadline:    deadline,
		DurasiMenit: req.DurasiMenit,
	}
	config.DB.Create(&quiz)

	for _, s := range req.Soal {
		config.DB.Create(&models.QuizSoal{
			QuizID:       quiz.ID,
			Nomor:        s.Nomor,
			Pertanyaan:   s.Pertanyaan,
			PilihanA:     s.PilihanA,
			PilihanB:     s.PilihanB,
			PilihanC:     s.PilihanC,
			PilihanD:     s.PilihanD,
			JawabanBenar: s.JawabanBenar,
			Bobot:        s.Bobot,
		})
	}

	config.DB.Preload("Soal").First(&quiz, quiz.ID)
	utils.ResponseCreated(c, "Quiz berhasil dibuat", quiz)
}

type CreateSoalRequest struct {
	Nomor        int     `json:"nomor"`
	Pertanyaan   string  `json:"pertanyaan"`
	PilihanA     string  `json:"pilihan_a"`
	PilihanB     string  `json:"pilihan_b"`
	PilihanC     string  `json:"pilihan_c"`
	PilihanD     string  `json:"pilihan_d"`
	JawabanBenar string  `json:"jawaban_benar"`
	Bobot        float64 `json:"bobot"`
}

func DeleteQuiz(c *gin.Context) {
	config.DB.Where("quiz_id = ?", c.Param("id")).Delete(&models.QuizSoal{})
	config.DB.Delete(&models.Quiz{}, c.Param("id"))
	utils.ResponseOK(c, "Quiz berhasil dihapus", nil)
}

// Submit jawaban quiz oleh siswa
func SubmitJawaban(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)

	var req struct {
		QuizID  uint              `json:"quiz_id" binding:"required"`
		Jawaban map[string]string `json:"jawaban" binding:"required"` // {"1":"a","2":"b",...}
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Cari siswa dari user yang login
	var siswa models.Siswa
	if err := config.DB.Where("user_id = ?", claims.UserID).First(&siswa).Error; err != nil {
		utils.ResponseBadRequest(c, "Data siswa tidak ditemukan", nil)
		return
	}

	// Cek quiz masih dalam deadline
	var quiz models.Quiz
	config.DB.First(&quiz, req.QuizID)
	if !quiz.Deadline.IsZero() && time.Now().After(quiz.Deadline) {
		utils.ResponseBadRequest(c, "Quiz sudah melewati deadline", nil)
		return
	}

	// Ambil semua soal quiz untuk koreksi otomatis
	var soalList []models.QuizSoal
	config.DB.Where("quiz_id = ?", req.QuizID).Find(&soalList)

	// Koreksi jawaban
	benar := 0
	totalBobot := 0.0
	for _, s := range soalList {
		key := strconv.Itoa(s.Nomor)
		jawabanSiswa, ok := req.Jawaban[key]
		if ok && jawabanSiswa == s.JawabanBenar {
			benar++
			totalBobot += s.Bobot
		}
	}

	// Simpan jawaban
	jawabanJSON, _ := json.Marshal(req.Jawaban)
	now := time.Now()

	// Cek apakah sudah pernah submit (update atau create)
	var existing models.QuizJawaban
	if err := config.DB.Where("quiz_id = ? AND siswa_id = ?", req.QuizID, siswa.ID).First(&existing).Error; err == nil {
		config.DB.Model(&existing).Updates(map[string]interface{}{
			"jawaban":      string(jawabanJSON),
			"nilai":        totalBobot,
			"selesai_pada": now,
		})
	} else {
		config.DB.Create(&models.QuizJawaban{
			QuizID:      req.QuizID,
			SiswaID:     siswa.ID,
			Jawaban:     string(jawabanJSON),
			Nilai:       totalBobot,
			SelesaiPada: &now,
		})
	}

	utils.ResponseOK(c, "Jawaban berhasil dikirim", gin.H{
		"benar":       benar,
		"total_soal":  len(soalList),
		"nilai":       totalBobot,
	})
}

// Rekap jawaban quiz (untuk guru)
func GetQuizJawaban(c *gin.Context) {
	quizID := c.Query("quiz_id")
	var list []models.QuizJawaban
	config.DB.Preload("Siswa").Where("quiz_id = ?", quizID).Find(&list)
	utils.ResponseOK(c, "Daftar jawaban quiz", list)
}

// ═══════════════════════════════════════════════════════════════
// TUGAS & PENGUMPULAN
// ═══════════════════════════════════════════════════════════════

func GetTugas(c *gin.Context) {
	pertemuanID := c.Query("pertemuan_id")
	var list []models.Tugas
	config.DB.Where("pertemuan_id = ?", pertemuanID).Preload("Pengumpulan.Siswa").Find(&list)
	utils.ResponseOK(c, "Daftar tugas", list)
}

func CreateTugas(c *gin.Context) {
	var req struct {
		PertemuanID uint   `json:"pertemuan_id" binding:"required"`
		Judul       string `json:"judul" binding:"required"`
		Deskripsi   string `json:"deskripsi"`
		Deadline    string `json:"deadline"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	deadline, _ := time.Parse("2006-01-02T15:04", req.Deadline)

	t := models.Tugas{
		PertemuanID: req.PertemuanID,
		Judul:       req.Judul,
		Deskripsi:   req.Deskripsi,
		Deadline:    deadline,
	}
	config.DB.Create(&t)
	utils.ResponseCreated(c, "Tugas berhasil dibuat", t)
}

func DeleteTugas(c *gin.Context) {
	config.DB.Where("tugas_id = ?", c.Param("id")).Delete(&models.Pengumpulan{})
	config.DB.Delete(&models.Tugas{}, c.Param("id"))
	utils.ResponseOK(c, "Tugas berhasil dihapus", nil)
}

// Upload pengumpulan oleh siswa
func UploadPengumpulan(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)

	var siswa models.Siswa
	if err := config.DB.Where("user_id = ?", claims.UserID).First(&siswa).Error; err != nil {
		utils.ResponseBadRequest(c, "Data siswa tidak ditemukan", nil)
		return
	}

	tugasID, _ := strconv.Atoi(c.PostForm("tugas_id"))
	catatan := c.PostForm("catatan")

	file, err := c.FormFile("file")
	if err != nil {
		utils.ResponseBadRequest(c, "File wajib diupload", nil)
		return
	}

	// Simpan file
	path := "uploads/tugas/" + strconv.Itoa(tugasID) + "_" + file.Filename
	c.SaveUploadedFile(file, path)

	// Cek existing
	var existing models.Pengumpulan
	if err := config.DB.Where("tugas_id = ? AND siswa_id = ?", tugasID, siswa.ID).First(&existing).Error; err == nil {
		config.DB.Model(&existing).Updates(map[string]interface{}{
			"file_path":        path,
			"catatan":          catatan,
			"dikumpulkan_pada": time.Now(),
		})
	} else {
		config.DB.Create(&models.Pengumpulan{
			TugasID:         uint(tugasID),
			SiswaID:         siswa.ID,
			FilePath:        path,
			Catatan:         catatan,
			DikumpulkanPada: time.Now(),
		})
	}

	utils.ResponseOK(c, "Tugas berhasil dikumpulkan", nil)
}

// Beri nilai pengumpulan (oleh guru)
func NilaiPengumpulan(c *gin.Context) {
	var req struct {
		Nilai float64 `json:"nilai"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	config.DB.Model(&models.Pengumpulan{}).Where("id = ?", c.Param("id")).Update("nilai", req.Nilai)
	utils.ResponseOK(c, "Nilai berhasil disimpan", nil)
}
