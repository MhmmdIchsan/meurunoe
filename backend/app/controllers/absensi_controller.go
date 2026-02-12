package controllers

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"sim-sekolah/app/middlewares"
	"sim-sekolah/app/models"
	"sim-sekolah/config"
	"sim-sekolah/utils"
)

// ── DTOs ──────────────────────────────────────────────────────

type InputAbsensiRequest struct {
	JadwalID   uint   `json:"jadwal_id" binding:"required"`
	Tanggal    string `json:"tanggal" binding:"required"`       // "2025-02-12"
	SiswaID    uint   `json:"siswa_id" binding:"required"`
	Status     string `json:"status" binding:"required,oneof=hadir izin sakit alfa"`
	Keterangan string `json:"keterangan"`
}

type BulkAbsensiRequest struct {
	JadwalID uint   `json:"jadwal_id" binding:"required"`
	Tanggal  string `json:"tanggal" binding:"required"`
	Absensi  []struct {
		SiswaID    uint   `json:"siswa_id" binding:"required"`
		Status     string `json:"status" binding:"required,oneof=hadir izin sakit alfa"`
		Keterangan string `json:"keterangan"`
	} `json:"absensi" binding:"required,min=1"`
}

// ── Handlers ──────────────────────────────────────────────────

// GetAbsensi godoc
// @Summary Daftar absensi (bisa filter jadwal, siswa, tanggal, status)
// @Tags Absensi
// @Security BearerAuth
// @Param jadwal_id query int false "Filter jadwal"
// @Param siswa_id query int false "Filter siswa"
// @Param tanggal query string false "Filter tanggal YYYY-MM-DD"
// @Param status query string false "Filter status: hadir/izin/sakit/alfa"
// @Router /absensi [get]
func GetAbsensi(c *gin.Context) {
	query := config.DB.Model(&models.Absensi{}).
		Preload("Siswa").
		Preload("Jadwal.Kelas").
		Preload("Jadwal.Guru").
		Preload("Jadwal.MataPelajaran")

	if v := c.Query("jadwal_id"); v != "" {
		query = query.Where("jadwal_id = ?", v)
	}
	if v := c.Query("siswa_id"); v != "" {
		query = query.Where("siswa_id = ?", v)
	}
	if v := c.Query("tanggal"); v != "" {
		query = query.Where("DATE(tanggal) = ?", v)
	}
	if v := c.Query("status"); v != "" {
		query = query.Where("status = ?", v)
	}

	var list []models.Absensi
	query.Order("tanggal DESC, created_at DESC").Find(&list)
	utils.ResponseOK(c, "Daftar absensi", list)
}

// GetAbsensiByID godoc
// @Summary Detail absensi
// @Tags Absensi
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /absensi/{id} [get]
func GetAbsensiByID(c *gin.Context) {
	var abs models.Absensi
	err := config.DB.
		Preload("Siswa.Kelas").
		Preload("Jadwal.Kelas").
		Preload("Jadwal.Guru").
		Preload("Jadwal.MataPelajaran").
		First(&abs, c.Param("id")).Error
	if err != nil {
		utils.ResponseNotFound(c, "Data absensi tidak ditemukan")
		return
	}
	utils.ResponseOK(c, "Detail absensi", abs)
}

