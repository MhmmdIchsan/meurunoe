import { useEffect, useState } from "react";
import { semesterService } from "../../services/semesterService";
import { tahunAjaranService } from "../../services/tahunajaranService";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import Modal from "../../components/Common/Modal";
import Alert from "../../components/Common/Alert";

const SemesterTahunAjaranPage = () => {

  const [tahunAjaran, setTahunAjaran] = useState([]);
  const [semester, setSemester] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModalTA, setShowModalTA] = useState(false);
  const [showModalSemester, setShowModalSemester] = useState(false);

  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [valErr, setValErr] = useState('');

  const [formTA, setFormTA] = useState({
    nama: "",
    tahun_mulai: "",
    tahun_selesai: ""
  });

  const [formSemester, setFormSemester] = useState({
    nama: "",
    tahun_ajaran_id: ""
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ta, sem] = await Promise.all([
        tahunAjaranService.getAll(),
        semesterService.getAll()
      ]);

      setTahunAjaran(ta.data || []);
      setSemester(sem.data || []);
    } catch {
      showAlert('error', 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4000);
  };

  const handleSubmitTA = async (e) => {
    e.preventDefault();
    setSaving(true);
    setValErr('');
    try {
      await tahunAjaranService.create({
        nama: formTA.nama,
        tahun_mulai: Number(formTA.tahun_mulai),
        tahun_selesai: Number(formTA.tahun_selesai)
      });

      showAlert('success', 'Tahun Ajaran berhasil ditambahkan');
      setShowModalTA(false);
      setFormTA({ nama: "", tahun_mulai: "", tahun_selesai: "" });
      fetchData();
    } catch (e) {
      const msg = e.response?.data?.errors || e.response?.data?.message;
      setValErr(String(msg));
      showAlert('error', String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitSemester = async (e) => {
    e.preventDefault();
    setSaving(true);
    setValErr('');
    try {
      await semesterService.create({
        nama: formSemester.nama,
        tahun_ajaran_id: Number(formSemester.tahun_ajaran_id)
      });

      showAlert('success', 'Semester berhasil ditambahkan');
      setShowModalSemester(false);
      setFormSemester({ nama: "", tahun_ajaran_id: "" });
      fetchData();
    } catch (e) {
      const msg = e.response?.data?.errors || e.response?.data?.message;
      setValErr(String(msg));
      showAlert('error', String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="flex justify-center h-64 items-center">
      <LoadingSpinner size="lg" />
    </div>;

  return (
    <div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Semester & Tahun Ajaran</h1>
          <p className="text-text-light mt-1">
            Total: {semester.length} semester
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModalTA(true)} className="btn-secondary">
            ➕ Tahun Ajaran
          </button>
          <button onClick={() => setShowModalSemester(true)} className="btn-primary">
            ➕ Semester
          </button>
        </div>
      </div>

      {alert.show && <Alert type={alert.type} message={alert.message} />}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>Semester</th>
                <th>Tahun Ajaran</th>
              </tr>
            </thead>
            <tbody>
              {semester.length === 0 ? (
                <tr>
                  <td colSpan="2" className="text-center py-8 text-text-light">
                    Belum ada data
                  </td>
                </tr>
              ) : semester.map(sem => (
                <tr key={sem.id}>
                  <td>{sem.nama}</td>
                  <td>{sem.tahun_ajaran?.nama || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= Modal Tahun Ajaran ================= */}
      <Modal isOpen={showModalTA} onClose={() => setShowModalTA(false)}
        title="Tambah Tahun Ajaran" size="md">

        <form onSubmit={handleSubmitTA} className="space-y-4">
          {valErr && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{valErr}</div>}

          <input className="input-field" placeholder="Nama (2025/2026)"
            value={formTA.nama}
            onChange={e => setFormTA({ ...formTA, nama: e.target.value })}
            required />

          <div className="grid grid-cols-2 gap-4">
            <input type="number" className="input-field"
              placeholder="Tahun Mulai"
              value={formTA.tahun_mulai}
              onChange={e => setFormTA({ ...formTA, tahun_mulai: e.target.value })}
              required />

            <input type="number" className="input-field"
              placeholder="Tahun Selesai"
              value={formTA.tahun_selesai}
              onChange={e => setFormTA({ ...formTA, tahun_selesai: e.target.value })}
              required />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" className="btn-secondary" onClick={() => setShowModalTA(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= Modal Semester ================= */}
      <Modal isOpen={showModalSemester} onClose={() => setShowModalSemester(false)}
        title="Tambah Semester" size="md">

        <form onSubmit={handleSubmitSemester} className="space-y-4">

          <select className="input-field"
            value={formSemester.tahun_ajaran_id}
            onChange={e => setFormSemester({
              ...formSemester,
              tahun_ajaran_id: e.target.value
            })}
            required>
            <option value="">-- Pilih Tahun Ajaran --</option>
            {tahunAjaran.map(ta => (
              <option key={ta.id} value={ta.id}>{ta.nama}</option>
            ))}
          </select>

          <select className="input-field"
            value={formSemester.nama}
            onChange={e => setFormSemester({
              ...formSemester,
              nama: e.target.value
            })}
            required>
            <option value="">-- Pilih Semester --</option>
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
          </select>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" className="btn-secondary" onClick={() => setShowModalSemester(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default SemesterTahunAjaranPage;
