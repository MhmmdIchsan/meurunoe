import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from '../../utils/notifications';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Load & listen for changes
  useEffect(() => {
    setNotifications(getNotifications());

    const handleUpdate = () => setNotifications(getNotifications());
    window.addEventListener('notificationAdded', handleUpdate);
    return () => window.removeEventListener('notificationAdded', handleUpdate);
  }, []);

  function handleMarkAsRead(id) {
    setNotifications(markAsRead(id));
  }

  function handleMarkAllAsRead() {
    setNotifications(markAllAsRead());
  }

  function handleClearAll() {
    clearAllNotifications();
    setNotifications([]);
    setShowDropdown(false);
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
              <h3 className="font-semibold text-text">Notifikasi</h3>
              {notifications.length > 0 && (
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-primary hover:underline"
                    >
                      Tandai Semua Dibaca
                    </button>
                  )}
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-error hover:underline"
                  >
                    Hapus Semua
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-text-light">
                  <div className="text-4xl mb-2">🔕</div>
                  <p>Tidak ada notifikasi</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-border hover:bg-gray-50 cursor-pointer ${
                      !notif.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleMarkAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{notif.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text text-sm">{notif.title}</p>
                        <p className="text-xs text-text-light mt-1">{notif.message}</p>
                        <p className="text-xs text-text-light mt-2">{formatTime(notif.timestamp)}</p>
                        {notif.link && (
                          <Link
                            to={notif.link}
                            className="text-xs text-primary hover:underline mt-2 inline-block"
                            onClick={() => setShowDropdown(false)}
                          >
                            Lihat Detail →
                          </Link>
                        )}
                      </div>
                      {!notif.read && (
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
  const now = new Date();
  const date = new Date(timestamp);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} menit yang lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari yang lalu`;

  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}