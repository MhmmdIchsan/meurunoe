import { useState, useEffect } from 'react';
import { jadwalService } from '../../services/jadwalService';
import { kelasService } from '../../services/kelasService';
import { semesterService } from '../../services/semesterService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Alert from '../../components/Common/Alert';

const JadwalList = () => {
  const [jadwal, setJadwal] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const hari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const jamPelajaran = [
    '07:00 - 07:45',
    '07:45 - 08:30',
    '08:30 - 09:15',
    '09:30 - 10:15',
    '10:15 - 11:00',
    '11:00 - 11:45',
    '12:00 - 12:45',
    '12:45 - 13:30'
  ];

  useEffect(() => {
    fetchKelas();
  }, []);

  useEffect(() => {
    if (selectedKelas) {
      fetchJadwal();
    }
  }, [selectedKelas]);

  const fetchKelas = async () => {
    try {
      const response = await kelasService.getAll();
      const kelasData = response.data || [];
      setKelas(kelasData);
      if (kelasData.length > 0) {
        setSelectedKelas(kelasData[0].id);
      }
    } catch (error) {
      showAlert('error', 'Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  };

  const fetchJadwal = async () => {
    try {
      setLoading(true);

      const sem = await semesterService.getAktif();
      const semesterId = sem.data.data.id; // ✅ BENAR

      const response = await jadwalService.getByKelas(
        selectedKelas,
        semesterId
      );

      setJadwal(response.data || []);
    } catch (error) {
      console.log("ERROR FETCH JADWAL:", error.response);
      showAlert('error', 'Gagal memuat data jadwal');
    } finally {
      setLoading(false);
    }
  };


  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 3000);
  };

  const getJadwalByHariJam = (hariIndex, jamIndex) => {
    return jadwal.find(j => 
      j.hari === hari[hariIndex] && j.jam_mulai?.substring(0, 5) === jamPelajaran[jamIndex].split(' - ')[0]
    );
  };

  const getColorByMapel = (mapel) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    const hash = mapel?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return colors[hash % colors.length];
  };

  if (loading && !selectedKelas) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Jadwal Pelajaran</h1>
        <p className="text-text-light mt-1">Lihat jadwal pelajaran per kelas</p>
      </div>

      {alert.show && <Alert type={alert.type} message={alert.message} />}

      {/* Filter Kelas */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="font-medium text-text">Pilih Kelas:</label>
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            className="input-field max-w-xs"
          >
            {kelas.map((k) => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Jadwal Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-4 py-3 text-left font-semibold border border-border w-32">
                    Jam
                  </th>
                  {hari.map((h, index) => (
                    <th key={index} className="px-4 py-3 text-center font-semibold border border-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jamPelajaran.map((jam, jamIndex) => (
                  <tr key={jamIndex}>
                    <td className="px-4 py-3 border border-border bg-gray-50 font-medium text-sm">
                      {jam}
                    </td>
                    {hari.map((h, hariIndex) => {
                      const jadwalItem = getJadwalByHariJam(hariIndex, jamIndex);
                      return (
                        <td key={hariIndex} className="px-2 py-2 border border-border">
                          {jadwalItem ? (
                            <div className={`p-3 rounded-lg ${getColorByMapel(jadwalItem.mata_pelajaran?.nama_mapel)}`}>
                              <div className="font-semibold text-sm mb-1">
                                {jadwalItem.mata_pelajaran?.nama_mapel || '-'}
                              </div>
                              <div className="text-xs">
                                👨‍🏫 {jadwalItem.guru?.nama || '-'}
                              </div>
                              <div className="text-xs mt-1">
                                🏫 {jadwalItem.ruangan || '-'}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-text-light text-sm">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="card p-4 mt-6">
        <h3 className="font-semibold text-text mb-3">Keterangan:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <span>👨‍🏫</span>
            <span className="text-sm text-text-light">Nama Guru Pengajar</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🏫</span>
            <span className="text-sm text-text-light">Ruangan Kelas</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🕐</span>
            <span className="text-sm text-text-light">Waktu Pelajaran</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JadwalList;