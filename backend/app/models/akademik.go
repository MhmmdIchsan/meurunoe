package models

import (
	"time"
	"gorm.io/gorm"
)

// ── Akademik Dasar ─────────────────────────────────────────────

type TahunAjaran struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Nama      string    `gorm:"type:varchar(20);not null" json:"nama"` // contoh: "2024/2025"
	IsAktif   bool      `gorm:"default:false" json:"is_aktif"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Semester struct {
	ID           uint        `gorm:"primaryKey;autoIncrement" json:"id"`
	TahunAjaranID uint       `gorm:"not null;index" json:"tahun_ajaran_id"`
	Nama         string      `gorm:"type:varchar(20);not null" json:"nama"` // "Ganjil" / "Genap"
	IsAktif      bool        `gorm:"default:false" json:"is_aktif"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	TahunAjaran  TahunAjaran `gorm:"foreignKey:TahunAjaranID" json:"tahun_ajaran,omitempty"`
}

type Jurusan struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Kode      string    `gorm:"type:varchar(10);uniqueIndex;not null" json:"kode"`
	Nama      string    `gorm:"type:varchar(100);not null" json:"nama"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ── Guru & Siswa ───────────────────────────────────────────────

type Guru struct {
	ID        uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint           `gorm:"uniqueIndex;not null" json:"user_id"`
	NIP       string         `gorm:"type:varchar(30);uniqueIndex" json:"nip"`
	Nama      string         `gorm:"type:varchar(100);not null" json:"nama"`
	JenisKelamin string      `gorm:"type:varchar(10)" json:"jenis_kelamin"`
	Alamat    string         `gorm:"type:text" json:"alamat"`
	Telepon   string         `gorm:"type:varchar(20)" json:"telepon"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	User      User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type Kelas struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Nama         string    `gorm:"type:varchar(20);not null" json:"nama"` // contoh: "X RPL 1"
	Tingkat      string    `gorm:"type:varchar(5);not null" json:"tingkat"` // "X", "XI", "XII"
	JurusanID    uint      `gorm:"not null;index" json:"jurusan_id"`
	WaliKelasID  *uint     `gorm:"index" json:"wali_kelas_id"`
	TahunAjaranID uint     `gorm:"not null;index" json:"tahun_ajaran_id"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Jurusan      Jurusan   `gorm:"foreignKey:JurusanID" json:"jurusan,omitempty"`
	WaliKelas    *Guru     `gorm:"foreignKey:WaliKelasID" json:"wali_kelas,omitempty"`
	TahunAjaran  TahunAjaran `gorm:"foreignKey:TahunAjaranID" json:"tahun_ajaran,omitempty"`
}

type Siswa struct {
	ID           uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID       uint           `gorm:"uniqueIndex;not null" json:"user_id"`
	NISN         string         `gorm:"type:varchar(20);uniqueIndex;not null" json:"nisn"`
	NIS          string         `gorm:"type:varchar(20);uniqueIndex" json:"nis"`
	Nama         string         `gorm:"type:varchar(100);not null" json:"nama"`
	JenisKelamin string         `gorm:"type:varchar(10)" json:"jenis_kelamin"`
	TanggalLahir *time.Time     `json:"tanggal_lahir,omitempty"`
	Alamat       string         `gorm:"type:text" json:"alamat"`
	KelasID      *uint          `gorm:"index" json:"kelas_id"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	User         User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Kelas        *Kelas         `gorm:"foreignKey:KelasID" json:"kelas,omitempty"`
}

