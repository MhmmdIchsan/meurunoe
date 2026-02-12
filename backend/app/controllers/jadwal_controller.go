package controllers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"sim-sekolah/app/middlewares"
	"sim-sekolah/app/models"
	"sim-sekolah/app/services"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// ── DTOs ──────────────────────────────────────────────────────

type CreateJadwalRequest struct {
	KelasID         uint   `json:"kelas_id" binding:"required"`
	GuruID          uint   `json:"guru_id" binding:"required"`
	MataPelajaranID uint   `json:"mata_pelajaran_id" binding:"required"`
	SemesterID      uint   `json:"semester_id" binding:"required"`
	HariKe          int    `json:"hari_ke" binding:"required,min=1,max=6"`
	JamMulai        string `json:"jam_mulai" binding:"required"`  // "07:00"
	JamSelesai      string `json:"jam_selesai" binding:"required"` // "08:30"
}

type UpdateJadwalRequest struct {
	GuruID          uint   `json:"guru_id"`
	MataPelajaranID uint   `json:"mata_pelajaran_id"`
	HariKe          int    `json:"hari_ke" binding:"omitempty,min=1,max=6"`
	JamMulai        string `json:"jam_mulai"`
	JamSelesai      string `json:"jam_selesai"`
}

// ── Helpers ───────────────────────────────────────────────────

func preloadJadwal(query interface{ Preload(string, ...interface{}) interface{ Find(interface{}, ...interface{}) interface{ Error error } } }) {
	// helper placeholder — preload dilakukan inline
}

// ── Handlers ──────────────────────────────────────────────────

// GetJadwal godoc
// @Summary Daftar jadwal (bisa filter semester, kelas, guru, hari)
// @Tags Jadwal
// @Security BearerAuth
// @Param semester_id query int false "Filter semester"
// @Param kelas_id query int false "Filter kelas"
// @Param guru_id query int false "Filter guru"
// @Param hari_ke query int false "Filter hari (1-6)"
// @Router /jadwal [get]
func GetJadwal(c *gin.Context) {
	query := config.DB.Model(&models.Jadwal{}).
		Preload("Kelas.Jurusan").
		Preload("Guru").
		Preload("MataPelajaran").
		Preload("Semester.TahunAjaran")

	if v := c.Query("semester_id"); v != "" {
		query = query.Where("semester_id = ?", v)
	}
	if v := c.Query("kelas_id"); v != "" {
		query = query.Where("kelas_id = ?", v)
	}
	if v := c.Query("guru_id"); v != "" {
		query = query.Where("guru_id = ?", v)
	}
	if v := c.Query("hari_ke"); v != "" {
		query = query.Where("hari_ke = ?", v)
	}

	var list []models.Jadwal
	query.Order("hari_ke ASC, jam_mulai ASC").Find(&list)
	utils.ResponseOK(c, "Daftar jadwal", list)
}

