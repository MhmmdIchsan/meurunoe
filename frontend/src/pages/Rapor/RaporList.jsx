import { useState, useEffect } from 'react';
import { raporService } from '../../services/raporService';
import { siswaService } from '../../services/siswaService';
import { kelasService } from '../../services/kelasService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Alert from '../../components/Common/Alert';

const RaporList = () => {
  const [rapor, setRapor] = useState([]);
  const [siswa, setSiswa] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchKelas();
  }, []);

  useEffect(() => {
    if (selectedKelas) {
      fetchSiswa();
    }
  }, [selectedKelas]);

  useEffect(() => {
    if (selectedSiswa) {
      fetchRapor();
    }
  }, [selectedSiswa]);

  const fetchKelas = async () => {
    try {
      const response = await kelasService.getAll();
      setKelas(response.data.data || []);
    } catch (error) {
      showAlert('error', 'Gagal memuat data kelas');
    }
  };

  const fetchSiswa = async () => {
    try {
      const response = await siswaService.getByKelas(selectedKelas);
      setSiswa(response.data.data || []);
    } catch (error) {
      showAlert('error', 'Gagal memuat data siswa');
    }
  };

  const fetchRapor = async () => {
    try {
      setLoading(true);
      const response = await raporService.getBySiswa(selectedSiswa);
      setRapor(response.data.data || []);
    } catch (error) {
      showAlert('error', 'Gagal memuat data rapor');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 3000);
  };

  const handleDownload = async (id, siswaName, semester, tahunAjaran) => {
    try {
      setLoading(true);
      const response = await raporService.download(id);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rapor_${siswaName}_${semester}_${tahunAjaran}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      showAlert('success', 'Rapor berhasil didownload');
    } catch (error) {
      showAlert('error', 'Gagal mendownload rapor');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSiswa) {
      showAlert('error', 'Pilih siswa terlebih dahulu');
      return;
    }

    try {
      setLoading(true);
      await raporService.generate({
        siswa_id: parseInt(selectedSiswa),
        semester: 'Ganjil',
        tahun_ajaran: '2024/2025'
      });
      showAlert('success', 'Rapor berhasil digenerate');
      fetchRapor();
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Gagal generate rapor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Rapor Siswa</h1>
          <p className="text-text-light mt-1">Kelola dan download rapor siswa</p>
        </div>
        <button 
          onClick={handleGenerate}
          className="btn-primary"
          disabled={!selectedSiswa || loading}
        >
          <span className="mr-2">📄</span>
          Generate Rapor
        </button>
      </div>

      {alert.show && <Alert type={alert.type} message={alert.message} />}

      {/* Filter Section */}
      <div className="card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Pilih Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => {
                setSelectedKelas(e.target.value);
                setSelectedSiswa('');
                setRapor([]);
              }}
              className="input-field"
            >
              <option value="">-- Pilih Kelas --</option>
              {kelas.map((k) => (
                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Pilih Siswa</label>
            <select
              value={selectedSiswa}
              onChange={(e) => setSelectedSiswa(e.target.value)}
              className="input-field"
              disabled={!selectedKelas}
            >
              <option value="">-- Pilih Siswa --</option>
              {siswa.map((s) => (
                <option key={s.id} value={s.id}>{s.nisn} - {s.nama}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Rapor List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : !selectedSiswa ? (
        <div className="card p-8 text-center text-text-light">
          Pilih kelas dan siswa untuk melihat rapor
        </div>
      ) : rapor.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-text-light mb-4">
            Belum ada rapor untuk siswa ini
          </div>
          <button onClick={handleGenerate} className="btn-primary">
            <span className="mr-2">📄</span>
            Generate Rapor Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rapor.map((r) => (
            <div key={r.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center text-3xl">
                  📄
                </div>
                <span className="badge badge-info">{r.status || 'Final'}</span>
              </div>

              <h3 className="text-lg font-semibold text-text mb-2">
                Rapor {r.semester}
              </h3>
              <p className="text-sm text-text-light mb-4">
                Tahun Ajaran {r.tahun_ajaran}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-light">Rata-rata Nilai:</span>
                  <span className="font-semibold text-text">
                    {r.rata_rata ? r.rata_rata.toFixed(2) : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-light">Ranking:</span>
                  <span className="font-semibold text-text">{r.ranking || '-'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <button
                  onClick={() => handleDownload(
                    r.id,
                    siswa.find(s => s.id === parseInt(selectedSiswa))?.nama || 'Siswa',
                    r.semester,
                    r.tahun_ajaran
                  )}
                  className="w-full btn-primary"
                  disabled={loading}
                >
                  <span className="mr-2">⬇️</span>
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="card p-6 mt-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="text-3xl">ℹ️</div>
          <div>
            <h4 className="font-semibold text-text mb-2">Informasi Rapor</h4>
            <ul className="text-sm text-text-light space-y-1">
              <li>• Rapor dapat didownload dalam format PDF</li>
              <li>• Generate rapor akan mengambil semua nilai siswa pada semester yang dipilih</li>
              <li>• Pastikan semua nilai sudah diinput sebelum generate rapor</li>
              <li>• Rapor dapat digenerate ulang jika ada perubahan nilai</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaporList;