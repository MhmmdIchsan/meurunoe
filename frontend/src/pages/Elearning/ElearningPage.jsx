import { useState, useEffect } from 'react';
import { useAuth, extractRole } from '../../context/AuthContext';
import { elearningService } from '../../services/elearningService';
import { jadwalService } from '../../services/jadwalService';
import { kelasService } from '../../services/kelasService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

export default function ElearningPage() {
  const { user } = useAuth();
  const role = extractRole(user);
  const isGuru = role === 'guru' || role === 'wali_kelas' || role === 'admin';
  const isSiswa = role === 'siswa';

  const [loading, setLoading] = useState(true);
  const [jadwalList, setJadwalList] = useState([]);
  const [selectedJadwal, setSelectedJadwal] = useState(null);
  const [pertemuan, setPertemuan] = useState([]);
  const [selectedPertemuan, setSelectedPertemuan] = useState(null);
  const [view, setView] = useState('list'); // list | detail

  useEffect(() => { fetchJadwal(); }, []);

  async function fetchJadwal() {
    setLoading(true);
    try {
      if (isSiswa) {
        // Siswa lihat jadwal dari kelasnya
        const res = await jadwalService.getJadwalSaya();
        setJadwalList(res.data || []);
      } else {
        // Guru lihat jadwal mengajarnya
        const res = await jadwalService.getJadwalSaya();
        setJadwalList(res.data || []);
      }
    } catch (e) {
      console.error('Error fetch jadwal:', e);
    } finally {
      setLoading(false);
    }
  }

  async function selectJadwal(j) {
    setSelectedJadwal(j);
    setSelectedPertemuan(null);
    setView('list');
    setLoading(true);
    try {
      const res = await elearningService.getPertemuan({ jadwal_id: j.id });
      setPertemuan(res.data || []);
    } catch (e) {
      setPertemuan([]);
    } finally {
      setLoading(false);
    }
  }

  async function openPertemuan(p) {
    setLoading(true);
    try {
      const res = await elearningService.getPertemuanById(p.id);
      setSelectedPertemuan(res.data);
      setView('detail');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !selectedJadwal) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  // ── Pilih Jadwal ──
  if (!selectedJadwal) return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">📚 E-Learning</h1>
        <p className="text-text-light mt-1">
          {isGuru ? 'Pilih jadwal mengajar untuk mengelola pertemuan' : 'Pilih mata pelajaran untuk melihat materi'}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jadwalList.length === 0 ? (
          <div className="col-span-full card p-12 text-center text-text-light">
            {isGuru ? '📅 Belum ada jadwal mengajar. Hubungi admin untuk membuat jadwal.' : '📅 Belum ada jadwal untuk kelas Anda.'}
          </div>
        ) : jadwalList.map(j => (
          <button key={j.id} onClick={() => selectJadwal(j)}
            className="card p-5 text-left hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary/30">
            <div className="text-2xl font-bold text-primary mb-2">{j.mata_pelajaran?.nama || 'Mapel'}</div>
            <div className="text-sm text-text-light space-y-1">
              <div>🏫 {j.kelas?.nama || '-'}</div>
              <div>👨‍🏫 {j.guru?.nama || '-'}</div>
              <div>🕐 Hari ke-{j.hari_ke} • {j.jam_mulai}-{j.jam_selesai}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Daftar Pertemuan ──
  if (view === 'list') return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => { setSelectedJadwal(null); setPertemuan([]); }}
            className="text-primary hover:underline text-sm mb-2">← Kembali ke daftar jadwal</button>
          <h1 className="text-2xl font-bold text-text">
            {selectedJadwal.mata_pelajaran?.nama} — {selectedJadwal.kelas?.nama}
          </h1>
        </div>
        {isGuru && (
          <button onClick={() => setView('add')} className="btn-primary">➕ Pertemuan Baru</button>
        )}
      </div>

      {pertemuan.length === 0 ? (
        <div className="card p-12 text-center text-text-light">
          📋 Belum ada pertemuan. {isGuru && 'Klik "Pertemuan Baru" untuk mulai.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pertemuan.map(p => (
            <button key={p.id} onClick={() => openPertemuan(p)}
              className="card p-5 text-left hover:shadow-lg transition-shadow border-2 border-transparent hover:border-primary/30">
              <div className="flex items-center justify-between mb-2">
                <span className="badge badge-info">Pertemuan ke-{p.pertemuan_ke}</span>
                <span className="text-xs text-text-light">{p.tanggal?.split('T')[0]}</span>
              </div>
              <div className="font-semibold text-text mb-1">{p.topik || 'Tanpa Topik'}</div>
              <div className="text-sm text-text-light line-clamp-2">{p.deskripsi || '-'}</div>
              <div className="flex gap-2 mt-3 text-xs">
                {p.kehadiran?.length > 0 && <span className="text-green-600">✅ {p.kehadiran.length} hadir</span>}
                {p.materi?.length > 0 && <span className="text-blue-600">📄 {p.materi.length} materi</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {view === 'add' && (
        <AddPertemuanForm jadwalId={selectedJadwal.id} pertemuanCount={pertemuan.length}
          onDone={() => { setView('list'); selectJadwal(selectedJadwal); }} />
      )}
    </div>
  );

  // ── Detail Pertemuan ──
  if (view === 'detail' && selectedPertemuan) return (
    <DetailPertemuan pertemuan={selectedPertemuan} isGuru={isGuru}
      onBack={() => { setView('list'); selectJadwal(selectedJadwal); }}
      onRefresh={() => openPertemuan(selectedPertemuan)} />
  );

  return null;
}

// ═══════════════════════════════════════════════════════════════
// FORM TAMBAH PERTEMUAN
// ═══════════════════════════════════════════════════════════════
function AddPertemuanForm({ jadwalId, pertemuanCount, onDone }) {
  const [form, setForm] = useState({
    pertemuan_ke: pertemuanCount + 1,
    tanggal: new Date().toISOString().split('T')[0],
    topik: '',
    deskripsi: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await elearningService.createPertemuan({ ...form, jadwal_id: jadwalId });
      onDone();
    } catch (e) {
      setErr(e.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl">
        <h3 className="text-lg font-bold mb-4">Pertemuan Baru</h3>
        {err && <div className="p-2 mb-3 bg-red-50 text-red-700 text-sm rounded">{err}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Pertemuan ke-</label>
              <input type="number" value={form.pertemuan_ke}
                onChange={e => setForm(p => ({ ...p, pertemuan_ke: Number(e.target.value) }))}
                className="input-field" min={1} required />
            </div>
            <div>
              <label className="text-sm font-medium">Tanggal</label>
              <input type="date" value={form.tanggal}
                onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))}
                className="input-field" required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Topik</label>
            <input value={form.topik} onChange={e => setForm(p => ({ ...p, topik: e.target.value }))}
              className="input-field" placeholder="Materi yang dibahas..." />
          </div>
          <div>
            <label className="text-sm font-medium">Deskripsi</label>
            <textarea value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))}
              className="input-field" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onDone} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DETAIL PERTEMUAN (Absensi + Materi + Quiz + Tugas)
// ═══════════════════════════════════════════════════════════════
function DetailPertemuan({ pertemuan, isGuru, onBack, onRefresh }) {
  const [tab, setTab] = useState('kehadiran');
  const [siswaList, setSiswaList] = useState([]);

  useEffect(() => {
    if (isGuru && pertemuan.jadwal?.kelas_id) {
      kelasService.getSiswaByKelas(pertemuan.jadwal.kelas_id)
        .then(res => setSiswaList(Array.isArray(res.data) ? res.data : (res.data?.siswa || [])))
        .catch(() => {});
    }
  }, [pertemuan]);

  const tabs = isGuru
    ? ['kehadiran', 'materi', 'quiz', 'tugas']
    : ['materi', 'quiz', 'tugas'];

  const tabLabels = { kehadiran: '✅ Kehadiran', materi: '📄 Materi', quiz: '📝 Quiz', tugas: '📤 Tugas' };

  return (
    <div>
      <button onClick={onBack} className="text-primary hover:underline text-sm mb-4">← Kembali</button>
      <div className="card p-6 mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
        <h2 className="text-xl font-bold text-primary">
          Pertemuan ke-{pertemuan.pertemuan_ke}: {pertemuan.topik || 'Tanpa Topik'}
        </h2>
        <p className="text-text-light mt-1">
          📅 {pertemuan.tanggal?.split('T')[0]} • 🏫 {pertemuan.jadwal?.kelas?.nama} • 📚 {pertemuan.jadwal?.mata_pelajaran?.nama}
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-text-light hover:text-text'}`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {tab === 'kehadiran' && <TabKehadiran pertemuan={pertemuan} siswaList={siswaList} onRefresh={onRefresh} />}
      {tab === 'materi' && <TabMateri pertemuan={pertemuan} isGuru={isGuru} onRefresh={onRefresh} />}
      {tab === 'quiz' && <TabQuiz pertemuan={pertemuan} isGuru={isGuru} onRefresh={onRefresh} />}
      {tab === 'tugas' && <TabTugas pertemuan={pertemuan} isGuru={isGuru} onRefresh={onRefresh} />}
    </div>
  );
}

// ── Tab: Kehadiran ──
function TabKehadiran({ pertemuan, siswaList, onRefresh }) {
  const [kehadiranMap, setKehadiranMap] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = {};
    (pertemuan.kehadiran || []).forEach(k => { map[k.siswa_id] = k.status; });
    siswaList.forEach(s => { if (!map[s.id]) map[s.id] = 'hadir'; });
    setKehadiranMap(map);
  }, [pertemuan, siswaList]);

  async function save() {
    setSaving(true);
    const data = {
      pertemuan_id: pertemuan.id,
      kehadiran: Object.entries(kehadiranMap).map(([siswaId, status]) => ({
        siswa_id: Number(siswaId),
        status,
        keterangan: '',
      })),
    };
    await elearningService.inputKehadiran(data);
    setSaving(false);
    onRefresh();
  }

  if (siswaList.length === 0) return <div className="card p-8 text-center text-text-light">Tidak ada siswa di kelas ini</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={save} className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : '💾 Simpan Kehadiran'}</button>
      </div>
      <div className="card overflow-hidden">
        <table className="table-auto">
          <thead><tr><th>No</th><th>Nama</th><th>Status</th></tr></thead>
          <tbody>
            {siswaList.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td className="font-medium">{s.nama}</td>
                <td>
                  <select value={kehadiranMap[s.id] || 'hadir'}
                    onChange={e => setKehadiranMap(p => ({ ...p, [s.id]: e.target.value }))}
                    className="input-field w-32 text-sm">
                    <option value="hadir">✅ Hadir</option>
                    <option value="izin">📝 Izin</option>
                    <option value="sakit">🏥 Sakit</option>
                    <option value="alfa">❌ Alfa</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Materi ──
function TabMateri({ pertemuan, isGuru, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const materi = pertemuan.materi || [];

  return (
    <div>
      {isGuru && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">➕ Tambah Materi</button>
        </div>
      )}
      {showForm && <AddMateriForm pertemuanId={pertemuan.id} onDone={() => { setShowForm(false); onRefresh(); }} />}
      {materi.length === 0 ? (
        <div className="card p-8 text-center text-text-light">Belum ada materi</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {materi.map(m => (
            <div key={m.id} className="card p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{m.tipe === 'video' ? '🎥' : m.tipe === 'link' ? '🔗' : '📄'}</span>
                <div>
                  <div className="font-semibold text-text">{m.judul}</div>
                  <span className="text-xs text-text-light uppercase">{m.tipe}</span>
                </div>
              </div>
              {m.deskripsi && <p className="text-sm text-text-light mb-2">{m.deskripsi}</p>}
              {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline">Buka Link →</a>}
              {m.file_path && <span className="text-sm text-text-light">📎 {m.file_path}</span>}
              {isGuru && (
                <button onClick={async () => { await elearningService.deleteMateri(m.id); onRefresh(); }}
                  className="text-error text-xs hover:underline mt-2">Hapus</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMateriForm({ pertemuanId, onDone }) {
  const [form, setForm] = useState({ judul: '', tipe: 'dokumen', url: '', deskripsi: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await elearningService.createMateri({ ...form, pertemuan_id: pertemuanId });
    setSaving(false);
    onDone();
  }

  return (
    <div className="card p-4 mb-4 bg-gray-50">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium">Tipe</label>
            <select value={form.tipe} onChange={e => setForm(p => ({ ...p, tipe: e.target.value }))} className="input-field">
              <option value="dokumen">Dokumen</option>
              <option value="video">Video</option>
              <option value="link">Link</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium">Judul</label>
            <input value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))}
              className="input-field" required />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">{form.tipe === 'link' ? 'URL' : 'URL (YouTube, Google Drive, dll)'}</label>
          <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
            className="input-field" placeholder="https://..." />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onDone} className="btn-secondary text-sm">Batal</button>
          <button type="submit" className="btn-primary text-sm" disabled={saving}>Simpan</button>
        </div>
      </form>
    </div>
  );
}

// ── Tab: Quiz ──
function TabQuiz({ pertemuan, isGuru, onRefresh }) {
  const [quizList, setQuizList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    elearningService.getQuiz({ pertemuan_id: pertemuan.id }).then(res => setQuizList(res.data || []));
  }, [pertemuan]);

  if (selectedQuiz) return <QuizDetail quizId={selectedQuiz.id} isGuru={isGuru}
    onBack={() => { setSelectedQuiz(null); onRefresh(); }} />;

  return (
    <div>
      {isGuru && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">➕ Buat Quiz</button>
        </div>
      )}
      {showForm && <AddQuizForm pertemuanId={pertemuan.id} onDone={() => { setShowForm(false); onRefresh(); }} />}
      {quizList.length === 0 ? (
        <div className="card p-8 text-center text-text-light">Belum ada quiz</div>
      ) : (
        <div className="space-y-3">
          {quizList.map(q => (
            <button key={q.id} onClick={() => setSelectedQuiz(q)}
              className="card p-4 w-full text-left hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-text">📝 {q.judul}</div>
                  <div className="text-xs text-text-light mt-1">
                    {q.soal?.length || 0} soal • {q.durasi_menit} menit • Deadline: {q.deadline?.split('T')[0] || '-'}
                  </div>
                </div>
                {isGuru && (
                  <button onClick={async (e) => { e.stopPropagation(); await elearningService.deleteQuiz(q.id); onRefresh(); }}
                    className="text-error text-xs hover:underline">🗑️</button>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddQuizForm({ pertemuanId, onDone }) {
  const [form, setForm] = useState({
    judul: '', deskripsi: '', deadline: '', durasi_menit: 30,
    soal: [{ nomor: 1, pertanyaan: '', pilihan_a: '', pilihan_b: '', pilihan_c: '', pilihan_d: '', jawaban_benar: 'a', bobot: 10 }],
  });
  const [saving, setSaving] = useState(false);

  function addSoal() {
    setForm(p => ({ ...p, soal: [...p.soal, { nomor: p.soal.length + 1, pertanyaan: '', pilihan_a: '', pilihan_b: '', pilihan_c: '', pilihan_d: '', jawaban_benar: 'a', bobot: 10 }] }));
  }
  function updateSoal(idx, field, value) {
    setForm(p => {
      const s = [...p.soal];
      s[idx] = { ...s[idx], [field]: value };
      return { ...p, soal: s };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await elearningService.createQuiz({ ...form, pertemuan_id: pertemuanId });
    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Buat Quiz Baru</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium">Judul Quiz</label>
              <input value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))}
                className="input-field" required />
            </div>
            <div>
              <label className="text-sm font-medium">Durasi (menit)</label>
              <input type="number" value={form.durasi_menit}
                onChange={e => setForm(p => ({ ...p, durasi_menit: Number(e.target.value) }))}
                className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Deadline</label>
            <input type="datetime-local" value={form.deadline}
              onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
              className="input-field w-64" />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Soal ({form.soal.length})</h4>
            {form.soal.map((s, idx) => (
              <div key={idx} className="p-3 mb-3 bg-gray-50 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <span className="text-sm font-bold text-primary">#{s.nomor}</span>
                  <input value={s.pertanyaan} onChange={e => updateSoal(idx, 'pertanyaan', e.target.value)}
                    className="input-field flex-1" placeholder="Pertanyaan..." required />
                  <input type="number" value={s.bobot} onChange={e => updateSoal(idx, 'bobot', Number(e.target.value))}
                    className="input-field w-16 text-sm" title="Bobot" />
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {['a','b','c','d'].map(opt => (
                    <div key={opt} className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase w-4">{opt}.</span>
                      <input value={s[`pilihan_${opt}`]} onChange={e => updateSoal(idx, `pilihan_${opt}`, e.target.value)}
                        className="input-field flex-1 text-sm" placeholder={`Pilihan ${opt.toUpperCase()}`} required />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-medium">Jawaban Benar:</label>
                  <select value={s.jawaban_benar} onChange={e => updateSoal(idx, 'jawaban_benar', e.target.value)}
                    className="input-field w-20 text-sm ml-2">
                    {['a','b','c','d'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button type="button" onClick={addSoal} className="btn-secondary text-sm">➕ Tambah Soal</button>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onDone} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Quiz'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuizDetail({ quizId, isGuru, onBack }) {
  const [quiz, setQuiz] = useState(null);
  const [jawaban, setJawaban] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [jawabanSiswa, setJawabanSiswa] = useState([]);

  useEffect(() => {
    elearningService.getQuizById(quizId).then(res => setQuiz(res.data));
    if (isGuru) {
      elearningService.getQuizJawaban(quizId).then(res => setJawabanSiswa(res.data || []));
    }
  }, [quizId, isGuru]);

  if (!quiz) return <LoadingSpinner />;

  async function submitQuiz() {
    const data = { quiz_id: quiz.id, jawaban };
    const res = await elearningService.submitQuiz(data);
    setSubmitted(res.data || res);
  }

  return (
    <div>
      <button onClick={onBack} className="text-primary hover:underline text-sm mb-4">← Kembali</button>
      <div className="card p-6 mb-4">
        <h2 className="text-xl font-bold">📝 {quiz.judul}</h2>
        <p className="text-text-light text-sm mt-1">
          {quiz.soal?.length || 0} soal • {quiz.durasi_menit} menit
          {quiz.deadline && <> • Deadline: {quiz.deadline?.split('T')[0]}</>}
        </p>
      </div>

      {isGuru ? (
        <div>
          <h4 className="font-semibold mb-3">📊 Rekap Jawaban Siswa</h4>
          {jawabanSiswa.length === 0 ? (
            <div className="card p-8 text-center text-text-light">Belum ada yang mengerjakan</div>
          ) : (
            <table className="table-auto card overflow-hidden">
              <thead><tr><th>Siswa</th><th>Nilai</th><th>Dikumpulkan</th></tr></thead>
              <tbody>
                {jawabanSiswa.map(j => (
                  <tr key={j.id}>
                    <td className="font-medium">{j.siswa?.nama || '-'}</td>
                    <td><span className="badge badge-info">{j.nilai}</span></td>
                    <td className="text-sm">{j.selesai_pada?.split('T')[0] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : submitted ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <div className="text-2xl font-bold text-success mb-2">Jawaban Terkirim!</div>
          <p className="text-lg">Nilai: <strong>{submitted.nilai}</strong></p>
          <p className="text-text-light">Benar {submitted.benar} dari {submitted.total_soal} soal</p>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); submitQuiz(); }} className="space-y-6">
          {quiz.soal?.map((s, idx) => (
            <div key={s.id} className="card p-4">
              <p className="font-semibold mb-3">{s.nomor}. {s.pertanyaan}</p>
              <div className="space-y-2">
                {['a','b','c','d'].map(opt => (
                  <label key={opt} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="radio" name={`q${s.nomor}`} value={opt}
                      checked={jawaban[String(s.nomor)] === opt}
                      onChange={() => setJawaban(p => ({ ...p, [String(s.nomor)]: opt }))}
                      className="w-4 h-4" />
                    <span className="text-sm">{opt.toUpperCase()}. {s[`pilihan_${opt}`]}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="submit" className="btn-primary w-full" disabled={Object.keys(jawaban).length < (quiz.soal?.length || 0)}>
            Kirim Jawaban
          </button>
        </form>
      )}
    </div>
  );
}

// ── Tab: Tugas ──
function TabTugas({ pertemuan, isGuru, onRefresh }) {
  const [tugasList, setTugasList] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    elearningService.getTugas(pertemuan.id).then(res => setTugasList(res.data || []));
  }, [pertemuan]);

  return (
    <div>
      {isGuru && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">➕ Buat Tugas</button>
        </div>
      )}
      {showForm && <AddTugasForm pertemuanId={pertemuan.id} onDone={() => { setShowForm(false); onRefresh(); }} />}
      {tugasList.length === 0 ? (
        <div className="card p-8 text-center text-text-light">Belum ada tugas</div>
      ) : (
        <div className="space-y-4">
          {tugasList.map(t => (
            <div key={t.id} className="card p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold text-text">📤 {t.judul}</div>
                  <div className="text-sm text-text-light">{t.deskripsi}</div>
                  <div className="text-xs text-text-light mt-1">Deadline: {t.deadline?.split('T')[0] || '-'}</div>
                </div>
                {isGuru && (
                  <button onClick={async () => { await elearningService.deleteTugas(t.id); onRefresh(); }}
                    className="text-error text-sm hover:underline">🗑️ Hapus</button>
                )}
              </div>
              {isGuru && (t.pengumpulan || []).length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm font-medium mb-2">📥 Pengumpulan:</div>
                  {t.pengumpulan.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                      <span>{p.siswa?.nama || '-'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs">{p.dikumpulkan_pada?.split('T')[0]}</span>
                        <input type="number" defaultValue={p.nilai || ''}
                          onBlur={e => elearningService.nilaiPengumpulan(p.id, Number(e.target.value))}
                          className="input-field w-16 text-sm" placeholder="Nilai" step="0.01" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isGuru && <UploadTugas tugasId={t.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddTugasForm({ pertemuanId, onDone }) {
  const [form, setForm] = useState({ judul: '', deskripsi: '', deadline: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await elearningService.createTugas({ ...form, pertemuan_id: pertemuanId });
    setSaving(false);
    onDone();
  }

  return (
    <div className="card p-4 mb-4 bg-gray-50">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))}
          className="input-field" placeholder="Judul tugas..." required />
        <textarea value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))}
          className="input-field" rows={2} placeholder="Deskripsi..." />
        <div className="flex items-center gap-3">
          <input type="datetime-local" value={form.deadline}
            onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
            className="input-field w-64" />
          <button type="submit" className="btn-primary" disabled={saving}>Simpan</button>
          <button type="button" onClick={onDone} className="btn-secondary">Batal</button>
        </div>
      </form>
    </div>
  );
}

function UploadTugas({ tugasId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('tugas_id', tugasId);
    fd.append('file', file);
    await elearningService.uploadTugas(fd);
    setUploading(false);
    setDone(true);
  }

  if (done) return <div className="text-green-600 text-sm">✅ Tugas berhasil dikumpulkan!</div>;

  return (
    <form onSubmit={handleUpload} className="flex items-center gap-2 mt-2 pt-2 border-t">
      <input type="file" onChange={e => setFile(e.target.files[0])} className="text-sm" />
      <button type="submit" className="btn-primary text-sm" disabled={!file || uploading}>
        {uploading ? 'Upload...' : '📤 Kumpulkan'}
      </button>
    </form>
  );
}
