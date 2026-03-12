import { useState, useRef, useEffect } from 'react';
import { useAuth, extractRole } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';

const ROLE_LABEL = {
  admin: 'Admin Sekolah',
  'kepala sekolah': 'Kepala Sekolah',
  kepala_sekolah: 'Kepala Sekolah',
  guru: 'Guru',
  'wali kelas': 'Wali Kelas',
  wali_kelas: 'Wali Kelas',
  siswa: 'Siswa',
  'orang tua': 'Orang Tua',
  orang_tua: 'Orang Tua',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(true);
  const [message, setMessage]     = useState({ type: '', text: '' });

  // Data profil dari backend
  const [profile, setProfile] = useState(null);

  // Form states
  const [profileForm, setProfileForm] = useState({ nama: '', telepon: '' });
  const [passwordForm, setPasswordForm] = useState({
    password_lama: '',
    password_baru: '',
    konfirmasi_password: '',
  });

  // Foto states
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoFile, setFotoFile]       = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // ─── Fetch profil dari backend ──────────────────────────────────────────
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await profileService.getProfile();
        const data = res.data || res;
        setProfile(data);
        setProfileForm({ nama: data.nama || '', telepon: data.telepon || '' });
      } catch {
        showMessage('error', 'Gagal memuat data profil');
      } finally {
        setFetching(false);
      }
    }
    loadProfile();
  }, []);

  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  const role      = extractRole(user);
  const roleLabel = ROLE_LABEL[role] || role || '-';
  const initials  = (profile?.nama || user?.nama || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const displayFoto = fotoPreview || profile?.foto_profil || null;

  // ─── Edit Profil ─────────────────────────────────────────────────────────
  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!profileForm.nama.trim()) {
      showMessage('error', 'Nama tidak boleh kosong');
      return;
    }
    setLoading(true);
    try {
      const res = await profileService.updateProfile({
        nama:    profileForm.nama.trim(),
        telepon: profileForm.telepon.trim(),
      });
      const updated = res.data || res;
      setProfile(prev => ({ ...prev, ...updated }));

      // Sync ke localStorage agar Header ikut update
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, nama: profileForm.nama.trim() }));
      window.dispatchEvent(new CustomEvent('userProfileUpdated'));

      showMessage('success', 'Profil berhasil diperbarui!');
    } catch (err) {
      showMessage('error', err?.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  }

  // ─── Ganti Password ───────────────────────────────────────────────────────
  async function handleChangePassword(e) {
    e.preventDefault();
    const { password_lama, password_baru, konfirmasi_password } = passwordForm;

    if (!password_lama || !password_baru || !konfirmasi_password) {
      showMessage('error', 'Semua field password harus diisi');
      return;
    }
    if (password_baru.length < 8) {
      showMessage('error', 'Password baru minimal 8 karakter');
      return;
    }
    if (password_baru !== konfirmasi_password) {
      showMessage('error', 'Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      // Gunakan endpoint yang sudah ada di auth controller
      await fetch('/api/v1/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ password_lama, password_baru }),
      }).then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.message || 'Gagal'); });
        return r.json();
      });

      setPasswordForm({ password_lama: '', password_baru: '', konfirmasi_password: '' });
      showMessage('success', 'Password berhasil diubah!');
    } catch (err) {
      showMessage('error', err.message || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  }

  // ─── Foto Profil ─────────────────────────────────────────────────────────
  function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage('error', 'File harus berupa gambar (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showMessage('error', 'Ukuran foto maksimal 2MB');
      return;
    }

    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSaveFoto() {
    if (!fotoFile) return;
    setUploadingFoto(true);
    try {
      const res  = await profileService.uploadFoto(fotoFile);
      const data = res.data || res;
      setProfile(prev => ({ ...prev, foto_profil: data.foto_profil }));
      setFotoPreview(null);
      setFotoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showMessage('success', 'Foto profil berhasil diperbarui!');
    } catch (err) {
      showMessage('error', err?.response?.data?.message || 'Gagal mengupload foto');
    } finally {
      setUploadingFoto(false);
    }
  }

  function handleCancelFoto() {
    setFotoPreview(null);
    setFotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleRemoveFoto() {
    if (!window.confirm('Hapus foto profil?')) return;
    setUploadingFoto(true);
    try {
      await profileService.deleteFoto();
      setProfile(prev => ({ ...prev, foto_profil: '' }));
      showMessage('success', 'Foto profil dihapus');
    } catch {
      showMessage('error', 'Gagal menghapus foto');
    } finally {
      setUploadingFoto(false);
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-text-light">
          <div className="text-3xl mb-2 animate-pulse">⏳</div>
          <p>Memuat profil...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Profil Saya</h1>
        <p className="text-text-light text-sm mt-1">Kelola informasi akun dan keamanan Anda</p>
      </div>

      {/* Alert */}
      {message.text && (
        <div className={`p-4 rounded-lg text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
        </div>
      )}

      {/* Profile Summary Card */}
      <div className="card p-6 flex items-center gap-6">
        <div className="relative flex-shrink-0">
          {displayFoto ? (
            <img
              src={displayFoto}
              alt="Foto Profil"
              className="w-20 h-20 rounded-full object-cover border-4 border-accent"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold border-4 border-accent">
              {initials}
            </div>
          )}
          {fotoPreview && (
            <span className="absolute -bottom-1 -right-1 bg-warning text-white text-xs px-1.5 py-0.5 rounded-full">
              Pratinjau
            </span>
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-bold text-text">{profile?.nama || '-'}</h2>
          <p className="text-text-light text-sm">{profile?.email || '-'}</p>
          {profile?.telepon && (
            <p className="text-text-light text-sm">📞 {profile.telepon}</p>
          )}
          <span className="inline-block mt-2 px-3 py-1 bg-accent/30 text-primary text-xs font-semibold rounded-full">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { id: 'profile',  label: '👤 Edit Profil' },
          { id: 'foto',     label: '🖼️ Foto Profil' },
          { id: 'password', label: '🔒 Ganti Password' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-light hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Edit Profil ── */}
      {activeTab === 'profile' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text mb-6">Informasi Profil</h3>
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Nama Lengkap <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={profileForm.nama}
                onChange={e => setProfileForm(p => ({ ...p, nama: e.target.value }))}
                className="input w-full"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Email</label>
              <input
                type="text"
                value={profile?.email || '-'}
                disabled
                className="input w-full bg-gray-50 text-text-light cursor-not-allowed"
              />
              <p className="text-xs text-text-light mt-1">Email tidak dapat diubah</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Nomor Telepon</label>
              <input
                type="tel"
                value={profileForm.telepon}
                onChange={e => setProfileForm(p => ({ ...p, telepon: e.target.value }))}
                className="input w-full"
                placeholder="Contoh: 08123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Role</label>
              <input
                type="text"
                value={roleLabel}
                disabled
                className="input w-full bg-gray-50 text-text-light cursor-not-allowed"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={loading} className="btn-primary px-6">
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tab: Foto Profil ── */}
      {activeTab === 'foto' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text mb-6">Foto Profil</h3>
          <div className="flex flex-col items-center gap-6">
            {/* Preview besar */}
            <div className="relative">
              {displayFoto ? (
                <img
                  src={displayFoto}
                  alt="Foto Profil"
                  className="w-36 h-36 rounded-full object-cover border-4 border-accent shadow-lg"
                />
              ) : (
                <div className="w-36 h-36 rounded-full bg-primary flex items-center justify-center text-white text-4xl font-bold border-4 border-accent shadow-lg">
                  {initials}
                </div>
              )}
              {fotoPreview && (
                <div className="absolute inset-0 rounded-full ring-4 ring-warning ring-offset-2 pointer-events-none" />
              )}
            </div>

            {/* Upload area */}
            <div
              className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-3">📁</div>
              <p className="text-text font-medium">Klik untuk pilih foto</p>
              <p className="text-text-light text-sm mt-1">JPG, PNG, WebP — Maksimal 2MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFotoChange}
              />
            </div>

            {/* Action buttons */}
            {fotoPreview ? (
              <div className="flex gap-3">
                <button
                  onClick={handleSaveFoto}
                  disabled={uploadingFoto}
                  className="btn-primary px-6"
                >
                  {uploadingFoto ? 'Mengupload...' : '✅ Simpan Foto'}
                </button>
                <button onClick={handleCancelFoto} className="btn-secondary px-6">
                  Batal
                </button>
              </div>
            ) : profile?.foto_profil ? (
              <button
                onClick={handleRemoveFoto}
                disabled={uploadingFoto}
                className="text-sm text-error hover:underline"
              >
                🗑️ Hapus foto profil
              </button>
            ) : null}

            <p className="text-xs text-text-light text-center">
              Foto disimpan di server dan dapat diakses dari perangkat manapun
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Ganti Password ── */}
      {activeTab === 'password' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text mb-6">Ganti Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Password Lama <span className="text-error">*</span>
              </label>
              <PasswordInput
                value={passwordForm.password_lama}
                onChange={v => setPasswordForm(p => ({ ...p, password_lama: v }))}
                placeholder="Masukkan password lama"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Password Baru <span className="text-error">*</span>
              </label>
              <PasswordInput
                value={passwordForm.password_baru}
                onChange={v => setPasswordForm(p => ({ ...p, password_baru: v }))}
                placeholder="Minimal 8 karakter"
              />
              {passwordForm.password_baru && (
                <PasswordStrength password={passwordForm.password_baru} />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Konfirmasi Password Baru <span className="text-error">*</span>
              </label>
              <PasswordInput
                value={passwordForm.konfirmasi_password}
                onChange={v => setPasswordForm(p => ({ ...p, konfirmasi_password: v }))}
                placeholder="Ulangi password baru"
              />
              {passwordForm.konfirmasi_password && (
                <p className={`text-xs mt-1 ${
                  passwordForm.password_baru === passwordForm.konfirmasi_password
                    ? 'text-success' : 'text-error'
                }`}>
                  {passwordForm.password_baru === passwordForm.konfirmasi_password
                    ? '✅ Password cocok' : '❌ Password tidak cocok'}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-accent rounded-lg p-4 text-sm text-text-light">
              <p className="font-medium text-text mb-1">Tips keamanan password:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Minimal 8 karakter</li>
                <li>Kombinasi huruf besar, kecil, dan angka</li>
                <li>Jangan gunakan informasi pribadi</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={loading} className="btn-primary px-6">
                {loading ? 'Menyimpan...' : 'Ubah Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input w-full pr-10"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-text"
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
}

function PasswordStrength({ password }) {
  let strength = 0;
  if (password.length >= 8)          strength++;
  if (password.length >= 12)         strength++;
  if (/[A-Z]/.test(password))        strength++;
  if (/[0-9]/.test(password))        strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const levels = [
    { label: 'Sangat Lemah', color: 'bg-red-500',    text: 'text-red-500' },
    { label: 'Lemah',        color: 'bg-orange-400',  text: 'text-orange-400' },
    { label: 'Cukup',        color: 'bg-yellow-400',  text: 'text-yellow-400' },
    { label: 'Kuat',         color: 'bg-blue-500',    text: 'text-blue-500' },
    { label: 'Sangat Kuat',  color: 'bg-green-500',   text: 'text-green-500' },
  ];
  const lvl = levels[Math.min(strength, 4)];

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i < strength ? lvl.color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className={`text-xs ${lvl.text}`}>{lvl.label}</p>
    </div>
  );
}