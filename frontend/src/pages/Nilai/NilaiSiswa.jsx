import { useState, useEffect } from 'react';
import { nilaiService } from '../../services/nilaiService';
import { semesterService } from '../../services/semesterService';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

export default function NilaiSiswa() {
  const { user } = useAuth();
  const [nilaiData, setNilaiData]       = useState(null);
  const [semesterList, setSemesterList] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const [semRes, semAktifRes] = await Promise.all([
        semesterService.getAll(),
        semesterService.getAktif().catch(() => ({ data: null })),
      ]);

      const rawSem = semRes.data;
      setSemesterList(Array.isArray(rawSem) ? rawSem : (rawSem?.data || []));

      const aktif = semAktifRes.data;
      if (aktif) {
        setSelectedSemester(String(aktif.id));
        await fetchNilai(aktif.id);
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNilai(semesterId) {
    setLoading(true);
    try {
      const res = await nilaiService.getNilaiSaya({ semester_id: semesterId });
      setNilaiData(res.data);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleSemesterChange(e) {
    const semId = e.target.value;
    setSelectedSemester(semId);
    if (semId) fetchNilai(semId);
  }

  const semesterObj = semesterList.find(s => s.id === Number(selectedSemester));

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Nilai Saya</h1>
        <p className="text-text-light mt-1">Lihat nilai dan rapor Anda</p>
      </div>

      {/* Filter Semester */}
      <div className="card p-4 mb-4">
        <label className="block text-sm font-medium text-text mb-2">Pilih Semester</label>
        <select value={selectedSemester} onChange={handleSemesterChange} className="input-field w-64">
          <option value="">-- Pilih Semester --</option>
          {semesterList.map(s => (
            <option key={s.id} value={s.id}>
              {s.nama} - {s.tahun_ajaran?.nama}
            </option>
          ))}
        </select>
      </div>

      {!nilaiData ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-text mb-2">Belum Ada Nilai</h3>
          <p className="text-text-light">Nilai untuk semester ini belum tersedia.</p>
        </div>
      ) : (
        <>
          {/* Info Siswa */}
          <div className="card p-6 mb-4 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary mb-1">
                  {nilaiData.siswa?.nama || 'Siswa'}
                </h3>
                <p className="text-text-light">
                  Kelas {nilaiData.siswa?.kelas?.nama || '-'} • 
                  Semester {semesterObj?.nama || '-'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">
                  {nilaiData.rata_rata ? nilaiData.rata_rata.toFixed(2) : '-'}
                </div>
                <div className="text-sm text-text-light">Rata-rata</div>
                {nilaiData.predikat_umum && (
                  <span className={`badge ${getPredikatColor(nilaiData.predikat_umum)} mt-2`}>
                    {nilaiData.predikat_umum}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabel Nilai */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-auto">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Mata Pelajaran</th>
                    <th>Harian</th>
                    <th>UTS</th>
                    <th>UAS</th>
                    <th>Akhir</th>
                    <th>Predikat</th>
                  </tr>
                </thead>
                <tbody>
                  {!nilaiData.nilai || nilaiData.nilai.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-text-light">
                        Belum ada nilai
                      </td>
                    </tr>
                  ) : nilaiData.nilai.map((n, i) => (
                    <tr key={n.id}>
                      <td>{i + 1}</td>
                      <td className="font-medium">{n.mata_pelajaran?.nama || '-'}</td>
                      <td className="text-center">{n.nilai_harian}</td>
                      <td className="text-center">{n.nilai_uts}</td>
                      <td className="text-center">{n.nilai_uas}</td>
                      <td className="text-center font-semibold">{n.nilai_akhir.toFixed(2)}</td>
                      <td className="text-center">
                        <span className={`badge ${getPredikatColor(n.predikat)}`}>
                          {n.predikat}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="card p-4">
              <div className="text-sm text-text-light mb-1">Total Mata Pelajaran</div>
              <div className="text-2xl font-bold text-text">{nilaiData.total_mapel || 0}</div>
            </div>

            <div className="card p-4">
              <div className="text-sm text-text-light mb-1">Rata-rata Nilai</div>
              <div className="text-2xl font-bold text-primary">
                {nilaiData.rata_rata ? nilaiData.rata_rata.toFixed(2) : '-'}
              </div>
            </div>

            <div className="card p-4">
              <div className="text-sm text-text-light mb-1">Predikat Umum</div>
              <div className="text-2xl font-bold">
                <span className={`badge ${getPredikatColor(nilaiData.predikat_umum)} text-xl px-4 py-2`}>
                  {nilaiData.predikat_umum || '-'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getPredikatColor(predikat) {
  switch (predikat) {
    case 'A': return 'badge-success';
    case 'B': return 'badge-info';
    case 'C': return 'badge-warning';
    case 'D': return 'badge-warning';
    case 'E': return 'badge-error';
    default: return 'badge-secondary';
  }
}