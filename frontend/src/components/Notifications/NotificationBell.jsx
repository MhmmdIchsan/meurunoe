import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { notificationService } from '../../services/profileService';

const POLL_INTERVAL = 60_000; // polling setiap 60 detik

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [showDropdown, setShowDropdown]   = useState(false);
  const [loading, setLoading]             = useState(false);

  // Fetch dari backend
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationService.getAll({ limit: 30 });
      const data = res.data || res;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count ?? 0);
    } catch {
      // Gagal fetch — tidak tampilkan error di UI, cukup silent
    }
  }, []);

  // Mount + polling
  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  // Fetch ulang saat dropdown dibuka
  useEffect(() => {
    if (showDropdown) fetchNotifications();
  }, [showDropdown, fetchNotifications]);

  async function handleMarkRead(id) {
    try {
      await notificationService.markRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  }

  async function handleDeleteAll() {
    if (!window.confirm('Hapus semua notifikasi?')) return;
    try {
      await notificationService.deleteAll();
      setNotifications([]);
      setUnreadCount(0);
      setShowDropdown(false);
    } catch { /* silent */ }
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />

          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-border z-20">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-text">
                Notifikasi
                {unreadCount > 0 && (
                  <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h3>
              <div className="flex gap-3">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                    Tandai Semua Dibaca
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={handleDeleteAll} className="text-xs text-error hover:underline">
                    Hapus Semua
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-text-light">
                  <div className="text-4xl mb-2">🔕</div>
                  <p className="text-sm">Tidak ada notifikasi</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-border hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notif.is_read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{notif.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text text-sm">{notif.title}</p>
                        <p className="text-xs text-text-light mt-0.5 leading-relaxed">{notif.message}</p>
                        <p className="text-xs text-text-light mt-1.5">{formatTime(notif.created_at)}</p>
                        {notif.link && (
                          <Link
                            to={notif.link}
                            className="text-xs text-primary hover:underline mt-1 inline-block"
                            onClick={() => setShowDropdown(false)}
                          >
                            Lihat Detail →
                          </Link>
                        )}
                      </div>
                      {!notif.is_read && (
                        <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const now  = new Date();
  const date = new Date(timestamp);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60)     return 'Baru saja';
  if (diff < 3600)   return `${Math.floor(diff / 60)} menit yang lalu`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} jam yang lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari yang lalu`;

  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}