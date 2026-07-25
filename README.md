# SIM Sekolah

Sistem Informasi Manajemen Sekolah — aplikasi berbasis web untuk mengelola data akademik sekolah, mulai dari siswa, guru, kelas, jadwal, absensi, penilaian, rapor, hingga **e-learning**.

## Teknologi

| Layer    | Teknologi                                                    |
| -------- | ------------------------------------------------------------ |
| Backend  | Go 1.23, Gin, GORM, PostgreSQL, JWT                          |
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Chart.js, jsPDF, xlsx |

## Role Pengguna

| Role             | Deskripsi                                                    |
| ---------------- | ------------------------------------------------------------ |
| Admin            | Akses penuh — manajemen user, master data, jadwal, laporan   |
| Kepala Sekolah   | Read-only — monitoring dashboard, laporan, analitik          |
| Guru             | Input absensi & nilai, kelola e-learning; bisa ditugaskan sebagai wali kelas |
| Wali Kelas       | Sama dengan guru + monitoring kelas bimbingan + generate rapor |
| Siswa            | Lihat jadwal, nilai, rapor; akses e-learning (materi, quiz, tugas) |
| Orang Tua        | Monitoring nilai, jadwal, absensi, dan rapor anak            |

> **Catatan:** Guru dan Wali Kelas sekarang disatukan. Guru yang ditugaskan sebagai wali kelas otomatis mendapat akses monitoring & generate rapor — tidak perlu ganti role.

## Menjalankan Aplikasi

### Prasyarat

- Go 1.23+
- Node.js 18+
- PostgreSQL

### Backend

```bash
cd backend

# Salin dan sesuaikan environment variable
cp .env.example .env

# Jalankan server development
make run

# Hot reload (butuh air)
make dev

# Seed data — urutkan:
make seed           # Role + admin (admin@simsekolah.sch.id / Admin@12345)
make seed-akademik  # Mapel + guru + kelas
make seed-siswa     # 12 siswa dummy
```

Server berjalan di `http://localhost:8080`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend berjalan di `http://localhost:3000` dan mem-proxy request API ke backend.

### Login Default

| Role        | Email                          | Password     |
| ----------- | ------------------------------ | ------------ |
| Admin       | admin@simsekolah.sch.id        | Admin@12345  |
| Wali Kelas  | mhmmd.ichsan321@gmail.com      | Ichsan@123   |
| Guru        | budi.santoso@sekolah.sch.id    | Guru@123     |
| Guru        | siti.nuraini@sekolah.sch.id    | Guru@123     |
| Siswa       | andi@siswa.sch.id              | Siswa@123    |

## Fitur

### Data Master (Admin)
- Tahun Ajaran, Semester, Jurusan, Mata Pelajaran
- Manajemen User (dengan pagination)
- Manajemen Guru, Siswa, Orang Tua (bisa buat akun baru atau tautkan ke user yang sudah ada)
- Manajemen Kelas (assign wali kelas → role otomatis berubah)
- Jadwal Pelajaran

### Akademik (Guru / Wali Kelas)
- **Absensi** — input per jadwal, bulk input per kelas
- **Nilai** — input nilai harian, UTS, UAS → nilai akhir + predikat otomatis
- **Rapor** — generate rapor per siswa + download PDF
- **Monitoring Kelas** — rekap absensi dengan persentase kehadiran, export PDF

### E-Learning (Guru + Siswa)
- **Guru** membuat pertemuan per mata pelajaran (1–18 per semester)
- **Kehadiran** — catat status hadir/izin/sakit/alfa per pertemuan
- **Materi** — upload video, dokumen, atau link pembelajaran
- **Quiz** — buat soal pilihan ganda, koreksi otomatis, lihat rekap nilai
- **Tugas** — buat tugas pengumpulan, siswa upload file, guru beri nilai
- **Siswa** — lihat materi, kerjakan quiz, upload tugas

### Monitoring (Siswa / Orang Tua)
- Siswa: lihat jadwal, nilai sendiri, rapor, e-learning
- Orang Tua: dashboard anak, nilai anak, jadwal anak, rapor anak

## Struktur Proyek

```
meurunoe/
├── backend/
│   ├── server/main.go              # Entry point
│   ├── config/                     # Database, environment, AutoMigrate
│   ├── app/
│   │   ├── controllers/            # HTTP handlers (auth, guru, siswa, kelas, elearning, dll.)
│   │   ├── middlewares/            # Auth (JWT), RBAC (Role), ActivityLogger
│   │   ├── models/                 # GORM models (user, akademik, elearning, notifications)
│   │   ├── routes/                 # Definisi route API
│   │   └── services/               # Business logic (jadwal)
│   ├── migrations/seeder/          # Seeder: main (role+admin), siswa, akademik
│   └── utils/                      # JWT, response helpers
└── frontend/
    └── src/
        ├── components/             # Layout (Sidebar, Header), Common (Modal, Alert)
        ├── context/                # AuthContext (login, logout, updateUser)
        ├── pages/                  # Halaman: Users, Siswa, Guru, Kelas, Jadwal, Absensi,
        │                           #   Nilai, Rapor, Elearning, OrangTua, Profile, dll.
        ├── routes/                 # PrivateRoute wrapper
        ├── services/               # API service modules (per domain)
        └── utils/                  # Axios instance, PDF/Excel export
```
