import { useState, useEffect } from 'react';
import { kelasService } from '../../services/kelasService';
import { absensiService } from '../../services/absensiService';
import { semesterService } from '../../services/semesterService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { Link } from 'react-router-dom';

import { exportAbsensiToPDF } from '../../utils/pdfExport';

export default function MonitoringKelas() {
  const { user } = useAuth();
  const [kelas, setKelas]             = useState(null);
  const [siswa, setSiswa]             = useState([]);
  const [semester, setSemester]       = useState(null);
  const [rekapAbsensi, setRekapAbsensi] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('overview');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Ambil semester aktif
      const semRes = await semesterService.getAktif();
      const activeSem = semRes.data;
      setSemester(activeSem);

      // 2. Ambil semua kelas
      const kelasRes = await kelasService.getAll();
      const allKelas = Array.isArray(kelasRes.data) ? kelasRes.data : (kelasRes.data?.data || []);
      
      // 3. Cari kelas yang wali_kelas.user_id === current user
      const myKelas = allKelas.find(k => k.wali_kelas?.user_id === user.id);
      
      if (!myKelas) {
        setLoading(false);
        return;
      }
      setKelas(myKelas);

      // 4. Ambil siswa di kelas
      const siswaRes = await kelasService.getSiswaByKelas(myKelas.id);
      const rawSiswa = siswaRes.data;
      setSiswa(Array.isArray(rawSiswa) ? rawSiswa : (rawSiswa?.siswa || []));

      // 5. Ambil rekap absensi kelas
      if (activeSem) {
        const rekapRes = await absensiService.getRekapKelas(myKelas.id, {
          semester_id: activeSem.id,
        });
        setRekapAbsensi(rekapRes.data?.rekap || []);
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  if (!kelas) return (
    <div className="card p-12 text-center">
      <div className="text-5xl mb-4">📋</div>
      <h2 className="text-xl font-bold text-text mb-2">Belum Menjadi Wali Kelas</h2>
      <p className="text-text-light">Anda belum ditugaskan sebagai wali kelas untuk kelas manapun.</p>
      <p className="text-text-light text-sm mt-2">Hubungi admin untuk ditugaskan sebagai wali kelas.</p>
    </div>
  );

  const lk = siswa.filter(s => s.jenis_kelamin === 'L').length;
  const pr = siswa.filter(s => s.jenis_kelamin === 'P').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Monitoring Kelas Saya</h1>
        <p className="text-text-light mt-1">Pantau perkembangan kelas yang Anda bimbing</p>
      </div>

      {/* Info Kelas */}
      <div className="card p-6 mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-1">{kelas.nama}</h2>
            <p className="text-text-light">
              {kelas.jurusan?.nama} • Tingkat {kelas.tingkat} • TA {kelas.tahun_ajaran?.nama}
            </p>
            {semester && (
              <p className="text-sm text-text-light mt-1">
                Semester Aktif: <span className="font-semibold text-primary">{semester.nama}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{siswa.length}</div>
            <div className="text-sm text-text-light">Siswa</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
        {[
          { id: 'overview', label: '📊 Ringkasan' },
          { id: 'siswa', label: '👥 Daftar Siswa' },
          { id: 'absensi', label: '✅ Rekap Absensi' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-light hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <TabOverview kelas={kelas} siswa={siswa} lk={lk} pr={pr} semester={semester} />
      )}
      {activeTab === 'siswa' && <TabSiswa siswa={siswa} />}
      {activeTab === 'absensi' && (
        <TabAbsensi kelasId={kelas.id} semester={semester} rekapAbsensi={rekapAbsensi} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: OVERVIEW
// ═══════════════════════════════════════════════════════════════
function TabOverview({ kelas, siswa, lk, pr, semester }) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">👥</div>
            <div>
              <div className="text-2xl font-bold text-text">{siswa.length}</div>
              <div className="text-sm text-text-light">Total Siswa</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border text-sm">
            <div className="flex justify-between">
              <span className="text-text-light">Laki-laki</span>
              <span className="font-semibold">{lk}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-text-light">Perempuan</span>
              <span className="font-semibold">{pr}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">✅</div>
            <div>
              <div className="text-sm text-text-light">Input Absensi</div>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/absensi" className="btn-primary w-full text-center block">
              Input Absensi →
            </Link>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">📅</div>
            <div>
              <div className="text-sm text-text-light">Jadwal Mengajar</div>
            </div>
          </div>
          <div className="mt-4">
            <Link to="/jadwal" className="btn-primary w-full text-center block">
              Lihat Jadwal →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="font-semibold text-text mb-4">Aksi Cepat</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/absensi" className="btn-secondary text-center">
            ✅ Input Absensi
          </Link>
          <Link to="/jadwal" className="btn-secondary text-center">
            📅 Jadwal Kelas
          </Link>
          <Link to="/siswa" className="btn-secondary text-center">
            👥 Kelola Siswa
          </Link>
          <Link to="/nilai" className="btn-secondary text-center">
            📝 Input Nilai
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: DAFTAR SISWA
// ═══════════════════════════════════════════════════════════════
function TabSiswa({ siswa }) {
  const [search, setSearch] = useState('');

  const filtered = siswa.filter(s =>
    s.nama?.toLowerCase().includes(search.toLowerCase()) ||
    s.nisn?.includes(search)
  );

  return (
    <div>
      <div className="card p-4 mb-4">
        <input
          type="text"
          placeholder="Cari nama atau NISN..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>No</th>
                <th>NISN</th>
                <th>Nama</th>
                <th>L/P</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-text-light">
                  {search ? 'Siswa tidak ditemukan' : 'Belum ada siswa'}
                </td></tr>
              ) : filtered.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td className="font-mono text-sm">{s.nisn}</td>
                  <td className="font-medium">{s.nama}</td>
                  <td>{s.jenis_kelamin === 'L' ? 'L' : 'P'}</td>
                  <td className="text-sm">{s.user?.email || '-'}</td>
                  <td>
                    {s.user?.is_active
                      ? <span className="badge badge-success">Aktif</span>
                      : <span className="badge badge-error">Nonaktif</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB: REKAP ABSENSI
// ═══════════════════════════════════════════════════════════════
function TabAbsensi({ kelasId, semester, rekapAbsensi }) {
  if (!semester) {
    return (
      <div className="card p-12 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-text mb-2">Semester Aktif Tidak Ditemukan</h3>
        <p className="text-text-light">Hubungi admin untuk mengaktifkan semester.</p>
      </div>
    );
  }

  if (rekapAbsensi.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-text mb-2">Belum Ada Data Absensi</h3>
        <p className="text-text-light mb-4">
          Mulai input absensi untuk melihat rekap di sini.
        </p>
        <Link to="/absensi" className="btn-primary inline-block">
          Input Absensi Sekarang
        </Link>
      </div>
    );
  }

  // Sort by persentase kehadiran
  const sorted = [...rekapAbsensi].sort((a, b) => b.persentase_hadir - a.persentase_hadir);

  return (
    <div>
      <div className="card p-4 mb-4 bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          📊 Rekap absensi semester <strong>{semester.nama}</strong> — Tahun Ajaran <strong>{semester.tahun_ajaran?.nama}</strong>
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Siswa</th>
                <th>Pertemuan</th>
                <th>Hadir</th>
                <th>Izin</th>
                <th>Sakit</th>
                <th>Alfa</th>
                <th>Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const persen = r.persentase_hadir || 0;
                const color = persen >= 80 ? 'text-green-600' : persen >= 60 ? 'text-yellow-600' : 'text-red-600';
                return (
                  <tr key={r.siswa_id}>
                    <td>{i + 1}</td>
                    <td className="font-medium">{r.nama}</td>
                    <td>{r.total_pertemuan}</td>
                    <td className="text-green-600 font-semibold">{r.hadir}</td>
                    <td className="text-yellow-600">{r.izin}</td>
                    <td className="text-blue-600">{r.sakit}</td>
                    <td className="text-red-600 font-semibold">{r.alfa}</td>
                    <td className={`font-bold ${color}`}>
                      {persen.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={() => exportAbsensiToPDF({ kelas, semester, rekapAbsensi: sorted })}
          className="btn-secondary"
        >
          📄 Export PDF
        </button>
        <Link to="/absensi" className="btn-primary">
          Input Absensi Baru
        </Link>
      </div>
    </div>
  );
}