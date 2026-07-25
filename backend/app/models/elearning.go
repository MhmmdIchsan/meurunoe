package models

import "time"

// ── Pertemuan ──────────────────────────────────────────────────

type Pertemuan struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	JadwalID        uint      `gorm:"not null;index" json:"jadwal_id"`
	PertemuanKe     int       `gorm:"not null" json:"pertemuan_ke"`
	Tanggal         time.Time `gorm:"not null;type:date" json:"tanggal"`
	Topik           string    `gorm:"type:varchar(255)" json:"topik"`
	Deskripsi       string    `gorm:"type:text" json:"deskripsi"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`

	Jadwal    Jadwal       `gorm:"foreignKey:JadwalID" json:"jadwal,omitempty"`
	Kehadiran []Kehadiran   `gorm:"foreignKey:PertemuanID" json:"kehadiran,omitempty"`
	Materi    []Materi      `gorm:"foreignKey:PertemuanID" json:"materi,omitempty"`
}

// ── Kehadiran per Pertemuan ────────────────────────────────────

type Kehadiran struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	PertemuanID  uint      `gorm:"not null;index" json:"pertemuan_id"`
	SiswaID      uint      `gorm:"not null;index" json:"siswa_id"`
	Status       string    `gorm:"type:varchar(10);not null;default:'hadir'" json:"status"` // hadir/izin/sakit/alfa
	Keterangan   string    `gorm:"type:varchar(255)" json:"keterangan"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Pertemuan Pertemuan `gorm:"foreignKey:PertemuanID" json:"-"`
	Siswa     Siswa     `gorm:"foreignKey:SiswaID" json:"siswa,omitempty"`
}

// ── Materi ─────────────────────────────────────────────────────

type Materi struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	PertemuanID  uint      `gorm:"not null;index" json:"pertemuan_id"`
	Judul        string    `gorm:"type:varchar(255);not null" json:"judul"`
	Tipe         string    `gorm:"type:varchar(20);not null;default:'dokumen'" json:"tipe"` // video/dokumen/link
	FilePath     string    `gorm:"type:varchar(500)" json:"file_path,omitempty"`
	URL          string    `gorm:"type:varchar(500)" json:"url,omitempty"`
	Deskripsi    string    `gorm:"type:text" json:"deskripsi"`
	CreatedAt    time.Time `json:"created_at"`

	Pertemuan Pertemuan `gorm:"foreignKey:PertemuanID" json:"-"`
}

// ── Quiz ───────────────────────────────────────────────────────

type Quiz struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	PertemuanID  uint      `gorm:"not null;index" json:"pertemuan_id"`
	Judul        string    `gorm:"type:varchar(255);not null" json:"judul"`
	Deskripsi    string    `gorm:"type:text" json:"deskripsi"`
	Deadline     time.Time `json:"deadline"`
	DurasiMenit  int       `gorm:"default:30" json:"durasi_menit"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Pertemuan Pertemuan `gorm:"foreignKey:PertemuanID" json:"-"`
	Soal      []QuizSoal `gorm:"foreignKey:QuizID" json:"soal,omitempty"`
}

type QuizSoal struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	QuizID       uint      `gorm:"not null;index" json:"quiz_id"`
	Nomor        int       `gorm:"not null" json:"nomor"`
	Pertanyaan   string    `gorm:"type:text;not null" json:"pertanyaan"`
	PilihanA     string    `gorm:"type:varchar(255)" json:"pilihan_a"`
	PilihanB     string    `gorm:"type:varchar(255)" json:"pilihan_b"`
	PilihanC     string    `gorm:"type:varchar(255)" json:"pilihan_c"`
	PilihanD     string    `gorm:"type:varchar(255)" json:"pilihan_d"`
	JawabanBenar string    `gorm:"type:varchar(5);not null" json:"jawaban_benar"` // a/b/c/d
	Bobot        float64   `gorm:"default:10" json:"bobot"`
	CreatedAt    time.Time `json:"created_at"`

	Quiz Quiz `gorm:"foreignKey:QuizID" json:"-"`
}

type QuizJawaban struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	QuizID      uint      `gorm:"not null;index" json:"quiz_id"`
	SiswaID     uint      `gorm:"not null;index" json:"siswa_id"`
	Jawaban     string    `gorm:"type:text;not null" json:"jawaban"` // JSON: {"1":"a","2":"b",...}
	Nilai       float64   `json:"nilai"`
	SelesaiPada *time.Time `json:"selesai_pada"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Quiz  Quiz  `gorm:"foreignKey:QuizID" json:"quiz,omitempty"`
	Siswa Siswa `gorm:"foreignKey:SiswaID" json:"siswa,omitempty"`
}

// ── Tugas / Pengumpulan ──────────────────────────────────────

type Tugas struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	PertemuanID  uint      `gorm:"not null;index" json:"pertemuan_id"`
	Judul        string    `gorm:"type:varchar(255);not null" json:"judul"`
	Deskripsi    string    `gorm:"type:text" json:"deskripsi"`
	Deadline     time.Time `json:"deadline"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Pertemuan   Pertemuan     `gorm:"foreignKey:PertemuanID" json:"-"`
	Pengumpulan []Pengumpulan `gorm:"foreignKey:TugasID" json:"pengumpulan,omitempty"`
}

type Pengumpulan struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TugasID      uint      `gorm:"not null;index" json:"tugas_id"`
	SiswaID      uint      `gorm:"not null;index" json:"siswa_id"`
	FilePath     string    `gorm:"type:varchar(500)" json:"file_path"` // path file upload
	Catatan      string    `gorm:"type:text" json:"catatan"`
	Nilai        *float64  `json:"nilai"`
	DikumpulkanPada time.Time `json:"dikumpulkan_pada"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Tugas Tugas `gorm:"foreignKey:TugasID" json:"-"`
	Siswa Siswa `gorm:"foreignKey:SiswaID" json:"siswa,omitempty"`
}
