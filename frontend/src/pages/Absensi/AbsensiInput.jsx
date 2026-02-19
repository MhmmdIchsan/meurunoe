import { useState, useEffect } from 'react';
import { absensiService } from '../../services/absensiService';
import { siswaService } from '../../services/siswaService';
import { kelasService } from '../../services/kelasService';
import { jadwalService } from '../../services/jadwalService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Alert from '../../components/Common/Alert';

const AbsensiInput = () => {
  const [kelas, setKelas] = useState([]);
  const [jadwal, setJadwal] = useState([]);
  const [siswa, setSiswa] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedJadwal, setSelectedJadwal] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [pertemuan, setPertemuan] = useState(1);
  const [absensiData, setAbsensiData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  useEffect(() => {
    fetchKelas();
  }, []);

  useEffect(() => {
    if (selectedKelas) {
      fetchJadwal();
      fetchSiswa();
    }
  }, [selectedKelas]);

  useEffect(() => {
    if (siswa.length > 0) {
      initializeAbsensiData();
    }
  }, [siswa]);

  const fetchKelas = async () => {
    try {
      const response = await kelasService.getAll();
      setKelas(response.data || []);
    } catch (error) {
      showAlert('error', 'Gagal memuat data kelas');
    }
  };

  const fetchJadwal = async () => {
    try {
      const response = await jadwalService.getByKelas(selectedKelas);
      setJadwal(response.data.data || []);
    } catch (error) {
      showAlert('error', 'Gagal memuat data jadwal');
    }
  };

  const fetchSiswa = async () => {
    try {
      setLoading(true);
      const response = await siswaService.getByKelas(selectedKelas);
      setSiswa(response.data.data || []);
    } catch (error) {
      showAlert('error', 'Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  };

  const initializeAbsensiData = () => {
    const data = siswa.map(s => ({
      siswa_id: s.id,
      status: 'H'
    }));
    setAbsensiData(data);
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 3000);
  };

  const handleStatusChange = (siswaId, status) => {
    setAbsensiData(prev =>
      prev.map(item =>
        item.siswa_id === siswaId ? { ...item, status } : item
      )
    );
  };

  const handleSelectAll = (status) => {
    setAbsensiData(prev =>
      prev.map(item => ({ ...item, status }))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedJadwal) {
      showAlert('error', 'Pilih jadwal terlebih dahulu');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        jadwal_id: parseInt(selectedJadwal),
        tanggal,
        pertemuan_ke: pertemuan,
        absensi_list: absensiData
      };

      await absensiService.inputBatch(payload);
      showAlert('success', 'Absensi berhasil disimpan');
      
      // Reset form
      initializeAbsensiData();
      setPertemuan(pertemuan + 1);
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Gagal menyimpan absensi');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      H: { label: 'Hadir', class: 'badge-success' },
      I: { label: 'Izin', class: 'badge-info' },
      S: { label: 'Sakit', class: 'badge-warning' },
      A: { label: 'Alpha', class: 'badge-error' }
    };
    return badges[status] || badges.H;
  };

  const countStatus = (status) => {
    return absensiData.filter(item => item.status === status).length;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Input Absensi</h1>
        <p className="text-text-light mt-1">Input absensi siswa per mata pelajaran</p>
      </div>

      {alert.show && <Alert type={alert.type} message={alert.message} />}

      <form onSubmit={handleSubmit}>
        {/* Filter Section */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Kelas *</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Pilih Kelas</option>
                {kelas.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Mata Pelajaran *</label>
              <select
                value={selectedJadwal}
                onChange={(e) => setSelectedJadwal(e.target.value)}
                className="input-field"
                required
                disabled={!selectedKelas}
              >
                <option value="">Pilih Mata Pelajaran</option>
                {jadwal.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.mata_pelajaran?.nama_mapel} - {j.hari} ({j.jam_mulai?.substring(0, 5)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Tanggal *</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Pertemuan Ke *</label>
              <input
                type="number"
                value={pertemuan}
                onChange={(e) => setPertemuan(parseInt(e.target.value))}
                className="input-field"
                min="1"
                required
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        {siswa.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <div className="text-sm text-text-light mb-1">Hadir</div>
              <div className="text-2xl font-bold text-success">{countStatus('H')}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-text-light mb-1">Izin</div>
              <div className="text-2xl font-bold text-info">{countStatus('I')}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-text-light mb-1">Sakit</div>
              <div className="text-2xl font-bold text-warning">{countStatus('S')}</div>
            </div>
            <div className="card p-4">
              <div className="text-sm text-text-light mb-1">Alpha</div>
              <div className="text-2xl font-bold text-error">{countStatus('A')}</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {siswa.length > 0 && (
          <div className="card p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text">Tandai Semua:</span>
              <button
                type="button"
                onClick={() => handleSelectAll('H')}
                className="px-3 py-1 bg-success text-white rounded text-sm hover:bg-green-600"
              >
                Hadir
              </button>
              <button
                type="button"
                onClick={() => handleSelectAll('I')}
                className="px-3 py-1 bg-info text-white rounded text-sm hover:bg-blue-600"
              >
                Izin
              </button>
              <button
                type="button"
                onClick={() => handleSelectAll('S')}
                className="px-3 py-1 bg-warning text-white rounded text-sm hover:bg-yellow-600"
              >
                Sakit
              </button>
              <button
                type="button"
                onClick={() => handleSelectAll('A')}
                className="px-3 py-1 bg-error text-white rounded text-sm hover:bg-red-600"
              >
                Alpha
              </button>
            </div>
          </div>
        )}

        {/* Student List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : siswa.length === 0 ? (
          <div className="card p-8 text-center text-text-light">
            {selectedKelas ? 'Belum ada siswa di kelas ini' : 'Pilih kelas terlebih dahulu'}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-auto">
                <thead>
                  <tr>
                    <th className="w-16">No</th>
                    <th>NISN</th>
                    <th>Nama Siswa</th>
                    <th className="text-center">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody>
                  {siswa.map((s, index) => {
                    const absensi = absensiData.find(a => a.siswa_id === s.id);
                    return (
                      <tr key={s.id}>
                        <td className="text-center">{index + 1}</td>
                        <td>{s.nisn}</td>
                        <td className="font-medium">{s.nama}</td>
                        <td>
                          <div className="flex justify-center gap-2">
                            {['H', 'I', 'S', 'A'].map(status => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleStatusChange(s.id, status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                  absensi?.status === status
                                    ? status === 'H' ? 'bg-success text-white'
                                    : status === 'I' ? 'bg-info text-white'
                                    : status === 'S' ? 'bg-warning text-white'
                                    : 'bg-error text-white'
                                    : 'bg-gray-100 text-text-light hover:bg-gray-200'
                                }`}
                              >
                                {getStatusBadge(status).label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {siswa.length > 0 && (
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn-secondary">
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : '💾 Simpan Absensi'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default AbsensiInput;