// InputAbsensi godoc
// @Summary Input absensi satu siswa
// @Tags Absensi
// @Security BearerAuth
// @Router /absensi [post]
func InputAbsensi(c *gin.Context) {
	var req InputAbsensiRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	// Parse tanggal
	tanggal, err := time.Parse("2006-01-02", req.Tanggal)
	if err != nil {
		utils.ResponseBadRequest(c, "Format tanggal salah, gunakan YYYY-MM-DD", nil)
		return
	}

	// Validasi FK
	var jadwal models.Jadwal
	if err := config.DB.First(&jadwal, req.JadwalID).Error; err != nil {
		utils.ResponseBadRequest(c, "Jadwal tidak ditemukan", nil)
		return
	}
	var siswa models.Siswa
	if err := config.DB.First(&siswa, req.SiswaID).Error; err != nil {
		utils.ResponseBadRequest(c, "Siswa tidak ditemukan", nil)
		return
	}

	// Cek duplikasi: satu siswa hanya boleh 1 absensi per jadwal per tanggal
	var existing models.Absensi
	err = config.DB.Where("jadwal_id = ? AND siswa_id = ? AND DATE(tanggal) = ?",
		req.JadwalID, req.SiswaID, req.Tanggal).First(&existing).Error
	if err == nil {
		utils.ResponseBadRequest(c, "Absensi siswa ini sudah diinput untuk jadwal dan tanggal tersebut", nil)
		return
	}

	abs := models.Absensi{
		JadwalID:   req.JadwalID,
		SiswaID:    req.SiswaID,
		Tanggal:    tanggal,
		Status:     req.Status,
		Keterangan: req.Keterangan,
	}
	config.DB.Create(&abs)
	config.DB.Preload("Siswa").Preload("Jadwal").First(&abs, abs.ID)

	utils.ResponseCreated(c, "Absensi berhasil diinput", abs)
}

// BulkInputAbsensi godoc
// @Summary Input absensi satu kelas sekaligus (batch)
// @Tags Absensi
// @Security BearerAuth
// @Router /absensi/bulk [post]
func BulkInputAbsensi(c *gin.Context) {
	var req BulkAbsensiRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	tanggal, err := time.Parse("2006-01-02", req.Tanggal)
	if err != nil {
		utils.ResponseBadRequest(c, "Format tanggal salah", nil)
		return
	}

	var jadwal models.Jadwal
	if err := config.DB.Preload("Kelas").First(&jadwal, req.JadwalID).Error; err != nil {
		utils.ResponseBadRequest(c, "Jadwal tidak ditemukan", nil)
		return
	}

	type HasilItem struct {
		SiswaID  uint   `json:"siswa_id"`
		Berhasil bool   `json:"berhasil"`
		Pesan    string `json:"pesan"`
	}

	var results []HasilItem
	berhasil := 0

	for _, item := range req.Absensi {
		res := HasilItem{SiswaID: item.SiswaID}

		// Cek siswa ada
		var siswa models.Siswa
		if err := config.DB.First(&siswa, item.SiswaID).Error; err != nil {
			res.Berhasil = false
			res.Pesan = "Siswa tidak ditemukan"
			results = append(results, res)
			continue
		}

		// Cek duplikasi
		var existing models.Absensi
		err := config.DB.Where("jadwal_id = ? AND siswa_id = ? AND DATE(tanggal) = ?",
			req.JadwalID, item.SiswaID, req.Tanggal).First(&existing).Error
		if err == nil {
			res.Berhasil = false
			res.Pesan = "Sudah diinput sebelumnya"
			results = append(results, res)
			continue
		}

		abs := models.Absensi{
			JadwalID:   req.JadwalID,
			SiswaID:    item.SiswaID,
			Tanggal:    tanggal,
			Status:     item.Status,
			Keterangan: item.Keterangan,
		}
		if err := config.DB.Create(&abs).Error; err != nil {
			res.Berhasil = false
			res.Pesan = "Gagal menyimpan"
		} else {
			res.Berhasil = true
			res.Pesan = "Berhasil"
			berhasil++
		}
		results = append(results, res)
	}

	statusCode := 201
	if berhasil < len(req.Absensi) {
		statusCode = 207
	}

	c.JSON(statusCode, utils.APIResponse{
		Success: berhasil > 0,
		Message: "Proses batch selesai: " + strconv.Itoa(berhasil) + "/" + strconv.Itoa(len(req.Absensi)) + " absensi berhasil",
		Data:    results,
	})
}

