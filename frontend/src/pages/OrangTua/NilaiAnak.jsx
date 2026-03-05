import { useState, useEffect } from 'react';
import { orangTuaService } from '../../services/orangtuaService';
import { nilaiService } from '../../services/nilaiService';
import { semesterService } from '../../services/semesterService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

export default function NilaiAnak() {
  const [anakList, setAnakList] = useState([]);
  const [selectedAnak, setSelectedAnak] = useState(null);
  const [semesterList, setSemesterList] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [nilaiData, setNilaiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const [anakRes, semRes, semAktifRes] = await Promise.all([
        orangTuaService.getAnakSaya(),
        semesterService.getAll(),
        semesterService.getAktif().catch(() => ({ data: null })),
      ]);

      // Parse anak
      let anak = [];
      if (anakRes.data?.siswa) anak = anakRes.data.siswa;
      else if (anakRes.data?.anak) anak = anakRes.data.anak.map(a => a.siswa).filter(Boolean);
      setAnakList(anak);

      // Parse semester
      const rawSem = semRes.data;
      setSemesterList(Array.isArray(rawSem) ? rawSem : (rawSem?.data || []));

      const aktif = semAktifRes.data;
      if (aktif) setSelectedSemester(String(aktif.id));

      // Auto select first anak
      if (anak.length > 0 && aktif) {
        setSelectedAnak(anak[0]);
        await fetchNilai(anak[0].id, aktif.id);
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNilai(siswaId, semesterId) {
    try {
      const res = await nilaiService.getNilaiSiswa(siswaId, { semester_id: semesterId });
      setNilaiData(res.data);
    } catch (e) {
      console.error('Error:', e);
      setNilaiData(null);
    }
  }

  async function handleChange(anakId, semesterId) {
    const anak = anakList.find(a => a.id === Number(anakId));
    setSelectedAnak(anak);
    await fetchNilai(Number(anakId), Number(semesterId));
  }

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  if (anakList.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold mb-2">Belum Ada Anak Terdaftar</h3>
        <p className="text-text-light">Hubungi admin untuk menghubungkan akun Anda dengan siswa.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Nilai Anak</h1>
        <p className="text-text-light mt-1">Pantau nilai akademik anak Anda</p>
      </div>

      {/* Filter */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Pilih Anak</label>
            <select
              value={selectedAnak?.id || ''}
              onChange={(e) => handleChange(e.target.value, selectedSemester)}
              className="input-field"
            >
              {anakList.map(a => (
                <option key={a.id} value={a.id}>{a.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => { setSelectedSemester(e.target.value); handleChange(selectedAnak?.id, e.target.value); }}
              className="input-field"
            >
              {semesterList.map(s => (
                <option key={s.id} value={s.id}>{s.nama} - {s.tahun_ajaran?.nama}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Header Card */}
      {selectedAnak && (
        <div className="card p-6 mb-6 bg-primary/5 border-2 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-primary mb-1">{selectedAnak.nama}</h2>
              <p className="text-text-light">NISN: {selectedAnak.nisn} • Kelas: {selectedAnak.kelas?.nama || '-'}</p>
            </div>
            {nilaiData && (
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">{nilaiData.rata_rata?.toFixed(2) || '-'}</div>
                <div className="text-sm text-text-light">Rata-rata</div>
                {nilaiData.predikat_umum && (
                  <span className={`badge ${getPredikatColor(nilaiData.predikat_umum)} mt-2`}>
                    {nilaiData.predikat_umum}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table Nilai */}
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
              {!nilaiData || nilaiData.nilai?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-text-light">
                    Belum ada nilai untuk semester ini
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
                    <span className={`badge ${getPredikatColor(n.predikat)}`}>{n.predikat}</span>
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