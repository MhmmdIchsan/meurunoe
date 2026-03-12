import { useState, useEffect } from 'react';
import { orangTuaService } from '../../services/orangTuaService';
import { jadwalService } from '../../services/jadwalService';
import { semesterService } from '../../services/semesterService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function JadwalAnak() {
  const [anakList, setAnakList] = useState([]);
  const [selectedAnak, setSelectedAnak] = useState(null);
  const [semesterAktif, setSemesterAktif] = useState(null);
  const [jadwalData, setJadwalData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      // Fetch semester aktif dan anak
      const [anakRes, semRes] = await Promise.all([
        orangTuaService.getAnakSaya(),
        semesterService.getAktif().catch(() => ({ data: null })),
      ]);

      const aktif = semRes.data;
      setSemesterAktif(aktif);
      
      let anak = [];
      if (anakRes.data?.siswa) anak = anakRes.data.siswa;
      else if (anakRes.data?.anak) anak = anakRes.data.anak.map(a => a.siswa).filter(Boolean);
      
      setAnakList(anak);

      if (anak.length > 0 && anak[0].kelas?.id && aktif) {
        setSelectedAnak(anak[0]);
        await fetchJadwal(anak[0].kelas.id, aktif.id);
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchJadwal(kelasId, semesterId) {
    try {
      const res = await jadwalService.getJadwalKelas(kelasId, { semester_id: semesterId });
      const rawJadwal = res.data;
      const jadwal = Array.isArray(rawJadwal) ? rawJadwal : (rawJadwal?.data || []);
      setJadwalData(jadwal);
    } catch (e) {
      console.error('Error:', e);
      setJadwalData([]);
    }
  }

  async function handleAnakChange(e) {
    const anakId = Number(e.target.value);
    const anak = anakList.find(a => a.id === anakId);
    setSelectedAnak(anak);
    
    if (anak?.kelas?.id && semesterAktif) {
      await fetchJadwal(anak.kelas.id, semesterAktif.id);
    }
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

  // Group jadwal by hari
  const jadwalByHari = HARI.map((hari, idx) => {
    const jadwalHari = jadwalData.filter(j => j.hari_ke === idx + 1);
    return {
      hari,
      jadwal: jadwalHari.sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai)),
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Jadwal Pelajaran Anak</h1>
        <p className="text-text-light mt-1">Jadwal mingguan pelajaran anak Anda</p>
      </div>

      {/* Filter Anak */}
      {anakList.length > 1 && (
        <div className="card p-4 mb-6">
          <label className="block text-sm font-medium text-text mb-2">Pilih Anak</label>
          <select
            value={selectedAnak?.id || ''}
            onChange={handleAnakChange}
            className="input-field w-64"
          >
            {anakList.map(a => (
              <option key={a.id} value={a.id}>{a.nama}</option>
            ))}
          </select>
        </div>
      )}

      {/* Info Header */}
      {selectedAnak && (
        <div className="card p-6 mb-6 bg-primary/5 border-2 border-primary/20">
          <h2 className="text-xl font-bold text-primary mb-1">{selectedAnak.nama}</h2>
          <p className="text-text-light">
            Kelas: {selectedAnak.kelas?.nama || '-'} • 
            NISN: {selectedAnak.nisn}
          </p>
        </div>
      )}

      {/* Jadwal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jadwalByHari.map(({ hari, jadwal }) => (
          <div key={hari} className="card overflow-hidden">
            <div className="bg-primary text-white px-4 py-3">
              <h3 className="font-bold text-lg">{hari}</h3>
            </div>
            
            <div className="p-4">
              {jadwal.length === 0 ? (
                <div className="text-center py-8 text-text-light text-sm">
                  Tidak ada jadwal
                </div>
              ) : (
                <div className="space-y-3">
                  {jadwal.map((j) => (
                    <div
                      key={j.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-text text-sm">
                          {j.mata_pelajaran?.nama || '-'}
                        </div>
                        <div className="text-xs text-primary font-mono bg-primary/10 px-2 py-1 rounded">
                          {j.jam_mulai} - {j.jam_selesai}
                        </div>
                      </div>
                      
                      <div className="text-xs text-text-light">
                        👨‍🏫 {j.guru?.nama || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {jadwalData.length === 0 && (
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-lg font-semibold mb-2">Belum Ada Jadwal</h3>
          <p className="text-text-light">
            Jadwal pelajaran untuk kelas {selectedAnak?.kelas?.nama} belum tersedia.
          </p>
        </div>
      )}
    </div>
  );
}