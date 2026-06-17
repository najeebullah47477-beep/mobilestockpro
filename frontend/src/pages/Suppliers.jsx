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

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, supplier: null })
  const [detailModal, setDetailModal] = useState({ open: false, supplier: null })
  const [purchases, setPurchases] = useState([])
  const [purchasesLoading, setPurchasesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, touchedFields },
  } = useForm({ mode: 'onChange' })

  const { maskPhone, maskEmail } = useInputMask()

  const addressValue = watch('address', '')

  const nameValidation = {
    required: 'Name is required',
    minLength: { value: 2, message: 'Name must be at least 2 characters' },
    maxLength: { value: 150, message: 'Name must not exceed 150 characters' },
    pattern: { value: /^[a-zA-Z0-9\s\-'.]+$/, message: 'Name contains invalid characters' },
    onBlur: (e) => {
      const capitalized = e.target.value.replace(/\b\w/g, (c) => c.toUpperCase())
      setValue('name', capitalized, { shouldValidate: true })
    },
  }

  const contactValidation = {
    minLength: { value: 2, message: 'Contact person must be at least 2 characters' },
    maxLength: { value: 150, message: 'Contact person must not exceed 150 characters' },
    pattern: { value: /^[a-zA-Z0-9\s\-'.]+$/, message: 'Contact person contains invalid characters' },
    onBlur: (e) => {
      const capitalized = e.target.value.replace(/\b\w/g, (c) => c.toUpperCase())
      setValue('contact_person', capitalized, { shouldValidate: true })
    },
  }

  const phoneValidation = {
    validate: (value) => {
      if (!value) return true
      const digits = value.replace(/\D/g, '')
      if (digits.length !== 11) return 'Phone must be 11 digits'
      if (!digits.startsWith('03')) return 'Phone must start with 03'
      return true
    },
  }

  const emailValidation = {
    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email format' },
  }

  const cityValidation = {
    minLength: { value: 2, message: 'City must be at least 2 characters' },
    maxLength: { value: 100, message: 'City must not exceed 100 characters' },
    pattern: { value: /^[a-zA-Z\s]+$/, message: 'City must contain only letters and spaces' },
    onBlur: (e) => {
      const capitalized = e.target.value.replace(/\b\w/g, (c) => c.toUpperCase())
      setValue('city', capitalized, { shouldValidate: true })
    },
  }

  const addressValidation = {
    maxLength: { value: 500, message: 'Address must not exceed 500 characters' },
  }

  const { onChange: phoneOnChange, ...phoneRest } = register('phone', phoneValidation)
  const { onChange: emailOnChange, ...emailRest } = register('email', emailValidation)

  const baseInputClass = 'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition'
  const baseTextareaClass = baseInputClass + ' resize-none'

  const fetchSuppliers = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: 20 }
      if (search) params.search = search
      const res = await api.get('/suppliers', { params })
      if (res.data.success) {
        setSuppliers(res.data.data.suppliers)
        setTotalPages(res.data.data.total_pages)
        setPage(res.data.data.current_page)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers(1)
  }, [search])

  const openAddModal = () => {
    setEditingSupplier(null)
    reset({ name: '', contact_person: '', phone: '', email: '', address: '', city: '' })
    setModalOpen(true)
  }

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier)
    reset({
      name: supplier.name || '',
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
    })
    setModalOpen(true)
  }

  const onFormSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, data)
        toast.success('Supplier updated successfully')
      } else {
        await api.post('/suppliers', data)
        toast.success('Supplier created successfully')
      }
      setModalOpen(false)
      fetchSuppliers(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save supplier')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const supplier = deleteConfirm.supplier
    if (!supplier) return
    try {
      await api.delete(`/suppliers/${supplier.id}`)
      toast.success('Supplier deleted successfully')
      setDeleteConfirm({ open: false, supplier: null })
      fetchSuppliers(page)
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete supplier')
    }
  }

  const openDetailModal = async (supplier) => {
    setDetailModal({ open: true, supplier })
    setPurchasesLoading(true)
    setPurchases([])
    try {
      const res = await api.get('/purchases', { params: { supplier_id: supplier.id, per_page: 50 } })
      const list = extractList(res)
      setPurchases(list)
    } catch {
      setPurchases([])
    } finally {
      setPurchasesLoading(false)
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'city', label: 'City' },
    {
      key: 'balance',
      label: 'Balance',
      render: (val) => (
        <span className={val > 0 ? 'text-danger-600 font-medium' : 'text-gray-600'}>
          {currencyFormat(val)}
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
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, supplier: row }) }}
              className="px-3 py-1.5 text-xs font-medium text-danger-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
            >
              Delete
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  const handleRowClick = (supplier) => {
    openDetailModal(supplier)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <PermissionGuard roles={['admin', 'manager']}>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
          >
            Add Supplier
          </button>
        </PermissionGuard>
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search by name, city, or phone..."
      />

      <div>
        <DataTable
          columns={columns}
          data={suppliers}
          loading={loading}
          emptyMessage="No suppliers found"
          onRowClick={handleRowClick}
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={fetchSuppliers}
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        size="md"
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <FormField label="Name" required error={errors.name?.message} touched={touchedFields.name}>
            <input
              {...register('name', nameValidation)}
              className={baseInputClass}
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Contact Person" error={errors.contact_person?.message} touched={touchedFields.contact_person}>
              <input
                {...register('contact_person', contactValidation)}
                className={baseInputClass}
              />
            </FormField>

            <FormField label="Phone" error={errors.phone?.message} touched={touchedFields.phone}>
              <input
                {...phoneRest}
                onChange={(e) => {
                  const masked = maskPhone(e.target.value)
                  e.target.value = masked
                  phoneOnChange(e)
                }}
                className={baseInputClass}
              />
            </FormField>

            <FormField label="Email" error={errors.email?.message} touched={touchedFields.email}>
              <input
                type="email"
                {...emailRest}
                onChange={(e) => {
                  const masked = maskEmail(e.target.value)
                  e.target.value = masked
                  emailOnChange(e)
                }}
                className={baseInputClass}
              />
            </FormField>

            <FormField label="City" error={errors.city?.message} touched={touchedFields.city}>
              <input
                {...register('city', cityValidation)}
                className={baseInputClass}
              />
            </FormField>
          </div>

          <FormField
            label="Address"
            error={errors.address?.message}
            touched={touchedFields.address}
            maxLength={500}
            currentLength={addressValue?.length || 0}
          >
            <textarea
              rows={2}
              {...register('address', addressValidation)}
              className={baseTextareaClass}
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
              {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, supplier: null })}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${deleteConfirm.supplier?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <Modal
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, supplier: null, purchases: [] })}
        title={detailModal.supplier?.name || 'Supplier Details'}
        size="lg"
      >
        {detailModal.supplier && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Phone</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.supplier.phone || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Email</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.supplier.email || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Contact Person</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.supplier.contact_person || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">City</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.supplier.city || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Address</span>
                <p className="text-sm font-medium text-gray-900">{detailModal.supplier.address || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Balance</span>
                <p className={`text-sm font-medium ${detailModal.supplier.balance > 0 ? 'text-danger-600' : 'text-gray-900'}`}>
                  {currencyFormat(detailModal.supplier.balance)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Purchase History</h3>
              {purchasesLoading ? (
                <div className="text-center py-8 text-sm text-gray-500">Loading purchases...</div>
              ) : purchases.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">No purchase history found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {purchases.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">
                            {p.purchase_date ? dayjs(p.purchase_date).format('DD MMM YYYY') : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-700">{p.reference_no || p.invoice_no || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{currencyFormat(p.total_amount)}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-700 text-right">{currencyFormat(p.paid_amount)}</td>
                          <td className="px-4 py-2.5 text-sm text-danger-600 text-right font-medium">{currencyFormat(p.due_amount)}</td>
                        </tr>
                      ))}
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
