import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Pagination from '../components/Pagination'
import PermissionGuard from '../components/PermissionGuard'
import api from '../api/axios'
import useNotificationStore from '../store/notificationStore'

dayjs.extend(relativeTime)

const typeIcons = {
  low_stock: '⚠️',
  general: '📋',
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [highlightedId, setHighlightedId] = useState(null)
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount)

  const fetchNotifications = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: 20 }
      const res = await api.get('/notifications', { params })
      if (res.data.success) {
        setNotifications(res.data.data.notifications)
        setTotalPages(res.data.data.total_pages)
        setPage(res.data.data.current_page)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications(1)
    fetchUnreadCount()
  }, [])

  const handleMarkAsRead = async (notification) => {
    if (notification.is_read) return
    try {
      await api.put(`/notifications/${notification.id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
      setUnreadCount(Math.max(0, unreadCount - 1))
      setHighlightedId(notification.id)
      setTimeout(() => setHighlightedId(null), 1500)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark as read')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark all as read')
    }
  }

  const handleDelete = async (e, notification) => {
    e.stopPropagation()
    try {
      await api.delete(`/notifications/${notification.id}`)
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      if (!notification.is_read) {
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
      toast.success('Notification deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete notification')
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Notifications</h1>
        {unreadNotifications > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
          >
            Mark All Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-lg font-medium">No notifications</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleMarkAsRead(notification)}
                className={`cursor-pointer bg-white rounded-xl border p-4 flex items-start gap-4 transition-all duration-200 ${
                  highlightedId === notification.id
                    ? 'border-primary-300 bg-primary-50 shadow-sm'
                    : notification.is_read
                    ? 'border-gray-200'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">
                  {typeIcons[notification.type] || '📋'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {dayjs(notification.created_at).fromNow()}
                  </p>
                </div>
                <PermissionGuard roles={['admin']}>
                  <button
                    onClick={(e) => handleDelete(e, notification)}
                    className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
                    aria-label="Delete notification"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </PermissionGuard>
              </div>
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={(p) => {
              setPage(p)
              fetchNotifications(p)
            }}
          />
        </>
      )}
    </div>
  )
}
