import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import DataTable from '../components/DataTable'
import SearchFilter from '../components/SearchFilter'
import Pagination from '../components/Pagination'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PermissionGuard from '../components/PermissionGuard'
import FormField from '../components/FormField'
import { useInputMask } from '../hooks/useInputMask'
import api from '../api/axios'

const currencyFormat = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value ?? 0)

const extractList = (res) => {
  const raw = res.data?.data ?? res.data
  if (Array.isArray(raw)) return raw
  const arr = Object.values(raw).find(Array.isArray)
  return arr || []
}

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : str

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, customer: null })
  const [detailModal, setDetailModal] = useState({ open: false, customer: null })
  const [sales, setSales] = useState([])
  const [warranties, setWarranties] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, touchedFields },
  } = useForm({ mode: 'onChange' })

  const { maskPhone, maskCNIC, maskEmail } = useInputMask()

  const fetchCustomers = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: 20 }
      if (search) params.search = search
      const res = await api.get('/customers', { params })
      if (res.data.success) {
        setCustomers(res.data.data.customers)
        setTotalPages(res.data.data.total_pages)
        setPage(res.data.data.current_page)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers(1)
  }, [search])

  const openAddModal = () => {
    setEditingCustomer(null)
    reset({ name: '', phone: '', email: '', address: '', city: '', cnic: '' })
    setModalOpen(true)
  }

  const openEditModal = (customer) => {
    setEditingCustomer(customer)
    reset({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      cnic: customer.cnic || '',
    })
    setModalOpen(true)
  }

  const onFormSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, data)
        toast.success('Customer updated successfully')
      } else {
        await api.post('/customers', data)
        toast.success('Customer created successfully')
      }
      setModalOpen(false)
      fetchCustomers(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const customer = deleteConfirm.customer
    if (!customer) return
    try {
      await api.delete(`/customers/${customer.id}`)
      toast.success('Customer deleted successfully')
      setDeleteConfirm({ open: false, customer: null })
      fetchCustomers(page)
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete customer')
    }
  }

  const openDetailModal = async (customer) => {
    setDetailModal({ open: true, customer })
    setDetailLoading(true)
    setSales([])
    setWarranties([])
    try {
      const [salesRes, warrantiesRes] = await Promise.all([
        api.get('/sales', { params: { customer_id: customer.id, per_page: 50 } }),
        api.get('/warranties', { params: { customer_id: customer.id, per_page: 50 } }),
      ])
      setSales(extractList(salesRes))
      setWarranties(extractList(warrantiesRes))
    } catch {
      setSales([])
      setWarranties([])
    } finally {
      setDetailLoading(false)
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'city', label: 'City' },
    {
      key: 'total_purchases',
      label: 'Total Purchases',
      render: (val) => currencyFormat(val),
    },
    {
      key: 'loyalty_points',
      label: 'Loyalty Points',
      render: (val) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
          {val ?? 0}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <PermissionGuard roles={['admin', 'manager']}>
            <button
              onClick={(e) => { e.stopPropagation(); openEditModal(row) }}
              className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-150"
            >
              Edit
            </button>
          </PermissionGuard>
          <PermissionGuard roles={['admin']}>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, customer: row }) }}
              className="px-3 py-1.5 text-xs font-medium text-danger-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
            >
              Delete
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  const inputClass = (field) =>
    `w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`

  const handleRowClick = (customer) => {
    openDetailModal(customer)
  }

  const addressValue = watch('address')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <PermissionGuard roles={['admin', 'manager', 'staff']}>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
          >
            Add Customer
          </button>
        </PermissionGuard>
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search by name or phone..."
      />

      <div>
        <DataTable
          columns={columns}
          data={customers}
          loading={loading}
          emptyMessage="No customers found"
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={fetchCustomers}
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="md"
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name"
              required
              error={errors.name?.message}
              touched={!!touchedFields.name}
            >
              <input
                {...register('name', {
                  required: "Name zaroori hai",
                  minLength: { value: 2, message: "Name kam az kam 2 characters ka hona chahiye (Name must be at least 2 characters)" },
                  maxLength: 150,
                  pattern: { value: /^[a-zA-Z0-9\s\-'.]+$/, message: "Name mein sirf letters, numbers, space, dash, dot aur apostrophe ho sakta hai" },
                  onBlur: (e) => {
                    if (e.target.value) {
                      setValue('name', capitalize(e.target.value), { shouldValidate: true })
                    }
                  },
                })}
                className={inputClass('name')}
              />
            </FormField>

            <FormField
              label="Phone"
              required
              error={errors.phone?.message}
              touched={!!touchedFields.phone}
            >
              <input
                {...register('phone', {
                  required: "Phone zaroori hai",
                  onChange: (e) => {
                    e.target.value = maskPhone(e.target.value)
                  },
                  validate: (val) => {
                    const cleaned = val.replace(/[^0-9]/g, '')
                    if (cleaned.length === 0) return true
                    if (cleaned.length !== 11) return "Phone number 11 digits ka hona chahiye (Phone must be 11 digits)"
                    if (!/^03/.test(cleaned)) return "Pakistan number 03 se shuru hota hai (Pakistan number starts with 03)"
                    return true
                  },
                })}
                className={inputClass('phone')}
              />
            </FormField>

            <FormField
              label="Email"
              error={errors.email?.message}
              touched={!!touchedFields.email}
            >
              <input
                type="email"
                {...register('email', {
                  onChange: (e) => {
                    e.target.value = maskEmail(e.target.value)
                  },
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Please enter a valid email address (Meherbani karke sahi email address likhein)" },
                })}
                className={inputClass('email')}
              />
            </FormField>

            <FormField
              label="City"
              error={errors.city?.message}
              touched={!!touchedFields.city}
            >
              <input
                {...register('city', {
                  minLength: { value: 2, message: "City kam az kam 2 characters ka hona chahiye" },
                  maxLength: 100,
                  pattern: { value: /^[a-zA-Z\s]+$/, message: "City mein sirf letters aur spaces ho sakte hain" },
                  onBlur: (e) => {
                    if (e.target.value) {
                      setValue('city', capitalize(e.target.value), { shouldValidate: true })
                    }
                  },
                })}
                className={inputClass('city')}
              />
            </FormField>

            <FormField
              label="CNIC"
              error={errors.cnic?.message}
              touched={!!touchedFields.cnic}
              hint="Format: 42201-1234567-8"
            >
              <input
                {...register('cnic', {
                  onChange: (e) => {
                    e.target.value = maskCNIC(e.target.value)
                  },
                  validate: (val) => !val || /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/.test(val) || "CNIC format: 42201-1234567-8 (CNIC format: 42201-1234567-8)",
                })}
                placeholder="42201-1234567-8"
                className={inputClass('cnic')}
              />
            </FormField>
          </div>

          <FormField
            label="Address"
            error={errors.address?.message}
            touched={!!touchedFields.address}
            maxLength={500}
            currentLength={addressValue?.length || 0}
          >
            <textarea
              rows={2}
              {...register('address', {
                maxLength: 500,
              })}
              className={inputClass('address')}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
            >
              {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, customer: null })}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteConfirm.customer?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <Modal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, customer: null, sales: [], warranties: [] })}
        title={detailModal.customer?.name || 'Customer Details'}
        size="xl"
      >
        {detailModal.customer && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Phone</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.customer.phone || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Email</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.customer.email || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">City</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.customer.city || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">CNIC</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.customer.cnic || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Address</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.customer.address || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Loyalty Points</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.customer.loyalty_points ?? 0}</p>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Purchase History</h3>
              {detailLoading ? (
                <div className="text-center py-8 text-sm text-gray-500">Loading...</div>
              ) : sales.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">No purchase history found</div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sales.map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">
                            {s.sale_date ? dayjs(s.sale_date).format('DD MMM YYYY') : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">{s.invoice_no || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">{s.product_name || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{currencyFormat(s.total_amount)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{currencyFormat(s.paid_amount)}</td>
                          <td className="px-4 py-2.5 text-sm text-danger-600 text-right font-medium">{currencyFormat(s.due_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Warranties</h3>
              {detailLoading ? (
                <div className="text-center py-8 text-sm text-gray-500">Loading...</div>
              ) : warranties.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">No warranties found</div>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {warranties.map((w, idx) => {
                        const isActive = dayjs().isBefore(dayjs(w.end_date))
                        return (
                          <tr key={w.id || idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-sm text-gray-700">{w.product_name || '-'}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">
                              {w.start_date ? dayjs(w.start_date).format('DD MMM YYYY') : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">
                              {w.end_date ? dayjs(w.end_date).format('DD MMM YYYY') : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {isActive ? 'Active' : 'Expired'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-gray-700">{w.remarks || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