type OrangTua struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    UserID    uint      `gorm:"not null" json:"user_id"`
    Nama      string    `gorm:"not null" json:"nama"`
    Telepon   string    `json:"telepon"`
    Pekerjaan string    `json:"pekerjaan"`
    Alamat    string    `json:"alamat"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    
    // Relations
    User   User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
    Siswa  []Siswa `gorm:"many2many:orang_tua_siswa;" json:"siswa,omitempty"`
}

type OrangTuaSiswa struct {
    ID         uint      `gorm:"primaryKey" json:"id"`
    OrangTuaID uint      `gorm:"not null" json:"orang_tua_id"`
    SiswaID    uint      `gorm:"not null" json:"siswa_id"`
    Hubungan   string    `gorm:"type:enum('ayah','ibu','wali');default:'wali'" json:"hubungan"`
    CreatedAt  time.Time `json:"created_at"`
    UpdatedAt  time.Time `json:"updated_at"`
}

// ── Akademik Operasional ───────────────────────────────────────

type MataPelajaran struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Kode      string    `gorm:"type:varchar(20);uniqueIndex;not null" json:"kode"`
	Nama      string    `gorm:"type:varchar(100);not null" json:"nama"`
	KKM       float64   `gorm:"default:75" json:"kkm"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Jadwal struct {
	ID              uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	KelasID         uint          `gorm:"not null;index" json:"kelas_id"`
	GuruID          uint          `gorm:"not null;index" json:"guru_id"`
	MataPelajaranID uint          `gorm:"not null;index" json:"mata_pelajaran_id"`
	SemesterID      uint          `gorm:"not null;index" json:"semester_id"`
	HariKe          int           `gorm:"not null" json:"hari_ke"` // 1=Senin … 6=Sabtu
	JamMulai        string        `gorm:"type:varchar(5);not null" json:"jam_mulai"`  // "07:00"
	JamSelesai      string        `gorm:"type:varchar(5);not null" json:"jam_selesai"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
	Kelas           Kelas         `gorm:"foreignKey:KelasID" json:"kelas,omitempty"`
	Guru            Guru          `gorm:"foreignKey:GuruID" json:"guru,omitempty"`
	MataPelajaran   MataPelajaran `gorm:"foreignKey:MataPelajaranID" json:"mata_pelajaran,omitempty"`
	Semester        Semester      `gorm:"foreignKey:SemesterID" json:"semester,omitempty"`
}

type Absensi struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	SiswaID    uint      `gorm:"not null;index" json:"siswa_id"`
	JadwalID   uint      `gorm:"not null;index" json:"jadwal_id"`
	Tanggal    time.Time `gorm:"not null;index" json:"tanggal"`
	Status     string    `gorm:"type:varchar(10);not null" json:"status"` // hadir/izin/sakit/alfa
	Keterangan string    `gorm:"type:text" json:"keterangan"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	Siswa      Siswa     `gorm:"foreignKey:SiswaID" json:"siswa,omitempty"`
	Jadwal     Jadwal    `gorm:"foreignKey:JadwalID" json:"jadwal,omitempty"`
}

type Nilai struct {
	ID              uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	SiswaID         uint          `gorm:"not null;index" json:"siswa_id"`
	MataPelajaranID uint          `gorm:"not null;index" json:"mata_pelajaran_id"`
	SemesterID      uint          `gorm:"not null;index" json:"semester_id"`
	NilaiHarian     float64       `json:"nilai_harian"`
	NilaiUTS        float64       `json:"nilai_uts"`
	NilaiUAS        float64       `json:"nilai_uas"`
	NilaiAkhir      float64       `json:"nilai_akhir"` // dihitung otomatis
	Predikat        string        `gorm:"type:varchar(5)" json:"predikat"` // A/B/C/D
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
	Siswa           Siswa         `gorm:"foreignKey:SiswaID" json:"siswa,omitempty"`
	MataPelajaran   MataPelajaran `gorm:"foreignKey:MataPelajaranID" json:"mata_pelajaran,omitempty"`
	Semester        Semester      `gorm:"foreignKey:SemesterID" json:"semester,omitempty"`
}

type Rapor struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	SiswaID    uint      `gorm:"not null;index" json:"siswa_id"`
	SemesterID uint      `gorm:"not null;index" json:"semester_id"`
	FilePath   string    `gorm:"type:varchar(255)" json:"file_path"`
	Status     string    `gorm:"type:varchar(20);default:'draft'" json:"status"` // draft/published
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	Siswa      Siswa     `gorm:"foreignKey:SiswaID" json:"siswa,omitempty"`
	Semester   Semester  `gorm:"foreignKey:SemesterID" json:"semester,omitempty"`
}