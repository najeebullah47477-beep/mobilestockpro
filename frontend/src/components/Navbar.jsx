import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useNotificationStore from '../store/notificationStore'

const roleBadgeColors = {
  admin: 'bg-danger-500',
  manager: 'bg-warning-500',
  staff: 'bg-primary-500',
}

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleColor = roleBadgeColors[user?.role] || 'bg-gray-500'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Left side: hamburger + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none"
          aria-label="Toggle sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">📱</span>
          <h1 className="text-lg font-bold text-gray-800 hidden sm:block">MobileStock Pro</h1>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none"
          aria-label="Notifications"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-danger-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-200" />

        {/* User info */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-700 leading-tight">
              {user?.full_name || 'User'}
            </p>
          </div>
          <span
            className={`${roleColor} text-white text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize`}
          >
            {user?.role || 'staff'}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="ml-1 p-2 rounded-lg text-gray-400 hover:text-danger-600 hover:bg-danger-50 focus:outline-none transition-colors duration-150"
          aria-label="Logout"
          title="Logout"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  )
}
