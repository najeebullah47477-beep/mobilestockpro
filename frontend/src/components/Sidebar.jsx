import { NavLink, useLocation } from 'react-router-dom'
import useNotificationStore from '../store/notificationStore'
import useAuthStore from '../store/authStore'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  {
    section: 'INVENTORY',
    items: [
      { label: 'Products', path: '/products', icon: '📱' },
      { label: 'Categories', path: '/categories', icon: '📂' },
      { label: 'Brands', path: '/brands', icon: '🏷️' },
    ],
  },
  {
    section: 'PEOPLE',
    items: [
      { label: 'Suppliers', path: '/suppliers', icon: '🚚' },
      { label: 'Customers', path: '/customers', icon: '👥' },
    ],
  },
  {
    section: 'TRANSACTIONS',
    items: [
      { label: 'Sales', path: '/sales', icon: '💰' },
      { label: 'Purchases', path: '/purchases', icon: '📥' },
      { label: 'Expenses', path: '/expenses', icon: '💸' },
    ],
  },
  { label: 'Warranties', path: '/warranties', icon: '🛡️' },
  { label: 'Reports', path: '/reports', icon: '📈' },
  { label: 'Notifications', path: '/notifications', icon: '🔔', badge: true },
  { label: 'Settings', path: '/settings', icon: '⚙️' },
  {
    section: 'SYSTEM',
    items: [
      { label: 'Delete History', path: '/delete-history', icon: '🗑️' },
    ],
  },
]

function isActivePath(locationPathname, itemPath) {
  if (itemPath === '/dashboard') {
    return locationPathname === '/dashboard'
  }
  return locationPathname.startsWith(itemPath)
}

export default function Sidebar({ open, setOpen }) {
  const location = useLocation()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const currentUser = useAuthStore((s) => s.user)

  const roleBadgeColors = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-blue-100 text-blue-700',
    staff: 'bg-green-100 text-green-700',
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
      isActive
        ? 'bg-primary-50 text-primary-700 font-semibold'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`

  const renderLink = (item) => {
    const active = isActivePath(location.pathname, item.path)
    const showBadge = item.badge && unreadCount > 0

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === '/dashboard'}
        className={linkClass}
        onClick={() => setOpen(false)}
      >
        <span className="text-lg w-6 text-center flex-shrink-0">{item.icon}</span>
        <span className="truncate">{item.label}</span>
        {showBadge && (
          <span className="ml-auto bg-danger-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {active && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-600" />
        )}
      </NavLink>
    )
  }

  const isAdmin = currentUser?.role === 'admin'

  const visibleNavItems = navItems.filter((item) => {
    if (item.section === 'SYSTEM') return isAdmin
    return true
  })

  const sidebarContent = (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {visibleNavItems.map((item, index) => {
        if (item.items) {
          return (
            <div key={item.section} className="mb-3">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                {item.section}
              </p>
              <div className="space-y-0.5">
                {item.items.map((sub) => renderLink(sub))}
              </div>
            </div>
          )
        }
        return (
          <div key={item.path || index}>
            {renderLink(item)}
          </div>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-200 flex-shrink-0">
          <span className="text-2xl">📱</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg text-gray-800 truncate">MobileStock Pro</div>
            {currentUser && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeColors[currentUser.role] || 'bg-gray-100 text-gray-700'}`}>
                {currentUser.role}
              </span>
            )}
          </div>
        </div>

        {sidebarContent}
      </aside>
    </>
  )
}
