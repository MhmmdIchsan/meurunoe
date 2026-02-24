/**
 * Notification Utility
 * Mengelola notifikasi yang disimpan di localStorage
 */

/**
 * Tambah notifikasi baru
 * @param {Object} notification - { title, message, icon, link? }
 */
export function addNotification(notification) {
  const notif = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    read: false,
    icon: notification.icon || '📢',
    title: notification.title,
    message: notification.message,
    link: notification.link || null,
  };

  // Load existing notifications
  const stored = localStorage.getItem('notifications');
  const notifications = stored ? JSON.parse(stored) : [];

  // Add new notification at the beginning
  notifications.unshift(notif);

  // Keep only last 50 notifications
  const limited = notifications.slice(0, 50);

  // Save to localStorage
  localStorage.setItem('notifications', JSON.stringify(limited));

  // Dispatch custom event untuk update NotificationBell
  window.dispatchEvent(new CustomEvent('notificationAdded'));

  return notif;
}

/**
 * Notifikasi untuk absensi berhasil
 */
export function notifyAbsensiSaved(kelasNama, jumlahSiswa) {
  return addNotification({
    icon: '✅',
    title: 'Absensi Berhasil Disimpan',
    message: `Absensi kelas ${kelasNama} untuk ${jumlahSiswa} siswa telah disimpan.`,
    link: '/wali-kelas/monitoring',
  });
}

/**
 * Notifikasi untuk jadwal bentrok
 */
export function notifyJadwalBentrok(message) {
  return addNotification({
    icon: '⚠️',
    title: 'Jadwal Bentrok',
    message: message,
    link: '/jadwal',
  });
}

/**
 * Notifikasi untuk guru belum input absensi
 */
export function notifyAbsensiPending(mapelNama, kelasNama) {
  return addNotification({
    icon: '⏰',
    title: 'Reminder: Input Absensi',
    message: `Jangan lupa input absensi ${mapelNama} untuk kelas ${kelasNama} hari ini.`,
    link: '/absensi',
  });
}

/**
 * Notifikasi untuk nilai sudah di-input
 */
export function notifyNilaiUpdated(mapelNama, kelasNama) {
  return addNotification({
    icon: '📝',
    title: 'Nilai Berhasil Disimpan',
    message: `Nilai ${mapelNama} kelas ${kelasNama} telah diperbarui.`,
    link: '/nilai',
  });
}

/**
 * Notifikasi untuk siswa dengan kehadiran rendah
 */
export function notifyKehadiranRendah(namaSiswa, persentase) {
  return addNotification({
    icon: '🚨',
    title: 'Peringatan: Kehadiran Rendah',
    message: `${namaSiswa} memiliki kehadiran ${persentase.toFixed(1)}% (di bawah 80%).`,
    link: '/wali-kelas/monitoring',
  });
}

/**
 * Notifikasi untuk rapor tersedia
 */
export function notifyRaporReady(namaSiswa, semester) {
  return addNotification({
    icon: '📄',
    title: 'Rapor Tersedia',
    message: `Rapor ${namaSiswa} semester ${semester} sudah bisa diunduh.`,
    link: '/rapor',
  });
}

/**
 * Notifikasi umum
 */
export function notifyGeneral(title, message, link = null) {
  return addNotification({
    icon: '📢',
    title: title,
    message: message,
    link: link,
  });
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
  localStorage.removeItem('notifications');
  window.dispatchEvent(new CustomEvent('notificationAdded'));
}

/**
 * Get unread count
 */
export function getUnreadCount() {
  const stored = localStorage.getItem('notifications');
  if (!stored) return 0;
  const notifications = JSON.parse(stored);
  return notifications.filter(n => !n.read).length;
}