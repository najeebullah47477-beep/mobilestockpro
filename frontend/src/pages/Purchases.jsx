import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import DataTable from '../components/DataTable'
import SearchFilter from '../components/SearchFilter'
import Pagination from '../components/Pagination'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import PermissionGuard from '../components/PermissionGuard'
import api from '../api/axios'

const currencyFormat = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value ?? 0)

export default function Purchases() {
  const navigate = useNavigate()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [supplierFilter, setSupplierFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, purchase: null })

  const [suppliers, setSuppliers] = useState([])
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false)
  const supplierRef = useRef(null)

  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [openProductIdx, setOpenProductIdx] = useState(null)

  const [items, setItems] = useState([])
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [purchaseDate, setPurchaseDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  const fetchPurchases = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: 20 }
      if (supplierFilter) params.supplier_id = supplierFilter
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const res = await api.get('/purchases', { params })
      if (res.data.success) {
        setPurchases(res.data.data.purchases)
        setTotalPages(res.data.data.total_pages)
        setPage(res.data.data.current_page)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch purchases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get('/suppliers', { params: { per_page: 500 } }).then((res) => {
      if (res.data.success) setSuppliers(res.data.data.suppliers)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchPurchases(1)
  }, [supplierFilter, paymentStatusFilter, startDate, endDate])

  useEffect(() => {
    const handler = (e) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target)) {
        setSupplierDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.phone?.includes(supplierSearch)
  )

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier)
    setSupplierSearch(supplier.name)
    setSupplierDropdownOpen(false)
    setErrors((prev) => {
      const next = { ...prev }
      delete next.supplier
      return next
    })
  }

  const searchProducts = async (query) => {
    if (!query.trim()) {
      setProducts([])
      return
    }
    try {
      const res = await api.get('/products', { params: { search: query, per_page: 20 } })
      if (res.data.success) {
        setProducts(res.data.data.products)
      }
    } catch {
      setProducts([])
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (productSearch) searchProducts(productSearch)
      else setProducts([])
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  const clearErrors = (...fields) => {
    setErrors((prev) => {
      const next = { ...prev }
      fields.forEach((f) => delete next[f])
      return next
    })
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        product_id: '',
        product_name: '',
        quantity: 1,
        unit_cost: 0,
      },
    ])
    clearErrors('itemsCount')
  }

  const removeItem = (id) => {
    const idx = items.findIndex((i) => i.id === id)
    setItems(items.filter((i) => i.id !== id))
    setErrors((prev) => {
      const itemErrors = prev.items ? [...prev.items] : []
      if (idx >= 0 && idx < itemErrors.length) itemErrors.splice(idx, 1)
      const next = { ...prev }
      next.items = itemErrors.filter(Boolean).length ? itemErrors.filter(Boolean) : undefined
      if (!next.items) delete next.items
      return next
    })
  }

  const selectProduct = (itemId, product) => {
    setItems(
      items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              product_id: product.id,
              product_name: product.name,
              unit_cost: product.purchase_price || 0,
              quantity: 1,
            }
          : i
      )
    )
    setProductSearch('')
    setOpenProductIdx(null)
    clearErrors('items')
  }

  const updateItem = (id, field, value) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
    clearErrors('items')
  }

  const subtotal = items.reduce(
    (sum, i) => sum + (parseFloat(i.unit_cost) || 0) * (parseInt(i.quantity, 10) || 0),
    0
  )
  const taxAmount =
    ((subtotal - (parseFloat(discount) || 0)) * (parseFloat(tax) || 0)) / 100
  const total = subtotal - (parseFloat(discount) || 0) + taxAmount
  const balanceDue = total - (parseFloat(amountPaid) || 0)
  const change = balanceDue < 0 ? Math.abs(balanceDue) : 0

  const today = dayjs().format('YYYY-MM-DD')
  const minDate = dayjs().subtract(5, 'year').format('YYYY-MM-DD')

  const validateForm = () => {
    const newErrors = {}

    if (!selectedSupplier) {
      newErrors.supplier = 'Supplier select karein (Please select a supplier)'
    }

    const d = dayjs(purchaseDate)
    if (!purchaseDate || !d.isValid()) {
      newErrors.date = 'Valid date daalein (Enter a valid date)'
    } else if (d.isAfter(dayjs())) {
      newErrors.date = 'Future date nahi daal sakte (Cannot select future date)'
    } else if (d.isBefore(dayjs().subtract(5, 'year'))) {
      newErrors.date = '5 saal se purani date nahi daal sakte (Date cannot be older than 5 years)'
    }

    if (!items.length) {
      newErrors.itemsCount = 'Kam se kam ek item add karein (Add at least one item)'
    }

    const itemErrors = items.map((item) => {
      const ie = {}
      if (!item.product_id) {
        ie.product_id = 'Product select karein (Please select a product)'
      }
      const qty = parseInt(item.quantity, 10)
      if (!item.quantity || isNaN(qty) || qty < 1) {
        ie.quantity = 'Quantity kam se kam 1 hona chahiye (Minimum quantity is 1)'
      } else if (qty > 9999) {
        ie.quantity = 'Quantity 9999 se zyada nahi ho sakti (Maximum quantity is 9999)'
      }
      const cost = parseFloat(item.unit_cost)
      if (!item.unit_cost || isNaN(cost) || cost < 1) {
        ie.unit_cost = 'Unit cost kam se kam 1 hona chahiye (Minimum unit cost is 1)'
      }
      return ie
    })
    newErrors.items = itemErrors

    const disc = parseFloat(discount) || 0
    if (disc > subtotal) {
      newErrors.discount = 'Discount subtotal se zyada nahi ho sakta (Discount cannot exceed subtotal)'
    }

    const paid = parseFloat(amountPaid) || 0
    if (paid < 0) {
      newErrors.amountPaid = 'Amount paid negative nahi ho sakta (Amount paid cannot be negative)'
    }

    setErrors(newErrors)

    return !(
      newErrors.supplier ||
      newErrors.date ||
      newErrors.itemsCount ||
      newErrors.discount ||
      newErrors.amountPaid ||
      itemErrors.some((e) => Object.keys(e).length > 0)
    )
  }

  const resetForm = () => {
    setSelectedSupplier(null)
    setSupplierSearch('')
    setPurchaseDate(dayjs().format('YYYY-MM-DD'))
    setItems([])
    setDiscount(0)
    setTax(0)
    setAmountPaid(0)
    setPaymentMethod('cash')
    setNotes('')
    setErrors({})
    setSubmitting(false)
  }

  const openAddModal = () => {
    resetForm()
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Form mein errors hain (Please fix the errors)')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        supplier_id: selectedSupplier.id,
        purchase_date: purchaseDate,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: parseInt(i.quantity, 10) || 1,
          unit_cost: parseFloat(i.unit_cost) || 0,
        })),
        discount: parseFloat(discount) || 0,
        tax: parseFloat(tax) || 0,
        amount_paid: parseFloat(amountPaid) || 0,
        payment_method: paymentMethod,
        notes,
      }
      await api.post('/purchases', payload)
      toast.success('Purchase created successfully')
      setModalOpen(false)
      fetchPurchases(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create purchase')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const purchase = deleteConfirm.purchase
    if (!purchase) return
    try {
      await api.delete(`/purchases/${purchase.id}`)
      toast.success('Purchase deleted successfully')
      setDeleteConfirm({ open: false, purchase: null })
      fetchPurchases(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete purchase')
    }
  }

  const handleRowClick = (purchase) => {
    navigate(`/purchases/${purchase.id}`)
  }

  const columns = [
    { key: 'invoice_no', label: 'Invoice #', render: (val) => <span className="font-medium text-gray-900">{val || '-'}</span> },
    { key: 'supplier_name', label: 'Supplier' },
    {
      key: 'purchase_date',
      label: 'Date',
      render: (val) => (val ? dayjs(val).format('DD MMM YYYY') : '-'),
    },
    {
      key: 'subtotal',
      label: 'Subtotal',
      render: (val) => currencyFormat(val),
    },
    {
      key: 'total_amount',
      label: 'Total',
      render: (val) => <span className="font-medium">{currencyFormat(val)}</span>,
    },
    {
      key: 'paid_amount',
      label: 'Paid',
      render: (val) => currencyFormat(val),
    },
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
      key: 'payment_status',
      label: 'Payment Status',
      render: (val) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            val === 'paid'
              ? 'bg-green-100 text-green-700'
              : val === 'partial'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {val}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${row.id}`) }}
            className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-150"
          >
            View
          </button>
          <PermissionGuard roles={['admin']}>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, purchase: row }) }}
              className="px-3 py-1.5 text-xs font-medium text-danger-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
            >
              Delete
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition'
  const inputErrorClass = 'w-full px-4 py-2.5 border border-red-500 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const selectClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-white'

  const hasFormErrors =
    errors.supplier ||
    errors.date ||
    errors.itemsCount ||
    errors.discount ||
    errors.amountPaid ||
    (errors.items && errors.items.some((e) => e && Object.keys(e).length > 0))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Purchases</h1>
        <PermissionGuard roles={['admin', 'manager']}>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150 shadow-sm"
          >
            + New Purchase
          </button>
        </PermissionGuard>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:min-w-[200px] sm:max-w-xs" ref={supplierRef}>
          <input
            type="text"
            value={supplierSearch}
            onChange={(e) => {
              setSupplierSearch(e.target.value)
              setSupplierDropdownOpen(true)
            }}
            onFocus={() => setSupplierDropdownOpen(true)}
            placeholder="Search supplier..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
          />
          {supplierDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredSuppliers.length ? (
                filteredSuppliers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSupplierFilter(s.id)
                      setSupplierSearch(s.name)
                      setSupplierDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                  >
                    {s.name} {s.phone ? `(${s.phone})` : ''}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-400">No suppliers found</div>
              )}
            </div>
          )}
        </div>
        <select
          value={paymentStatusFilter}
          onChange={(e) => setPaymentStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Payment Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-gray-400 text-sm flex-shrink-0">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1 sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div>
        <DataTable
          columns={columns}
          data={purchases}
          loading={loading}
          emptyMessage="No purchases found"
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={fetchPurchases}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Purchase" size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {hasFormErrors && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800">Form mein errors hain (Form has errors):</p>
              <ul className="mt-2 text-sm text-red-600 list-disc list-inside space-y-1">
                {errors.supplier && <li>{errors.supplier}</li>}
                {errors.date && <li>{errors.date}</li>}
                {errors.itemsCount && <li>{errors.itemsCount}</li>}
                {errors.discount && <li>{errors.discount}</li>}
                {errors.amountPaid && <li>{errors.amountPaid}</li>}
                {errors.items?.some((e) => e && Object.keys(e).length > 0) && (
                  <li>Items mein errors hain (Items have errors) — har item ka product, quantity aur unit cost check karein</li>
                )}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative" ref={supplierRef}>
              <label className={labelClass}>Supplier *</label>
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => {
                  setSupplierSearch(e.target.value)
                  setSupplierDropdownOpen(true)
                  setSelectedSupplier(null)
                  clearErrors('supplier')
                }}
                onFocus={() => setSupplierDropdownOpen(true)}
                placeholder="Search supplier..."
                className={errors.supplier ? inputErrorClass : inputClass}
              />
              {errors.supplier && (
                <p className="mt-1 text-sm text-red-600">{errors.supplier}</p>
              )}
              {supplierDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredSuppliers.length ? (
                    filteredSuppliers.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSupplierSelect(s)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700"
                      >
                        {s.name} {s.phone ? `(${s.phone})` : ''}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-400">No suppliers found</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => { setPurchaseDate(e.target.value); clearErrors('date') }}
                max={today}
                min={minDate}
                className={errors.date ? inputErrorClass : inputClass}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date}</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-150"
              >
                + Add Item
              </button>
            </div>
            {errors.itemsCount && (
              <p className="mb-2 text-sm text-red-600">{errors.itemsCount}</p>
            )}
            {items.length === 0 && (
              <div className="text-center py-6 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
                No items added yet. Click "Add Item" to add products.
              </div>
            )}
            {items.map((item, idx) => {
              const itemErr = errors.items?.[idx] || {}
              const prodErrClass = itemErr.product_id
                ? 'w-full px-3 py-2 border border-red-500 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition'
                : 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition'
              const qtyErrClass = itemErr.quantity
                ? 'w-full px-3 py-2 border border-red-500 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition'
                : 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition'
              const costErrClass = itemErr.unit_cost
                ? 'w-full px-3 py-2 border border-red-500 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition'
                : 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition'

              return (
                <div key={item.id} className="flex flex-wrap items-end gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-[200px] relative">
                    <label className="text-xs text-gray-500 mb-1 block">Product</label>
                    <input
                      type="text"
                      value={
                        openProductIdx === idx ? productSearch : item.product_name
                      }
                      onChange={(e) => {
                        setOpenProductIdx(idx)
                        setProductSearch(e.target.value)
                        clearErrors('items')
                      }}
                      onFocus={() => {
                        setOpenProductIdx(idx)
                        setProductSearch('')
                      }}
                      placeholder="Search product..."
                      className={prodErrClass}
                    />
                    {itemErr.product_id && (
                      <p className="mt-1 text-xs text-red-600">{itemErr.product_id}</p>
                    )}
                    {openProductIdx === idx && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {products.length ? (
                          products.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selectProduct(item.id, p)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                            >
                              {p.name} - {currencyFormat(p.purchase_price)}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-400">
                            {productSearch ? 'No products found' : 'Type to search...'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      className={qtyErrClass}
                    />
                    {itemErr.quantity && (
                      <p className="mt-1 text-xs text-red-600">{itemErr.quantity}</p>
                    )}
                  </div>
                  <div className="w-28">
                    <label className="text-xs text-gray-500 mb-1 block">Unit Cost</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={item.unit_cost}
                      onChange={(e) => updateItem(item.id, 'unit_cost', e.target.value)}
                      className={costErrClass}
                    />
                    {itemErr.unit_cost && (
                      <p className="mt-1 text-xs text-red-600">{itemErr.unit_cost}</p>
                    )}
                  </div>
                  <div className="text-right min-w-[80px] pb-1">
                    <label className="text-xs text-gray-500 mb-1 block">Total</label>
                    <p className="text-sm font-semibold text-gray-900">
                      {currencyFormat(
                        (parseFloat(item.unit_cost) || 0) * (parseInt(item.quantity, 10) || 0)
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="pb-1 text-danger-500 hover:text-danger-700 transition-colors duration-150"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Subtotal</label>
              <p className="text-lg font-semibold text-gray-900">{currencyFormat(subtotal)}</p>
            </div>
            <div>
              <label className={labelClass}>Discount (flat)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => { setDiscount(e.target.value); clearErrors('discount') }}
                className={errors.discount ? inputErrorClass : inputClass}
              />
              {errors.discount && (
                <p className="mt-1 text-sm text-red-600">{errors.discount}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Tax (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Total Amount</label>
              <p className="text-lg font-bold text-primary-700">{currencyFormat(total)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Amount Paid</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountPaid}
                onChange={(e) => { setAmountPaid(e.target.value); clearErrors('amountPaid') }}
                className={errors.amountPaid ? inputErrorClass : inputClass}
              />
              {errors.amountPaid && (
                <p className="mt-1 text-sm text-red-600">{errors.amountPaid}</p>
              )}
              {parseFloat(amountPaid) > total && (
                <p className="mt-1 text-sm text-amber-600">
                  Amount paid total se zyada hai (Exceeds total). Change: {currencyFormat(parseFloat(amountPaid) - total)}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Change</label>
              <p className="text-lg font-semibold text-green-600">{currencyFormat(change)}</p>
            </div>
            <div>
              <label className={labelClass}>Balance Due</label>
              <p className={`text-lg font-semibold ${balanceDue > 0 ? 'text-danger-600' : 'text-gray-600'}`}>
                {currencyFormat(balanceDue > 0 ? balanceDue : 0)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={selectClass}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="installment">Installment</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Notes
                <span className="text-gray-400 font-normal ml-1">({notes.length}/500)</span>
              </label>
              <textarea
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg text-sm transition-colors duration-150"
            >
              {submitting ? 'Creating...' : 'Create Purchase'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, purchase: null })}
        onConfirm={handleDelete}
        title="Delete Purchase"
        message={`Are you sure you want to delete purchase invoice #${deleteConfirm.purchase?.invoice_no || ''}?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