// GetJadwalByID godoc
// @Summary Detail jadwal
// @Tags Jadwal
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /jadwal/{id} [get]
func GetJadwalByID(c *gin.Context) {
	var j models.Jadwal
	err := config.DB.
		Preload("Kelas.Jurusan").
		Preload("Guru").
		Preload("MataPelajaran").
		Preload("Semester.TahunAjaran").
		First(&j, c.Param("id")).Error
	if err != nil {
		utils.ResponseNotFound(c, "Jadwal tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail jadwal", j)
}

// GetJadwalKelas godoc
// @Summary Jadwal mingguan satu kelas (dikelompokkan per hari)
// @Tags Jadwal
// @Security BearerAuth
// @Param kelas_id path int true "Kelas ID"
// @Param semester_id query int true "Semester ID"
// @Router /jadwal/kelas/{kelas_id} [get]
func GetJadwalKelas(c *gin.Context) {
	kelasID, _ := strconv.ParseUint(c.Param("kelas_id"), 10, 64)
	semesterID, _ := strconv.ParseUint(c.Query("semester_id"), 10, 64)

	if semesterID == 0 {
		utils.ResponseBadRequest(c, "Parameter semester_id wajib diisi", nil)
		return
	}

	var kelas models.Kelas
	if err := config.DB.Preload("Jurusan").Preload("WaliKelas").First(&kelas, kelasID).Error; err != nil {
		utils.ResponseNotFound(c, "Kelas tidak ditemukan")
		return
	}

	jadwalPerHari := services.GetJadwalMingguanKelas(uint(kelasID), uint(semesterID))

	utils.ResponseOK(c, "Jadwal kelas "+kelas.Nama, gin.H{
		"kelas":          kelas,
		"jadwal_per_hari": jadwalPerHari,
	})
}

// GetJadwalGuru godoc
// @Summary Jadwal mengajar seorang guru (dikelompokkan per hari)
// @Tags Jadwal
// @Security BearerAuth
// @Param guru_id path int true "Guru ID"
// @Param semester_id query int true "Semester ID"
// @Router /jadwal/guru/{guru_id} [get]
func GetJadwalGuru(c *gin.Context) {
	guruID, _ := strconv.ParseUint(c.Param("guru_id"), 10, 64)
	semesterID, _ := strconv.ParseUint(c.Query("semester_id"), 10, 64)

	if semesterID == 0 {
		utils.ResponseBadRequest(c, "Parameter semester_id wajib diisi", nil)
		return
	}

	var guru models.Guru
	if err := config.DB.First(&guru, guruID).Error; err != nil {
		utils.ResponseNotFound(c, "Guru tidak ditemukan")
		return
	}

	jadwalPerHari := services.GetJadwalMingguanGuru(uint(guruID), uint(semesterID))

	// Hitung total jam mengajar per minggu
	totalSlot := 0
	for _, slot := range jadwalPerHari {
		totalSlot += len(slot)
	}

	utils.ResponseOK(c, "Jadwal mengajar "+guru.Nama, gin.H{
		"guru":            guru,
		"jadwal_per_hari": jadwalPerHari,
		"total_slot":      totalSlot,
	})
}

// GetJadwalSaya godoc
// @Summary Jadwal pelajaran/mengajar milik user yang sedang login
// @Tags Jadwal
// @Security BearerAuth
// @Param semester_id query int true "Semester ID"
// @Router /jadwal/saya [get]
func GetJadwalSaya(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	semesterID, _ := strconv.ParseUint(c.Query("semester_id"), 10, 64)

	if semesterID == 0 {
		utils.ResponseBadRequest(c, "Parameter semester_id wajib diisi", nil)
		return
	}

	switch claims.Role {
	case models.RoleGuru, models.RoleWaliKelas:
		// Cari data guru berdasarkan user_id
		var guru models.Guru
		if err := config.DB.Where("user_id = ?", claims.UserID).First(&guru).Error; err != nil {
			utils.ResponseNotFound(c, "Data guru tidak ditemukan")
			return
		}
		jadwalPerHari := services.GetJadwalMingguanGuru(guru.ID, uint(semesterID))
		utils.ResponseOK(c, "Jadwal mengajar saya", gin.H{
			"guru":            guru,
			"jadwal_per_hari": jadwalPerHari,
		})

	case models.RoleSiswa:
		// Cari data siswa → kelas → jadwal kelas
		var siswa models.Siswa
		if err := config.DB.Where("user_id = ?", claims.UserID).First(&siswa).Error; err != nil {
			utils.ResponseNotFound(c, "Data siswa tidak ditemukan")
			return
		}
		if siswa.KelasID == nil {
			utils.ResponseBadRequest(c, "Siswa belum memiliki kelas", nil)
			return
		}
		jadwalPerHari := services.GetJadwalMingguanKelas(*siswa.KelasID, uint(semesterID))
		utils.ResponseOK(c, "Jadwal pelajaran saya", gin.H{
			"siswa":           siswa,
			"jadwal_per_hari": jadwalPerHari,
		})

	default:
		utils.ResponseForbidden(c, "Role ini tidak memiliki jadwal personal")
	}
}

// ValidasiJadwal godoc
// @Summary Cek apakah slot jadwal bentrok (dry-run, tanpa menyimpan)
// @Tags Jadwal
// @Security BearerAuth
// @Router /jadwal/validasi [post]
func ValidasiJadwal(c *gin.Context) {
	var req CreateJadwalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	if req.JamMulai >= req.JamSelesai {
		utils.ResponseBadRequest(c, "Jam mulai harus lebih awal dari jam selesai", nil)
		return
	}

	hasil := services.ValidasiKonflikJadwal(
		req.SemesterID, req.KelasID, req.GuruID,
		req.HariKe, req.JamMulai, req.JamSelesai, 0,
	)

	if hasil.AdaKonflik {
		utils.ResponseBadRequest(c, "Jadwal bentrok terdeteksi", hasil)
		return
	}

	utils.ResponseOK(c, "Tidak ada konflik, jadwal aman untuk disimpan", hasil)
}

// CreateJadwal godoc
// @Summary Buat jadwal baru (dengan validasi bentrok otomatis)
// @Tags Jadwal
// @Security BearerAuth
// @Router /jadwal [post]
func CreateJadwal(c *gin.Context) {
	var req CreateJadwalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Validasi jam
	if req.JamMulai >= req.JamSelesai {
		utils.ResponseBadRequest(c, "Jam mulai harus lebih awal dari jam selesai", nil)
		return
	}

	// Validasi FK
	if err := validateJadwalFK(c, req.KelasID, req.GuruID, req.MataPelajaranID, req.SemesterID); err != nil {
		return
	}

	// ── Cek bentrok ───────────────────────────────────────────
	hasil := services.ValidasiKonflikJadwal(
		req.SemesterID, req.KelasID, req.GuruID,
		req.HariKe, req.JamMulai, req.JamSelesai, 0,
	)
	if hasil.AdaKonflik {
		c.JSON(409, utils.APIResponse{
			Success: false,
			Message: "Gagal menyimpan jadwal — ditemukan bentrok",
			Errors:  hasil,
		})
		return
	}

	jadwal := models.Jadwal{
		KelasID:         req.KelasID,
		GuruID:          req.GuruID,
		MataPelajaranID: req.MataPelajaranID,
		SemesterID:      req.SemesterID,
		HariKe:          req.HariKe,
		JamMulai:        req.JamMulai,
		JamSelesai:      req.JamSelesai,
	}
	if err := config.DB.Create(&jadwal).Error; err != nil {
		utils.ResponseInternalError(c, "Gagal menyimpan jadwal")
		return
	}

	config.DB.
		Preload("Kelas.Jurusan").Preload("Guru").
		Preload("MataPelajaran").Preload("Semester.TahunAjaran").
		First(&jadwal, jadwal.ID)

	utils.ResponseCreated(c, "Jadwal berhasil dibuat", jadwal)
}

// UpdateJadwal godoc
// @Summary Update jadwal (dengan re-validasi bentrok)
// @Tags Jadwal
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /jadwal/{id} [put]
func UpdateJadwal(c *gin.Context) {
	var jadwal models.Jadwal
	if err := config.DB.First(&jadwal, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Jadwal tidak ditemukan")
		return
	}

	var req UpdateJadwalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Gabungkan nilai lama dengan nilai baru untuk validasi
	guruID := jadwal.GuruID
	if req.GuruID != 0 {
		guruID = req.GuruID
	}
	mapelID := jadwal.MataPelajaranID
	if req.MataPelajaranID != 0 {
		mapelID = req.MataPelajaranID
	}
	hariKe := jadwal.HariKe
	if req.HariKe != 0 {
		hariKe = req.HariKe
	}
	jamMulai := jadwal.JamMulai
	if req.JamMulai != "" {
		jamMulai = req.JamMulai
	}
	jamSelesai := jadwal.JamSelesai
	if req.JamSelesai != "" {
		jamSelesai = req.JamSelesai
	}

	if jamMulai >= jamSelesai {
		utils.ResponseBadRequest(c, "Jam mulai harus lebih awal dari jam selesai", nil)
		return
	}

	// Re-validasi dengan excludeID = jadwal.ID (kecualikan diri sendiri)
	hasil := services.ValidasiKonflikJadwal(
		jadwal.SemesterID, jadwal.KelasID, guruID,
		hariKe, jamMulai, jamSelesai, jadwal.ID,
	)
	if hasil.AdaKonflik {
		c.JSON(409, utils.APIResponse{
			Success: false,
			Message: "Update gagal — jadwal baru bentrok",
			Errors:  hasil,
		})
		return
	}

	updates := map[string]interface{}{
		"guru_id":           guruID,
		"mata_pelajaran_id": mapelID,
		"hari_ke":           hariKe,
		"jam_mulai":         jamMulai,
		"jam_selesai":       jamSelesai,
	}
	config.DB.Model(&jadwal).Updates(updates)

	config.DB.
		Preload("Kelas.Jurusan").Preload("Guru").
		Preload("MataPelajaran").Preload("Semester.TahunAjaran").
		First(&jadwal, jadwal.ID)

	utils.ResponseOK(c, "Jadwal berhasil diupdate", jadwal)
}

// DeleteJadwal godoc
// @Summary Hapus jadwal
// @Tags Jadwal
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /jadwal/{id} [delete]
func DeleteJadwal(c *gin.Context) {
	var jadwal models.Jadwal
	if err := config.DB.First(&jadwal, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Jadwal tidak ditemukan")
		return
	}

	// Cek apakah ada absensi terkait jadwal ini
	var absensiCount int64
	config.DB.Model(&models.Absensi{}).Where("jadwal_id = ?", jadwal.ID).Count(&absensiCount)
	if absensiCount > 0 {
		utils.ResponseBadRequest(c,
			"Jadwal tidak bisa dihapus karena sudah memiliki "+strconv.FormatInt(absensiCount, 10)+" data absensi",
			nil,
		)
		return
	}

	config.DB.Delete(&jadwal)
	utils.ResponseOK(c, "Jadwal berhasil dihapus", nil)
}

// BulkCreateJadwal godoc
// @Summary Buat beberapa jadwal sekaligus (batch)
// @Tags Jadwal
// @Security BearerAuth
// @Router /jadwal/bulk [post]
func BulkCreateJadwal(c *gin.Context) {
	var req struct {
		Jadwal []CreateJadwalRequest `json:"jadwal" binding:"required,min=1,max=50"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	type HasilItem struct {
		Index   int                    `json:"index"`
		Berhasil bool                  `json:"berhasil"`
		Pesan   string                 `json:"pesan"`
		Konflik *services.HasilValidasi `json:"konflik,omitempty"`
		Jadwal  *models.Jadwal         `json:"jadwal,omitempty"`
	}

	var results []HasilItem
	berhasil := 0

	for i, item := range req.Jadwal {
		res := HasilItem{Index: i + 1}

		// Validasi jam
		if item.JamMulai >= item.JamSelesai {
			res.Berhasil = false
			res.Pesan = "Jam mulai harus lebih awal dari jam selesai"
			results = append(results, res)
			continue
		}

		// Cek bentrok
		hasil := services.ValidasiKonflikJadwal(
			item.SemesterID, item.KelasID, item.GuruID,
			item.HariKe, item.JamMulai, item.JamSelesai, 0,
		)
		if hasil.AdaKonflik {
			res.Berhasil = false
			res.Pesan = "Jadwal bentrok"
			res.Konflik = &hasil
			results = append(results, res)
			continue
		}

		jadwal := models.Jadwal{
			KelasID: item.KelasID, GuruID: item.GuruID,
			MataPelajaranID: item.MataPelajaranID, SemesterID: item.SemesterID,
			HariKe: item.HariKe, JamMulai: item.JamMulai, JamSelesai: item.JamSelesai,
		}
		if err := config.DB.Create(&jadwal).Error; err != nil {
			res.Berhasil = false
			res.Pesan = "Gagal menyimpan"
		} else {
			config.DB.Preload("Kelas").Preload("Guru").Preload("MataPelajaran").First(&jadwal, jadwal.ID)
			res.Berhasil = true
			res.Pesan = "Berhasil disimpan"
			res.Jadwal = &jadwal
			berhasil++
		}
		results = append(results, res)
	}

	statusCode := 201
	if berhasil < len(req.Jadwal) {
		statusCode = 207 // Multi-status: sebagian berhasil
	}

	c.JSON(statusCode, utils.APIResponse{
		Success: berhasil > 0,
		Message: "Proses batch selesai: " + strconv.Itoa(berhasil) + "/" + strconv.Itoa(len(req.Jadwal)) + " jadwal berhasil",
		Data:    results,
	})
}

// ── Helpers ───────────────────────────────────────────────────

func validateJadwalFK(c *gin.Context, kelasID, guruID, mapelID, semesterID uint) error {
	var kelas models.Kelas
	if err := config.DB.First(&kelas, kelasID).Error; err != nil {
		utils.ResponseBadRequest(c, "Kelas tidak ditemukan", nil)
		return err
	}
	var guru models.Guru
	if err := config.DB.First(&guru, guruID).Error; err != nil {
		utils.ResponseBadRequest(c, "Guru tidak ditemukan", nil)
		return err
	}
	var mp models.MataPelajaran
	if err := config.DB.First(&mp, mapelID).Error; err != nil {
		utils.ResponseBadRequest(c, "Mata pelajaran tidak ditemukan", nil)
		return err
	}
	var sem models.Semester
	if err := config.DB.First(&sem, semesterID).Error; err != nil {
		utils.ResponseBadRequest(c, "Semester tidak ditemukan", nil)
		return err
	}
	return nil
}