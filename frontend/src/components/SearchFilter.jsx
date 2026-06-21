import { useState, useEffect } from 'react'

export default function SearchFilter({
  searchValue,
  onSearchChange,
  placeholder = 'Search...',
  filters = [],
}) {
  const [localValue, setLocalValue] = useState(searchValue || '')

  useEffect(() => {
    setLocalValue(searchValue || '')
  }, [searchValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== searchValue) {
        onSearchChange(localValue)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localValue])

  const handleClear = () => {
    setLocalValue('')
    onSearchChange('')
  }

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
      <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">
          🔍
        </span>
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filter.value || ''}
          onChange={(e) => filter.onChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value || opt} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
      ))}
    </div>
  )
}
