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

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, category: null })
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = useForm({ mode: 'onChange' })

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await api.get('/categories')
      setCategories(extractList(res))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const openAddModal = () => {
    setEditingCategory(null)
    reset({ name: '', description: '', category_type: 'accessory' })
    setModalOpen(true)
  }

  const openEditModal = (category) => {
    setEditingCategory(category)
    reset({
      name: category.name || '',
      description: category.description || '',
      category_type: category.category_type || 'accessory',
    })
    setModalOpen(true)
  }

  const onFormSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, data)
        toast.success('Category updated successfully')
      } else {
        await api.post('/categories', data)
        toast.success('Category created successfully')
      }
      setModalOpen(false)
      fetchCategories()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const category = deleteConfirm.category
    if (!category) return
    try {
      await api.delete(`/categories/${category.id}`)
      toast.success('Category deleted successfully')
      setDeleteConfirm({ open: false, category: null })
      fetchCategories()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category')
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    { key: 'description', label: 'Description' },
    {
      key: 'category_type',
      label: 'Type',
      render: (val) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
          val === 'device'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {val === 'device' ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          )}
          {val === 'device' ? 'Device' : 'Accessory'}
        </span>
      ),
    },
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
              onClick={() => setDeleteConfirm({ open: true, category: row })}
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

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <PermissionGuard roles={['admin', 'manager']}>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
          >
            Add Category
          </button>
        </PermissionGuard>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        loading={loading}
        emptyMessage="No categories found"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        size="md"
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <FormField label="Name" error={errors.name?.message} touched={touchedFields.name} required>
            <input
              {...register('name', {
                required: 'Name zaroori hai (Name is required)',
                minLength: { value: 2, message: 'Name kam az kam 2 characters ka hona chahiye (Name must be at least 2 characters)' },
                maxLength: { value: 150 },
                pattern: { value: /^[a-zA-Z0-9\s\-'.]+$/, message: 'Name sirf letters, numbers, spaces, hyphens, aur apostrophes par mushtamil ho sakta hai (Name can only contain letters, numbers, spaces, hyphens, and apostrophes)' },
              })}
              className={inputClass('name')}
              onBlur={(e) => {
                const val = e.target.value
                if (val) {
                  setValue('name', val.charAt(0).toUpperCase() + val.slice(1), { shouldValidate: true })
                }
              }}
            />
          </FormField>
          <FormField label="Description" error={errors.description?.message} touched={touchedFields.description} maxLength={500} currentLength={(watch('description') || '').length}>
            <textarea
              rows={3}
              {...register('description', { maxLength: { value: 500 } })}
              className={inputClass('description')}
            />
          </FormField>
          <FormField label="Category Type" required error={errors.category_type?.message} touched={touchedFields.category_type}>
            <select
              {...register('category_type', { required: 'Category type is required' })}
              className={inputClass('category_type')}
            >
              <option value="accessory">Accessory (Chargers, Cables, Spare Parts etc)</option>
              <option value="device">Device (Smartphones, Tablets, Feature Phones etc)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Device type mein IMEI, RAM aur Storage fields show honge. Accessory type mein yeh fields hide honge.
            </p>
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
              {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, category: null })}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteConfirm.category?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
