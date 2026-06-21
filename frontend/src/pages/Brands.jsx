import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PermissionGuard from '../components/PermissionGuard'
import FormField from '../components/FormField'
import api from '../api/axios'

const extractList = (res) => {
  const raw = res.data?.data ?? res.data
  if (Array.isArray(raw)) return raw
  const arr = Object.values(raw).find(Array.isArray)
  return arr || []
}

export default function Brands() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, brand: null })
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = useForm({ mode: 'onChange' })

  const nameValue = watch('name', '')
  const countryValue = watch('country_of_origin', '')

  const fetchBrands = async () => {
    setLoading(true)
    try {
      const res = await api.get('/brands')
      setBrands(extractList(res))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch brands')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBrands()
  }, [])

  const openAddModal = () => {
    setEditingBrand(null)
    reset({ name: '', country_of_origin: '' })
    setModalOpen(true)
  }

  const openEditModal = (brand) => {
    setEditingBrand(brand)
    reset({ name: brand.name || '', country_of_origin: brand.country_of_origin || '' })
    setModalOpen(true)
  }

  const onFormSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (editingBrand) {
        await api.put(`/brands/${editingBrand.id}`, data)
        toast.success('Brand updated successfully')
      } else {
        await api.post('/brands', data)
        toast.success('Brand created successfully')
      }
      setModalOpen(false)
      fetchBrands()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save brand')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const brand = deleteConfirm.brand
    if (!brand) return
    try {
      await api.delete(`/brands/${brand.id}`)
      toast.success('Brand deleted successfully')
      setDeleteConfirm({ open: false, brand: null })
      fetchBrands()
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete brand')
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    { key: 'country_of_origin', label: 'Country of Origin' },
    {
      key: 'created_at',
      label: 'Created At',
      render: (val) => (val ? dayjs(val).format('DD MMM YYYY') : '-'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <PermissionGuard roles={['admin', 'manager']}>
            <button
              onClick={() => openEditModal(row)}
              className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-150"
            >
              Edit
            </button>
          </PermissionGuard>
          <PermissionGuard roles={['admin', 'manager']}>
            <button
              onClick={() => setDeleteConfirm({ open: true, brand: row })}
              className="px-3 py-1.5 text-xs font-medium text-danger-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
            >
              Delete
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  const inputBaseClass = 'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-primary-500 outline-none transition border-gray-300'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Brands</h1>
        <PermissionGuard roles={['admin', 'manager']}>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
          >
            Add Brand
          </button>
        </PermissionGuard>
      </div>

      <DataTable
        columns={columns}
        data={brands}
        loading={loading}
        emptyMessage="No brands found"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBrand ? 'Edit Brand' : 'Add Brand'}
        size="md"
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <FormField
            label="Name"
            error={errors.name?.message}
            touched={touchedFields.name}
            required
            maxLength={150}
            currentLength={nameValue?.length || 0}
          >
            <input
              {...register('name', {
                required: 'Name zaroori hai (Name is required)',
                minLength: {
                  value: 2,
                  message: 'Name kam az kam 2 characters ka hona chahiye (Name must be at least 2 characters)',
                },
                maxLength: {
                  value: 150,
                  message: 'Name 150 characters se zyada nahi hona chahiye (Name must not exceed 150 characters)',
                },
                pattern: {
                  value: /^[a-zA-Z0-9\s\-'.]+$/,
                  message:
                    "Name sirf letters, numbers, spaces, hyphens, apostrophes aur dots allow karta hai (Name only allows letters, numbers, spaces, hyphens, apostrophes and dots)",
                },
                onBlur: (e) => {
                  const val = e.target.value
                  if (val) {
                    setValue('name', val.charAt(0).toUpperCase() + val.slice(1), {
                      shouldValidate: true,
                    })
                  }
                },
              })}
              className={inputBaseClass}
            />
          </FormField>

          <FormField
            label="Country of Origin"
            error={errors.country_of_origin?.message}
            touched={touchedFields.country_of_origin}
            maxLength={100}
            currentLength={countryValue?.length || 0}
          >
            <input
              {...register('country_of_origin', {
                maxLength: {
                  value: 100,
                  message:
                    'Country of origin 100 characters se zyada nahi hona chahiye (Country of origin must not exceed 100 characters)',
                },
              })}
              placeholder="e.g. China, USA"
              className={inputBaseClass}
            />
          </FormField>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
            >
              {submitting ? 'Saving...' : editingBrand ? 'Update Brand' : 'Add Brand'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, brand: null })}
        onConfirm={handleDelete}
        title="Delete Brand"
        message={`Are you sure you want to delete "${deleteConfirm.brand?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
