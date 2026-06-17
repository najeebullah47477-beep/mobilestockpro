const colorMap = {
  blue: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-100',
    text: 'text-blue-600',
  },
  green: {
    border: 'border-l-green-500',
    bg: 'bg-green-100',
    text: 'text-green-600',
  },
  red: {
    border: 'border-l-red-500',
    bg: 'bg-red-100',
    text: 'text-red-600',
  },
  yellow: {
    border: 'border-l-yellow-500',
    bg: 'bg-yellow-100',
    text: 'text-yellow-600',
  },
}

export default function StatCard({ title, value, subtitle, icon, color = 'blue', trend }) {
  const styles = colorMap[color] || colorMap.blue

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${styles.border} p-5`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isUp ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span className={`text-sm font-medium ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-full ${styles.bg} flex items-center justify-center flex-shrink-0`}>
          <span className={`text-lg ${styles.text}`}>{icon}</span>
        </div>
      </div>
    </div>
  )
}
