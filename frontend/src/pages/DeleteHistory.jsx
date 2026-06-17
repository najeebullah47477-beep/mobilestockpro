import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import StatCard from '../components/StatCard'
import api from '../api/axios'

dayjs.extend(relativeTime)

const MODULES = [
  { value: '', label: 'All Modules' },
  { value: 'Products', label: 'Products' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Purchases', label: 'Purchases' },
  { value: 'Customers', label: 'Customers' },
  { value: 'Suppliers', label: 'Suppliers' },
  { value: 'Expenses', label: 'Expenses' },
  { value: 'Categories', label: 'Categories' },
  { value: 'Brands', label: 'Brands' },
]

const MODULE_COLORS = {
  Products: 'bg-blue-100 text-blue-700',
  Sales: 'bg-green-100 text-green-700',
  Purchases: 'bg-orange-100 text-orange-700',
  Customers: 'bg-purple-100 text-purple-700',
  Suppliers: 'bg-yellow-100 text-yellow-700',
  Expenses: 'bg-red-100 text-red-700',
  Categories: 'bg-teal-100 text-teal-700',
  Brands: 'bg-pink-100 text-pink-700',
}

const CURRENCY_FIELDS = ['price', 'amount', 'cost', 'total', 'subtotal', 'balance', 'paid', 'due', 'discount', 'tax']
const DATE_FIELDS = ['date', 'created_at', 'updated_at', 'deleted_at', 'expense_date', 'sale_date', 'purchase_date']

function formatFieldValue(key, value) {
  if (value === null || value === undefined || value === '') return null
  const lowerKey = key.toLowerCase()
  if (CURRENCY_FIELDS.some(f => lowerKey.includes(f))) {
    const num = parseFloat(value)
    if (!isNaN(num)) return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  if (lowerKey === 'is_active') return value ? 'Yes' : 'No'
  if (lowerKey === 'stock_quantity' || lowerKey === 'quantity' || lowerKey === 'loyalty_points') return Number(value).toLocaleString()
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = dayjs(value)
    if (d.isValid()) return d.format('DD MMM YYYY, h:mm A')
  }
  return String(value)
}

function formatKeyName(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

const RESTORE_STATUSES = ['Not Restored', 'Restored']

export default function DeleteHistory() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [filters, setFilters] = useState({
    module: '',
    search: '',
    startDate: '',
    endDate: '',
    status: '',
  })

  const [viewModal, setViewModal] = useState({ open: false, record: null })
  const [restoreConfirm, setRestoreConfirm] = useState({ open: false, record: null })
  const [removeConfirm, setRemoveConfirm] = useState({ open: false, record: null })
  const [clearConfirm, setClearConfirm] = useState({ open: false, module: null })
  const [restoring, setRestoring] = useState(false)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await api.get('/delete-history/stats')
      if (res.data.success) {
        setStats(res.data.data)
      }
    } catch {
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchRecords = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: 20 }
      if (filters.module) params.module = filters.module
      if (filters.search) params.search = filters.search
      if (filters.startDate) params.start_date = filters.startDate
      if (filters.endDate) params.end_date = filters.endDate
      if (filters.status === 'restored') params.is_restored = 'true'
      if (filters.status === 'not_restored') params.is_restored = 'false'

      const res = await api.get('/delete-history', { params })
      if (res.data.success) {
        setRecords(res.data.data.records)
        setTotalPages(res.data.data.total_pages)
        setTotalItems(res.data.data.total_items)
        setPage(res.data.data.current_page)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    fetchRecords(1)
  }, [fetchRecords])

  const handleRestore = async () => {
    const record = restoreConfirm.record
    if (!record) return
    setRestoring(true)
    try {
      const res = await api.post(`/delete-history/${record.id}/restore`)
      if (res.data.success) {
        toast.success(res.data.message || 'Record restored successfully')
        setRestoreConfirm({ open: false, record: null })
        fetchRecords(page)
        fetchStats()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore record')
    } finally {
      setRestoring(false)
    }
  }

  const handleRemove = async () => {
    const record = removeConfirm.record
    if (!record) return
    try {
      const res = await api.delete(`/delete-history/${record.id}`)
      if (res.data.success) {
        toast.success('History record removed')
        setRemoveConfirm({ open: false, record: null })
        fetchRecords(page)
        fetchStats()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove record')
    }
  }

  const handleClear = async () => {
    try {
      const body = clearConfirm.module ? { module: clearConfirm.module } : { module: 'all' }
      const res = await api.delete('/delete-history/clear', { data: body })
      if (res.data.success) {
        toast.success(res.data.message || 'History cleared')
        setClearConfirm({ open: false, module: null })
        setPage(1)
        fetchRecords(1)
        fetchStats()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear history')
    }
  }

  const clearFilters = () => {
    setFilters({ module: '', search: '', startDate: '', endDate: '', status: '' })
    setPage(1)
  }

  const parsedRecordData = (record) => {
    try {
      return JSON.parse(record.record_data)
    } catch {
      return {}
    }
  }

  const columns = [
    {
      key: 'id',
      label: '#',
      render: (_, idx) => (page - 1) * 20 + idx + 1,
    },
    {
      key: 'module',
      label: 'Module',
      render: (val) => (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${MODULE_COLORS[val] || 'bg-gray-100 text-gray-700'}`}>
          {val}
        </span>
      ),
    },
    {
      key: 'record_name',
      label: 'Record Name',
    },
    {
      key: 'deleted_by_name',
      label: 'Deleted By',
    },
    {
      key: 'deleted_at',
      label: 'Deleted At',
      render: (val) => {
        const d = dayjs(val)
        return (
          <span title={d.isValid() ? d.format('DD MMM YYYY, h:mm A') : val}>
            {d.isValid() ? d.fromNow() : val}
          </span>
        )
      },
    },
    {
      key: 'can_restore',
      label: 'Can Restore',
      render: (val) => (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {val ? 'Restorable' : 'Permanent'}
        </span>
      ),
    },
    {
      key: 'is_restored',
      label: 'Status',
      render: (val, record) => {
        if (val) {
          return (
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Restored
              </span>
              {record.restored_by_name && (
                <span className="text-xs text-gray-500 ml-1">
                  by {record.restored_by_name}
                  {record.restored_at && ` ${dayjs(record.restored_at).fromNow()}`}
                </span>
              )}
            </div>
          )
        }
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Deleted
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewModal({ open: true, record })}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Data
          </button>
          {record.can_restore && !record.is_restored && (
            <button
              onClick={() => setRestoreConfirm({ open: true, record })}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Restore
            </button>
          )}
          <button
            onClick={() => setRemoveConfirm({ open: true, record })}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete History
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage all deleted records across the system
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Deletions" value={stats.total_deletions} icon="🗑️" color="red" />
          <StatCard title="Deletions Today" value={stats.deletions_today} icon="📅" color="blue" />
          <StatCard title="This Month" value={stats.deletions_this_month} icon="📊" color="yellow" />
          <StatCard title="Restorable Records" value={stats.restorable_count} icon="♻️" color="green" />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by record name or deleted by..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Module</label>
            <select
              value={filters.module}
              onChange={(e) => setFilters(prev => ({ ...prev, module: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {MODULES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All</option>
              <option value="not_restored">Not Restored</option>
              <option value="restored">Restored</option>
            </select>
          </div>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {totalItems > 0 ? `${totalItems} record(s) found` : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setClearConfirm({ open: true, module: null })}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Clear All History
            </button>
            <select
              onChange={(e) => {
                const val = e.target.value
                if (val) {
                  setClearConfirm({ open: true, module: val })
                  e.target.value = ''
                }
              }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Clear by Module</option>
              {MODULES.filter(m => m.value).map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
        <DataTable columns={columns} data={records} loading={loading} />
        <div className="px-4 pb-4">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={fetchRecords} />
        </div>
      </div>

      <Modal isOpen={viewModal.open} onClose={() => setViewModal({ open: false, record: null })} title="Record Data" size="lg">
        {viewModal.record && (
          <div className="overflow-x-auto">
            <div className="mb-4">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${MODULE_COLORS[viewModal.record.module] || 'bg-gray-100 text-gray-700'}`}>
                {viewModal.record.module}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                Record ID: {viewModal.record.record_id}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(parsedRecordData(viewModal.record)).map(([key, val]) => {
                  const formatted = formatFieldValue(key, val)
                  if (formatted === null) return null
                  return (
                    <tr key={key} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 font-medium text-gray-600 whitespace-nowrap w-1/3">
                        {formatKeyName(key)}
                      </td>
                      <td className="py-2 text-gray-900">{formatted}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={restoreConfirm.open}
        onClose={() => setRestoreConfirm({ open: false, record: null })}
        onConfirm={handleRestore}
        title="Restore Record"
        message={`Are you sure you want to restore "${restoreConfirm.record?.record_name}"?`}
        confirmText={restoring ? 'Restoring...' : 'Restore'}
        cancelText="Cancel"
        variant="primary"
      />

      <ConfirmDialog
        isOpen={removeConfirm.open}
        onClose={() => setRemoveConfirm({ open: false, record: null })}
        onConfirm={handleRemove}
        title="Remove History Record"
        message={`Permanently remove the history entry for "${removeConfirm.record?.record_name}"? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={clearConfirm.open}
        onClose={() => setClearConfirm({ open: false, module: null })}
        onConfirm={handleClear}
        title="Clear History"
        message={clearConfirm.module ? `This will permanently delete all history records for ${clearConfirm.module}. This cannot be undone.` : 'This will permanently delete all history records. This cannot be undone.'}
        confirmText="Clear All"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
