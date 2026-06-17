import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import PermissionGuard from '../components/PermissionGuard'
import api from '../api/axios'

const statusColors = {
  active: 'bg-green-100 text-green-700',
  claimed: 'bg-orange-100 text-orange-700',
  expired: 'bg-red-100 text-red-700',
}

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'expired', label: 'Expired' },
]

export default function Warranties() {
  const [warranties, setWarranties] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [customers, setCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedWarranty, setSelectedWarranty] = useState(null)
  const [claimModalOpen, setClaimModalOpen] = useState(false)
  const [claimWarranty, setClaimWarranty] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset: resetClaimForm,
    watch,
    formState: { errors, touchedFields },
  } = useForm({ mode: 'onChange' })

  const fetchWarranties = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: 20 }
      if (statusFilter) params.status = statusFilter
      if (customerFilter) params.customer_id = customerFilter
      const res = await api.get('/warranties', { params })
      if (res.data.success) {
        setWarranties(res.data.data.warranties)
        setTotalPages(res.data.data.total_pages)
        setPage(res.data.data.current_page)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch warranties')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get('/customers', { params: { per_page: 500 } }).then((res) => {
      if (res.data.success) setCustomers(res.data.data.customers)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchWarranties(1)
  }, [statusFilter, customerFilter])

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.customer-dropdown')) setCustomerDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
  )

  const handleRowClick = (warranty) => {
    setSelectedWarranty(warranty)
    setDetailModalOpen(true)
  }

  const openClaimModal = (e, warranty) => {
    e.stopPropagation()
    setClaimWarranty(warranty)
    resetClaimForm({ claim_notes: '' })
    setClaimModalOpen(true)
  }

  const onClaimSubmit = async (data) => {
    if (!claimWarranty) return
    setSubmitting(true)
    try {
      await api.put(`/warranties/${claimWarranty.id}/claim`, {
        claim_notes: data.claim_notes,
      })
      toast.success('Warranty claimed successfully')
      setClaimModalOpen(false)
      setClaimWarranty(null)
      fetchWarranties(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to claim warranty')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { key: 'product_name', label: 'Product' },
    { key: 'customer_name', label: 'Customer' },
    {
      key: 'start_date',
      label: 'Start Date',
      render: (val) => (val ? dayjs(val).format('DD MMM YYYY') : '-'),
    },
    {
      key: 'end_date',
      label: 'End Date',
      render: (val) => (val ? dayjs(val).format('DD MMM YYYY') : '-'),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
            statusColors[val] || 'bg-gray-100 text-gray-700'
          }`}
        >
          {val}
        </span>
      ),
    },
    { key: 'warranty_type', label: 'Warranty Type' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          {row.status === 'active' && (
            <PermissionGuard roles={['admin', 'manager']}>
              <button
                onClick={(e) => openClaimModal(e, row)}
                className="px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors duration-150"
              >
                Claim
              </button>
            </PermissionGuard>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleRowClick(row) }}
            className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-150"
          >
            View
          </button>
        </div>
      ),
    },
  ]

  const inputClass = (field) =>
    `w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Warranties</h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="relative customer-dropdown">
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value)
              setCustomerDropdownOpen(true)
            }}
            onFocus={() => setCustomerDropdownOpen(true)}
            placeholder="Search customer..."
            className="w-48 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
          {customerDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredCustomers.length ? (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCustomerFilter(c.id)
                      setCustomerSearch(c.name)
                      setCustomerDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                  >
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-400">No customers found</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <DataTable
          columns={columns}
          data={warranties}
          loading={loading}
          emptyMessage="No warranties found"
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={fetchWarranties}
        />
      </div>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Warranty Details"
        size="lg"
      >
        {selectedWarranty && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Product</label>
                <p className="text-sm font-medium text-gray-900">{selectedWarranty.product_name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Customer</label>
                <p className="text-sm font-medium text-gray-900">{selectedWarranty.customer_name}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Start Date</label>
                <p className="text-sm text-gray-900">{dayjs(selectedWarranty.start_date).format('DD MMM YYYY')}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">End Date</label>
                <p className="text-sm text-gray-900">{dayjs(selectedWarranty.end_date).format('DD MMM YYYY')}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Status</label>
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium rounded-full capitalize mt-1 ${
                    statusColors[selectedWarranty.status] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {selectedWarranty.status}
                </span>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Warranty Type</label>
                <p className="text-sm text-gray-900">{selectedWarranty.warranty_type || '-'}</p>
              </div>
              {selectedWarranty.invoice_no && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Invoice #</label>
                  <p className="text-sm text-gray-900">{selectedWarranty.invoice_no}</p>
                </div>
              )}
              {selectedWarranty.claim_notes && (
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">Claim Notes</label>
                  <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">{selectedWarranty.claim_notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        title={`Claim Warranty - ${claimWarranty?.product_name || ''}`}
        size="md"
      >
        <form onSubmit={handleSubmit(onClaimSubmit)} className="space-y-4">
          <FormField
            label="Claim Notes"
            error={errors.claim_notes?.message}
            touched={touchedFields.claim_notes}
            required
            maxLength={500}
            currentLength={watch('claim_notes')?.length || 0}
          >
            <textarea
              rows={4}
              {...register('claim_notes', {
                required: 'Claim notes zaroori hain (Claim notes are required)',
                minLength: { value: 10, message: 'Kam az kam 10 characters likhein (Please write at least 10 characters)' },
                maxLength: { value: 500, message: '500 characters se zyada na likhein (Do not exceed 500 characters)' },
              })}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none ${
                errors.claim_notes && touchedFields.claim_notes ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="Describe the issue..."
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setClaimModalOpen(false)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-150"
            >
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