// UpdateAbsensi godoc
// @Summary Update status absensi
// @Tags Absensi
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /absensi/{id} [put]
func UpdateAbsensi(c *gin.Context) {
	var abs models.Absensi
	if err := config.DB.First(&abs, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Data absensi tidak ditemukan")
		return
	}

	var req struct {
		Status     string `json:"status" binding:"omitempty,oneof=hadir izin sakit alfa"`
		Keterangan string `json:"keterangan"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseBadRequest(c, "Validasi gagal", err.Error())
		return
	}

	if req.Status != "" {
		abs.Status = req.Status
	}
	abs.Keterangan = req.Keterangan

	config.DB.Save(&abs)
	config.DB.Preload("Siswa").Preload("Jadwal").First(&abs, abs.ID)
	utils.ResponseOK(c, "Absensi berhasil diupdate", abs)
}

// DeleteAbsensi godoc
// @Summary Hapus data absensi
// @Tags Absensi
// @Security BearerAuth
// @Param id path int true "ID"
// @Router /absensi/{id} [delete]
func DeleteAbsensi(c *gin.Context) {
	var abs models.Absensi
	if err := config.DB.First(&abs, c.Param("id")).Error; err != nil {
		utils.ResponseNotFound(c, "Data absensi tidak ditemukan")
		return
	}
	config.DB.Delete(&abs)
	utils.ResponseOK(c, "Absensi berhasil dihapus", nil)
}

// ── Rekap ─────────────────────────────────────────────────────

// GetRekapAbsensiSiswa godoc
// @Summary Rekap absensi seorang siswa (per semester atau custom range)
// @Tags Absensi
// @Security BearerAuth
// @Param siswa_id path int true "Siswa ID"
// @Param semester_id query int false "Filter semester"
// @Param dari query string false "Tanggal mulai YYYY-MM-DD"
// @Param sampai query string false "Tanggal akhir YYYY-MM-DD"
// @Router /absensi/rekap/siswa/{siswa_id} [get]
func GetRekapAbsensiSiswa(c *gin.Context) {
	siswaID := c.Param("siswa_id")

	var siswa models.Siswa
	if err := config.DB.Preload("Kelas.Jurusan").First(&siswa, siswaID).Error; err != nil {
		utils.ResponseNotFound(c, "Siswa tidak ditemukan")
		return
	}

	query := config.DB.Model(&models.Absensi{}).Where("siswa_id = ?", siswaID)

	// Filter semester (via jadwal)
	if semesterID := c.Query("semester_id"); semesterID != "" {
		query = query.Joins("JOIN jadwals ON jadwals.id = absensis.jadwal_id").
			Where("jadwals.semester_id = ?", semesterID)
	}

	// Filter tanggal range
	if dari := c.Query("dari"); dari != "" {
		query = query.Where("tanggal >= ?", dari)
	}
	if sampai := c.Query("sampai"); sampai != "" {
		query = query.Where("tanggal <= ?", sampai)
	}

	type RekapStatus struct {
		Status string `json:"status"`
		Jumlah int64  `json:"jumlah"`
	}

	var rekap []RekapStatus
	config.DB.Model(&models.Absensi{}).
		Select("status, COUNT(*) as jumlah").
		Where(query.Statement.SQL.String(), query.Statement.Vars...).
		Group("status").
		Scan(&rekap)

	total := int64(0)
	counts := map[string]int64{"hadir": 0, "izin": 0, "sakit": 0, "alfa": 0}
	for _, r := range rekap {
		counts[r.Status] = r.Jumlah
		total += r.Jumlah
	}

	// Hitung persentase kehadiran
	persentaseHadir := float64(0)
	if total > 0 {
		persentaseHadir = (float64(counts["hadir"]) / float64(total)) * 100
	}

	utils.ResponseOK(c, "Rekap absensi siswa", gin.H{
		"siswa":            siswa,
		"total_pertemuan":  total,
		"hadir":            counts["hadir"],
		"izin":             counts["izin"],
		"sakit":            counts["sakit"],
		"alfa":             counts["alfa"],
		"persentase_hadir": persentaseHadir,
		"detail_rekap":     rekap,
	})
}

// GetRekapAbsensiKelas godoc
// @Summary Rekap absensi satu kelas (rangkuman persentase per siswa)
// @Tags Absensi
// @Security BearerAuth
// @Param kelas_id path int true "Kelas ID"
// @Param semester_id query int true "Semester ID"
// @Router /absensi/rekap/kelas/{kelas_id} [get]
func GetRekapAbsensiKelas(c *gin.Context) {
	kelasID := c.Param("kelas_id")
	semesterID := c.Query("semester_id")

	if semesterID == "" {
		utils.ResponseBadRequest(c, "Parameter semester_id wajib diisi", nil)
		return
	}

	var kelas models.Kelas
	if err := config.DB.Preload("Jurusan").First(&kelas, kelasID).Error; err != nil {
		utils.ResponseNotFound(c, "Kelas tidak ditemukan")
		return
	}

	// Ambil semua siswa di kelas
	var siswaList []models.Siswa
	config.DB.Where("kelas_id = ?", kelasID).Find(&siswaList)

	type RekapSiswa struct {
		SiswaID         uint    `json:"siswa_id"`
		Nama            string  `json:"nama"`
		TotalPertemuan  int64   `json:"total_pertemuan"`
		Hadir           int64   `json:"hadir"`
		Izin            int64   `json:"izin"`
		Sakit           int64   `json:"sakit"`
		Alfa            int64   `json:"alfa"`
		PersentaseHadir float64 `json:"persentase_hadir"`
	}

	var rekapList []RekapSiswa
	for _, s := range siswaList {
		var absensiList []models.Absensi
		config.DB.Joins("JOIN jadwals ON jadwals.id = absensis.jadwal_id").
			Where("absensis.siswa_id = ? AND jadwals.semester_id = ?", s.ID, semesterID).
			Find(&absensiList)

		counts := map[string]int64{"hadir": 0, "izin": 0, "sakit": 0, "alfa": 0}
		for _, a := range absensiList {
			counts[a.Status]++
		}
		total := int64(len(absensiList))
		persen := float64(0)
		if total > 0 {
			persen = (float64(counts["hadir"]) / float64(total)) * 100
		}

		rekapList = append(rekapList, RekapSiswa{
			SiswaID:         s.ID,
			Nama:            s.Nama,
			TotalPertemuan:  total,
			Hadir:           counts["hadir"],
			Izin:            counts["izin"],
			Sakit:           counts["sakit"],
			Alfa:            counts["alfa"],
			PersentaseHadir: persen,
		})
	}

	utils.ResponseOK(c, "Rekap absensi kelas "+kelas.Nama, gin.H{
		"kelas":       kelas,
		"total_siswa": len(siswaList),
		"rekap":       rekapList,
	})
}

// GetAbsensiSaya godoc
// @Summary Rekap absensi untuk siswa/orang tua yang sedang login
// @Tags Absensi
// @Security BearerAuth
// @Param semester_id query int true "Semester ID"
// @Router /absensi/saya [get]
func GetAbsensiSaya(c *gin.Context) {
	claims := middlewares.GetCurrentUser(c)
	semesterID := c.Query("semester_id")

	if semesterID == "" {
		utils.ResponseBadRequest(c, "Parameter semester_id wajib diisi", nil)
		return
	}

	switch claims.Role {
	case models.RoleSiswa:
		var siswa models.Siswa
		if err := config.DB.Where("user_id = ?", claims.UserID).First(&siswa).Error; err != nil {
			utils.ResponseNotFound(c, "Data siswa tidak ditemukan")
			return
		}
		c.Params = append(c.Params, gin.Param{Key: "siswa_id", Value: strconv.Itoa(int(siswa.ID))})
		GetRekapAbsensiSiswa(c)

	case models.RoleOrangTua:
		var ot models.OrangTua
		if err := config.DB.Where("user_id = ?", claims.UserID).First(&ot).Error; err != nil {
			utils.ResponseNotFound(c, "Data orang tua tidak ditemukan")
			return
		}
		// Ambil anak pertama (simplifikasi — production bisa pilih anak mana)
		var link models.OrangTuaSiswa
		if err := config.DB.Preload("Siswa").Where("orang_tua_id = ?", ot.ID).First(&link).Error; err != nil {
			utils.ResponseBadRequest(c, "Belum ada data anak terdaftar", nil)
			return
		}
		c.Params = append(c.Params, gin.Param{Key: "siswa_id", Value: strconv.Itoa(int(link.SiswaID))})
		GetRekapAbsensiSiswa(c)

	default:
		utils.ResponseForbidden(c, "Role ini tidak memiliki absensi personal")
	}
}