package routes

import (
	"github.com/gin-gonic/gin"
	"sim-sekolah/app/controllers"
	"sim-sekolah/app/middlewares"
	"sim-sekolah/app/models"
)

func RegisterRoutes(r *gin.Engine) {
	// ── Global Middleware ────────────────────────────────────────
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(corsMiddleware())

	api := r.Group("/api/v1")

	// ── Health Check ─────────────────────────────────────────────
	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "SIM Sekolah"})
	})

	// ── Auth (public) ────────────────────────────────────────────
	auth := api.Group("/auth")
	{
		auth.POST("/login", controllers.Login)
	}

	// ── Protected Routes ─────────────────────────────────────────
	protected := api.Group("")
	protected.Use(middlewares.AuthMiddleware())
	{
		// Auth
		protected.GET("/auth/me", controllers.Me)
		protected.PUT("/auth/change-password", controllers.ChangePassword)

		// ── Roles (admin only) ────────────────────────────────────
		roles := protected.Group("/roles")
		roles.Use(middlewares.RoleMiddleware(models.RoleAdmin))
		{
			roles.GET("", controllers.GetRoles)
			roles.GET("/:id", controllers.GetRoleByID)
			roles.POST("", controllers.CreateRole)
			roles.PUT("/:id", controllers.UpdateRole)
			roles.DELETE("/:id", controllers.DeleteRole)
		}

		// ── Users (admin only) ────────────────────────────────────
		users := protected.Group("/users")
		users.Use(middlewares.RoleMiddleware(models.RoleAdmin))
		{
			users.GET("", controllers.GetUsers)
			users.GET("/:id", controllers.GetUserByID)
			users.POST("",
				middlewares.ActivityLogger("CREATE", "user"),
				controllers.CreateUser,
			)
			users.PUT("/:id",
				middlewares.ActivityLogger("UPDATE", "user"),
				controllers.UpdateUser,
			)
			users.DELETE("/:id",
				middlewares.ActivityLogger("DELETE", "user"),
				controllers.DeleteUser,
			)
		}

		// ── Tahun Ajaran (admin) ─────────────────────────────────
		ta := protected.Group("/tahun-ajaran")
		ta.Use(middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleWaliKelas, models.RoleGuru))
		{
			ta.GET("", controllers.GetTahunAjaran)
			ta.GET("/:id", controllers.GetTahunAjaranByID)
			ta.POST("", controllers.CreateTahunAjaran)
			ta.PUT("/:id", controllers.UpdateTahunAjaran)
			ta.DELETE("/:id", controllers.DeleteTahunAjaran)
		}

		// ── Semester (admin) ──────────────────────────────────────
		sem := protected.Group("/semester")
		sem.Use(middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleWaliKelas, models.RoleGuru))
		{
			sem.GET("", controllers.GetSemester)
			sem.GET("/aktif", controllers.GetSemesterAktif)
			sem.POST("", controllers.CreateSemester)
			sem.PUT("/:id", controllers.UpdateSemester)
			sem.DELETE("/:id", controllers.DeleteSemester)
		}

		// ── Jurusan (admin) ───────────────────────────────────────
		jur := protected.Group("/jurusan")
		jur.Use(middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleWaliKelas, models.RoleGuru))
		{
			jur.GET("", controllers.GetJurusan)
			jur.GET("/:id", controllers.GetJurusanByID)
			jur.POST("", controllers.CreateJurusan)
			jur.PUT("/:id", controllers.UpdateJurusan)
			jur.DELETE("/:id", controllers.DeleteJurusan)
		}

		// ── Mata Pelajaran (admin) ────────────────────────────────
		mp := protected.Group("/mata-pelajaran")
		mp.Use(middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleWaliKelas, models.RoleGuru))
		{
			mp.GET("", controllers.GetMataPelajaran)
			mp.GET("/:id", controllers.GetMataPelajaranByID)
			mp.POST("", controllers.CreateMataPelajaran)
			mp.PUT("/:id", controllers.UpdateMataPelajaran)
			mp.DELETE("/:id", controllers.DeleteMataPelajaran)
		}

		// ── Guru (admin) ──────────────────────────────────────────
		guru := protected.Group("/guru")
		guru.Use(middlewares.RoleMiddleware(models.RoleAdmin, models.RoleGuru, models.RoleWaliKelas, models.RoleKepalaSekolah))
		{
			guru.GET("", controllers.GetGuru)
			guru.GET("/:id", controllers.GetGuruByID)
			guru.POST("",
				middlewares.ActivityLogger("CREATE", "guru"),
				controllers.CreateGuru,
			)
			guru.PUT("/:id",
				middlewares.ActivityLogger("UPDATE", "guru"),
				controllers.UpdateGuru,
			)
			guru.DELETE("/:id",
				middlewares.ActivityLogger("DELETE", "guru"),
				controllers.DeleteGuru,
			)
		}

		// ── Kelas ────────────────────────────────
		kelas := protected.Group("/kelas")
		{
			kelas.GET("",
				middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleWaliKelas, models.RoleGuru),
				controllers.GetKelas,
			)
			kelas.GET("/summary",
				middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah),
				controllers.GetKelasWithJumlahSiswa,
			)
			kelas.GET("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleWaliKelas, models.RoleGuru),
				controllers.GetKelasByID,
			)
			kelas.GET("/:id/siswa",
				middlewares.RoleMiddleware(models.RoleAdmin, models.RoleWaliKelas, models.RoleGuru),
				controllers.GetSiswaByKelas,
			)
			kelas.POST("",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("CREATE", "kelas"),
				controllers.CreateKelas,
			)
			kelas.PUT("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("UPDATE", "kelas"),
				controllers.UpdateKelas,
			)
			kelas.DELETE("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("DELETE", "kelas"),
				controllers.DeleteKelas,
			)
		}

		// ── Siswa ─────────────────────────────────────────────────
		siswRoute := protected.Group("/siswa")
		{
			siswRoute.GET("",
				middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleWaliKelas, models.RoleGuru),
				controllers.GetSiswa,
			)
			siswRoute.GET("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleWaliKelas, models.RoleGuru, models.RoleSiswa),
				controllers.GetSiswaByID,
			)
			siswRoute.POST("",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("CREATE", "siswa"),
				controllers.CreateSiswa,
			)
			siswRoute.PUT("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("UPDATE", "siswa"),
				controllers.UpdateSiswa,
			)
			siswRoute.PATCH("/:id/pindah-kelas",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("PINDAH_KELAS", "siswa"),
				controllers.PindahKelas,
			)
			siswRoute.DELETE("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("DELETE", "siswa"),
				controllers.DeleteSiswa,
			)
			siswRoute.POST("/:id/orang-tua",
				middlewares.RoleMiddleware(models.RoleAdmin),
				controllers.LinkOrangTuaSiswa,
			)
		}

		// ── Orang Tua ─────────────────────────────────────────────
		otRoute := protected.Group("/orang-tua")
		{
			otRoute.GET("",
				middlewares.RoleMiddleware(models.RoleAdmin),
				controllers.GetOrangTua,
			)
			otRoute.GET("/anak-saya",
				middlewares.RoleMiddleware(models.RoleOrangTua),
				controllers.GetAnakByOrangTua,
			)
			otRoute.GET("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin),
				controllers.GetOrangTuaByID,
			)
			otRoute.POST("",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("CREATE", "orang_tua"),
				controllers.CreateOrangTua,
			)
			otRoute.PUT("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("UPDATE", "orang_tua"),
				controllers.UpdateOrangTua,
			)
			otRoute.DELETE("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("DELETE", "orang_tua"),
				controllers.DeleteOrangTua,
			)
		}

		// ── Jadwal ──────────────────────────────────────
		jadwal := protected.Group("/jadwal")
		{
			jadwal.GET("",
				middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas, models.RoleSiswa),
				controllers.GetJadwal,
			)
			jadwal.GET("/saya",
				middlewares.RoleMiddleware(models.RoleGuru, models.RoleWaliKelas, models.RoleSiswa),
				controllers.GetJadwalSaya,
			)
			jadwal.GET("/kelas/:kelas_id",
				middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas, models.RoleSiswa),
				controllers.GetJadwalKelas,
			)
			jadwal.GET("/guru/:guru_id",
				middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas),
				controllers.GetJadwalGuru,
			)
			jadwal.GET("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas, models.RoleSiswa),
				controllers.GetJadwalByID,
			)
			jadwal.POST("/validasi",
				middlewares.RoleMiddleware(models.RoleAdmin),
				controllers.ValidasiJadwal,
			)
			jadwal.POST("",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("CREATE", "jadwal"),
				controllers.CreateJadwal,
			)
			jadwal.POST("/bulk",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("BULK_CREATE", "jadwal"),
				controllers.BulkCreateJadwal,
			)
			jadwal.PUT("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("UPDATE", "jadwal"),
				controllers.UpdateJadwal,
			)
			jadwal.DELETE("/:id",
				middlewares.RoleMiddleware(models.RoleAdmin),
				middlewares.ActivityLogger("DELETE", "jadwal"),
				controllers.DeleteJadwal,
			)
		}

		// ── Absensi  ────────────────────────────────
		absensi := protected.Group("/absensi")
		{
			absensi.GET("",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas),
			controllers.GetAbsensi,
			)
			absensi.GET("/saya",
			middlewares.RoleMiddleware(models.RoleSiswa, models.RoleOrangTua),
			controllers.GetAbsensiSaya,
			)
			absensi.GET("/rekap/siswa/:siswa_id",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas, models.RoleSiswa, models.RoleOrangTua),
			controllers.GetRekapAbsensiSiswa,
			)
			absensi.GET("/rekap/kelas/:kelas_id",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas),
			controllers.GetRekapAbsensiKelas,
			)
			absensi.GET("/:id",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleGuru, models.RoleWaliKelas),
			controllers.GetAbsensiByID,
			)
			absensi.POST("",
			middlewares.RoleMiddleware(models.RoleGuru, models.RoleWaliKelas),
			middlewares.ActivityLogger("CREATE", "absensi"),
			controllers.InputAbsensi,
			)
			absensi.POST("/bulk",
			middlewares.RoleMiddleware(models.RoleGuru, models.RoleWaliKelas),
			middlewares.ActivityLogger("BULK_CREATE", "absensi"),
			controllers.BulkInputAbsensi,
			)
			absensi.PUT("/:id",
			middlewares.RoleMiddleware(models.RoleGuru, models.RoleWaliKelas),
			middlewares.ActivityLogger("UPDATE", "absensi"),
			controllers.UpdateAbsensi,
			)
			absensi.DELETE("/:id",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleGuru, models.RoleWaliKelas),
			middlewares.ActivityLogger("DELETE", "absensi"),
			controllers.DeleteAbsensi,
			)
		}

		// ── Nilai ────────────────────────────────────────
		nilai := protected.Group("/nilai")
		{
			nilai.GET("",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas),
			controllers.GetNilai,
			)
			nilai.GET("/siswa/:siswa_id",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas, models.RoleSiswa, models.RoleOrangTua),
			controllers.GetNilaiSiswa,
			)
			nilai.GET("/saya",
			middlewares.RoleMiddleware(models.RoleSiswa),
			controllers.GetNilaiSaya,
			)
			nilai.GET("/:id",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleGuru, models.RoleWaliKelas),
			controllers.GetNilaiByID,
			)
			nilai.POST("",
			middlewares.RoleMiddleware(models.RoleGuru, models.RoleWaliKelas),
			middlewares.ActivityLogger("CREATE", "nilai"),
			controllers.InputNilai,
			)
			nilai.PUT("/:id",
			middlewares.RoleMiddleware(models.RoleGuru, models.RoleWaliKelas),
			middlewares.ActivityLogger("UPDATE", "nilai"),
			controllers.UpdateNilai,
			)
			nilai.DELETE("/:id",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleGuru, models.RoleWaliKelas),
			middlewares.ActivityLogger("DELETE", "nilai"),
			controllers.DeleteNilai,
			)
		}

		// ── Rapor ────────────────────────────────────────
		rapor := protected.Group("/rapor")
		{
			rapor.GET("",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas),
			controllers.GetRapor,
			)
			rapor.GET("/saya",
			middlewares.RoleMiddleware(models.RoleSiswa, models.RoleOrangTua),
			controllers.GetRaporSaya,
			)
			rapor.GET("/:id",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas, models.RoleSiswa, models.RoleOrangTua),
			controllers.GetRaporByID,
			)
			rapor.GET("/:id/download",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleKepalaSekolah, models.RoleGuru, models.RoleWaliKelas, models.RoleSiswa, models.RoleOrangTua),
			controllers.DownloadRapor,
			)
			rapor.POST("/generate",
			middlewares.RoleMiddleware(models.RoleAdmin, models.RoleWaliKelas),
			middlewares.ActivityLogger("GENERATE", "rapor"),
			controllers.GenerateRapor,
			)
			rapor.DELETE("/:id",
			middlewares.RoleMiddleware(models.RoleAdmin),
			middlewares.ActivityLogger("DELETE", "rapor"),
			controllers.DeleteRapor,
			)
		}
	}
}

// corsMiddleware mengizinkan request dari frontend React
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Accept")
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}