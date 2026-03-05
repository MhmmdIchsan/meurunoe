import { useState, useEffect } from 'react';
import { orangTuaService } from '../../services/orangtuaService';
import { nilaiService } from '../../services/nilaiService';
import { absensiService } from '../../services/absensiService';
import { semesterService } from '../../services/semesterService';
import { exportRaporToPDF } from '../../utils/pdfExport';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

export default function RaporAnak() {
  const [anakList, setAnakList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const [anakRes, semRes] = await Promise.all([
        orangTuaService.getAnakSaya(),
        semesterService.getAll(),
      ]);

      let anak = [];
      if (anakRes.data?.siswa) anak = anakRes.data.siswa;
      else if (anakRes.data?.anak) anak = anakRes.data.anak.map(a => a.siswa).filter(Boolean);
      setAnakList(anak);

      const rawSem = semRes.data;
      setSemesterList(Array.isArray(rawSem) ? rawSem : (rawSem?.data || []));
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(siswa, semester) {
    setGenerating(true);
    try {
      const [nilaiRes, absensiRes] = await Promise.all([
        nilaiService.getNilaiSiswa(siswa.id, { semester_id: semester.id }),
        absensiService.getRekapSiswa(siswa.id, { semester_id: semester.id }),
      ]);

      exportRaporToPDF({
        siswa,
        semester,
        nilaiData: nilaiRes.data,
        absensiData: absensiRes.data,
      });

      alert(`Rapor ${siswa.nama} berhasil di-generate!`);
    } catch (e) {
      console.error('Error:', e);
      alert('Gagal generate rapor: ' + (e.response?.data?.message || e.message));
    } finally {
      setGenerating(false);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Rapor Anak</h1>
        <p className="text-text-light mt-1">Download rapor semester anak Anda</p>
      </div>

      {anakList.map(anak => (
        <div key={anak.id} className="card p-6 mb-4">
          <h3 className="text-lg font-semibold text-text mb-4">
            {anak.nama} - {anak.kelas?.nama || '-'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {semesterList.map(semester => (
              <button
                key={semester.id}
                onClick={() => handleGenerate(anak, semester)}
                disabled={generating}
                className="btn-secondary text-left p-4"
              >
                <div className="text-sm text-text-light mb-1">Rapor</div>
                <div className="font-semibold">{semester.nama}</div>
                <div className="text-xs text-text-light mt-1">{semester.tahun_ajaran?.nama}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {generating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-text">Generating rapor...</p>
          </div>
        </div>
      )}
    </div>
  );
}