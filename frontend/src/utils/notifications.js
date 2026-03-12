/**
 * Notification Utility - Per User
 * Notifikasi dipisah per user menggunakan key: notifications_{userId}
 */

/**
 * Ambil storage key berdasarkan user ID
 */
function getStorageKey() {
  try {
    const stored = localStorage.getItem('user');
    if (!stored) return 'notifications_guest';
    const user = JSON.parse(stored);
    const userId = user?.id || user?.user_id || 'guest';
    return `notifications_${userId}`;
  } catch {
    return 'notifications_guest';
  }
}

/**
 * Tambah notifikasi baru
 * @param {Object} notification - { title, message, icon, link? }
 */
export function addNotification(notification) {
  const key = getStorageKey();

  const notif = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    read: false,
    icon: notification.icon || '📢',
    title: notification.title,
    message: notification.message,
    link: notification.link || null,
  };

  const stored = localStorage.getItem(key);
  const notifications = stored ? JSON.parse(stored) : [];

  notifications.unshift(notif);
  const limited = notifications.slice(0, 50);

  localStorage.setItem(key, JSON.stringify(limited));
  window.dispatchEvent(new CustomEvent('notificationAdded'));

  return notif;
}

/**
 * Ambil semua notifikasi user ini
 */
export function getNotifications() {
  const key = getStorageKey();
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Tandai satu notifikasi sebagai sudah dibaca
 */
export function markAsRead(id) {
  const key = getStorageKey();
  const notifications = getNotifications();
  const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
  localStorage.setItem(key, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('notificationAdded'));
  return updated;
}

/**
 * Tandai semua notifikasi sebagai sudah dibaca
 */
export function markAllAsRead() {
  const key = getStorageKey();
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  localStorage.setItem(key, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('notificationAdded'));
  return updated;
}

/**
 * Hapus semua notifikasi user ini
 */
export function clearAllNotifications() {
  const key = getStorageKey();
  localStorage.removeItem(key);
  window.dispatchEvent(new CustomEvent('notificationAdded'));
}

/**
 * Get unread count
 */
export function getUnreadCount() {
  return getNotifications().filter(n => !n.read).length;
}

// ─── Shortcut helpers ────────────────────────────────────────────────────────

export function notifyAbsensiSaved(kelasNama, jumlahSiswa) {
  return addNotification({
    icon: '✅',
    title: 'Absensi Berhasil Disimpan',
    message: `Absensi kelas ${kelasNama} untuk ${jumlahSiswa} siswa telah disimpan.`,
    link: '/wali-kelas/monitoring',
  });
}

export function notifyJadwalBentrok(message) {
  return addNotification({
    icon: '⚠️',
    title: 'Jadwal Bentrok',
    message,
    link: '/jadwal',
  });
}

export function notifyAbsensiPending(mapelNama, kelasNama) {
  return addNotification({
    icon: '⏰',
    title: 'Reminder: Input Absensi',
    message: `Jangan lupa input absensi ${mapelNama} untuk kelas ${kelasNama} hari ini.`,
    link: '/absensi',
  });
}

export function notifyNilaiUpdated(mapelNama, kelasNama) {
  return addNotification({
    icon: '📝',
    title: 'Nilai Berhasil Disimpan',
    message: `Nilai ${mapelNama} kelas ${kelasNama} telah diperbarui.`,
    link: '/nilai',
  });
}

export function notifyKehadiranRendah(namaSiswa, persentase) {
  return addNotification({
    icon: '🚨',
    title: 'Peringatan: Kehadiran Rendah',
    message: `${namaSiswa} memiliki kehadiran ${persentase.toFixed(1)}% (di bawah 80%).`,
    link: '/wali-kelas/monitoring',
  });
}

export function notifyRaporReady(namaSiswa, semester) {
  return addNotification({
    icon: '📄',
    title: 'Rapor Tersedia',
    message: `Rapor ${namaSiswa} semester ${semester} sudah bisa diunduh.`,
    link: '/rapor',
  });
}

export function notifyGeneral(title, message, link = null) {
  return addNotification({ icon: '📢', title, message, link });
}