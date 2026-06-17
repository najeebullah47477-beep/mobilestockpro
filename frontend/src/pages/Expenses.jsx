import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import DataTable from '../components/DataTable'
import Pagination from '../components/Pagination'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PermissionGuard from '../components/PermissionGuard'
import FormField from '../components/FormField'
import api from '../api/axios'

const currencyFormat = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value ?? 0)

const categoryOptions = [
  { value: 'Rent', label: 'Rent' },
  { value: 'Utilities', label: 'Utilities' },
  { value: 'Salary', label: 'Salary' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Transportation', label: 'Transportation' },
  { value: 'Other', label: 'Other' },
]

export default function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, expense: null })
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = useForm({ mode: 'onChange' })

  const fetchExpenses = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: 20 }
      if (categoryFilter) params.category = categoryFilter
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const res = await api.get('/expenses', { params })
      if (res.data.success) {
        setExpenses(res.data.data.expenses)
        setTotalPages(res.data.data.total_pages)
        setPage(res.data.data.current_page)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses(1)
  }, [categoryFilter, startDate, endDate])

  const openAddModal = () => {
    setEditingExpense(null)
    reset({
      title: '',
      category: '',
      amount: '',
      expense_date: dayjs().format('YYYY-MM-DD'),
      payment_method: 'cash',
      notes: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (expense) => {
    setEditingExpense(expense)
    reset({
      title: expense.title || '',
      category: expense.category || '',
      amount: expense.amount ?? '',
      expense_date: expense.expense_date ? dayjs(expense.expense_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      payment_method: expense.payment_method || 'cash',
      notes: expense.notes || '',
    })
    setModalOpen(true)
  }

  const onFormSubmit = async (data) => {
    setSubmitting(true)
    try {
      const payload = {
        ...data,
        amount: parseFloat(data.amount) || 0,
      }

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload)
        toast.success('Expense updated successfully')
      } else {
        await api.post('/expenses', payload)
        toast.success('Expense created successfully')
      }
      setModalOpen(false)
      fetchExpenses(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const expense = deleteConfirm.expense
    if (!expense) return
    try {
      await api.delete(`/expenses/${expense.id}`)
      toast.success('Expense deleted successfully')
      setDeleteConfirm({ open: false, expense: null })
      fetchExpenses(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense')
    }
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    {
      key: 'amount',
      label: 'Amount',
      render: (val) => <span className="font-medium">{currencyFormat(val)}</span>,
    },
    {
      key: 'expense_date',
      label: 'Date',
      render: (val) => (val ? dayjs(val).format('DD MMM YYYY') : '-'),
    },
    {
      key: 'payment_method',
      label: 'Payment Method',
      render: (val) => (
        <span className="capitalize">{val?.replace(/_/g, ' ') || '-'}</span>
      ),
    },
    { key: 'notes', label: 'Notes', render: (val) => val || '-' },
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
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, expense: row }) }}
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

  const selectClass = (field) =>
    `w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-white ${
      errors[field] ? 'border-red-400' : 'border-gray-300'
    }`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <PermissionGuard roles={['admin', 'manager']}>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
          >
            Add Expense
          </button>
        </PermissionGuard>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <span className="text-gray-400 text-sm">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <DataTable
          columns={columns}
          data={expenses}
          loading={loading}
          emptyMessage="No expenses found"
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={fetchExpenses}
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
        size="md"
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <FormField
            label="Title"
            required
            error={errors.title?.message}
            touched={touchedFields.title}
            name="title"
          >
            <input
              {...register('title', {
                required: 'Title zaroori hai (Title is required)',
                minLength: { value: 2, message: 'Title kam se kam 2 characters ka hona chahiye (Title must be at least 2 characters)' },
                maxLength: { value: 150, message: 'Title 150 characters se zyada nahi ho sakta (Title cannot exceed 150 characters)' },
                pattern: { value: /^[a-zA-Z0-9\s\-'.]+$/, message: 'Sirf letters, numbers, spaces, hyphens, apostrophes aur dots allowed hain (Only letters, numbers, spaces, hyphens, apostrophes and dots allowed)' },
              })}
              className={inputClass('title')}
            />
          </FormField>

          <FormField
            label="Category"
            required
            error={errors.category?.message}
            touched={touchedFields.category}
            name="category"
          >
            <select
              {...register('category', { required: 'Category select karein (Please select a category)' })}
              className={selectClass('category')}
            >
              <option value="">Select Category</option>
              {categoryOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Amount"
            required
            error={errors.amount?.message}
            touched={touchedFields.amount}
            name="amount"
          >
            <input
              type="number"
              step="0.01"
              {...register('amount', {
                required: 'Amount zaroori hai (Amount is required)',
                min: { value: 1, message: 'Amount 0 se zyada honi chahiye (Amount must be greater than 0)' },
                validate: (val) => !val || /^\d+(\.\d{1,2})?$/.test(val) || 'Sirf 2 decimal places allowed hain (Only 2 decimal places allowed)',
              })}
              className={inputClass('amount')}
            />
          </FormField>

          <FormField
            label="Date"
            error={errors.expense_date?.message}
            touched={touchedFields.expense_date}
            name="expense_date"
          >
            <input
              type="date"
              max={dayjs().format('YYYY-MM-DD')}
              {...register('expense_date')}
              className={inputClass('expense_date')}
            />
          </FormField>

          <FormField
            label="Payment Method"
            name="payment_method"
          >
            <select
              {...register('payment_method')}
              className={selectClass('payment_method')}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </FormField>

          <FormField
            label="Notes"
            maxLength={500}
            currentLength={(watch('notes') || '').length}
            touched={touchedFields.notes}
            name="notes"
          >
            <textarea
              rows={3}
              {...register('notes', { maxLength: { value: 500, message: 'Notes 500 characters se zyada nahi ho sakte (Notes cannot exceed 500 characters)' } })}
              className={inputClass('notes')}
            />
          </FormField>

          {errors.notes && <p className="text-red-500 text-xs -mt-2">{errors.notes.message}</p>}

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
              {submitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, expense: null })}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete "${deleteConfirm.expense?.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
