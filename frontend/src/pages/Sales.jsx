import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import DataTable from '../components/DataTable'
import SearchFilter from '../components/SearchFilter'
import Pagination from '../components/Pagination'
import Modal from '../components/Modal'
import BarcodeScanner from '../components/BarcodeScanner'
import ConfirmDialog from '../components/ConfirmDialog'
import PermissionGuard from '../components/PermissionGuard'
import api from '../api/axios'

const currencyFormat = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value ?? 0)

export default function Sales() {
  const navigate = useNavigate()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [customerFilter, setCustomerFilter] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [saleTypeFilter, setSaleTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, sale: null })

  const [customers, setCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const customerRef = useRef(null)

  const [products, setProducts] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [openProductIdx, setOpenProductIdx] = useState(null)
  const productRefs = useRef({})

  const [saleType, setSaleType] = useState('retail')
  const [items, setItems] = useState([])
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [saleDate, setSaleDate] = useState(dayjs().format('YYYY-MM-DD'))

  const [allCustomers, setAllCustomers] = useState([])

  const [dateError, setDateError] = useState('')
  const [dateTouched, setDateTouched] = useState(false)
  const [customerError, setCustomerError] = useState('')
  const [customerTouched, setCustomerTouched] = useState(false)
  const [itemErrors, setItemErrors] = useState({})
  const [touchedItems, setTouchedItems] = useState({})
  const [discountError, setDiscountError] = useState('')
  const [discountTouched, setDiscountTouched] = useState(false)
  const [itemsRequiredError, setItemsRequiredError] = useState('')
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [amountPaidWarning, setAmountPaidWarning] = useState('')
  const [scannerOpenFor, setScannerOpenFor] = useState(null)

  const fetchSales = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: 20 }
      if (customerFilter) params.customer_id = customerFilter
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter
      if (saleTypeFilter) params.sale_type = saleTypeFilter
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      const res = await api.get('/sales', { params })
      if (res.data.success) {
        setSales(res.data.data.sales)
        setTotalPages(res.data.data.total_pages)
        setPage(res.data.data.current_page)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch sales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get('/customers', { params: { per_page: 500 } }).then((res) => {
      if (res.data.success) setAllCustomers(res.data.data.customers)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchSales(1)
  }, [customerFilter, paymentStatusFilter, saleTypeFilter, startDate, endDate])

  useEffect(() => {
    const handler = (e) => {
      if (customerRef.current && !customerRef.current.contains(e.target)) {
        setCustomerDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredCustomers = allCustomers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
  )

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch(customer.name)
    setCustomerDropdownOpen(false)
    setCustomerError('')
    setCustomerTouched(true)
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

  const handleScan = async (scannedValue, itemId) => {
    try {
      const res = await api.get('/products', { params: { search: scannedValue, per_page: 5 } })
      if (res.data.success && res.data.data.products.length > 0) {
        const found = res.data.data.products.find(
          (p) => p.imei === scannedValue || p.sku === scannedValue
        ) || res.data.data.products[0]
        selectProduct(itemId, found)
        toast.success(`Product found: ${found.name}`)
      } else {
        toast.error(`Product not found for scanned code: ${scannedValue}`)
      }
    } catch {
      toast.error(`Product not found for scanned code: ${scannedValue}`)
    }
    setScannerOpenFor(null)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (productSearch) searchProducts(productSearch)
      else setProducts([])
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch])

  const validateDate = (value) => {
    if (!value) {
      setDateError('')
      return
    }
    const d = dayjs(value)
    const today = dayjs()
    const fiveYearsAgo = dayjs().subtract(5, 'year')
    if (d.isAfter(today, 'day')) {
      setDateError('Date aaj se zyada nahi ho sakti (Date cannot be later than today)')
    } else if (d.isBefore(fiveYearsAgo, 'day')) {
      setDateError('Date 5 saal se purani nahi ho sakti (Date cannot be older than 5 years)')
    } else {
      setDateError('')
    }
  }

  const addItem = () => {
    const newId = Date.now()
    setItems([
      ...items,
      {
        id: newId,
        product_id: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        discount: 0,
        discount_type: 'flat',
        stock_quantity: 0,
      },
    ])
    setItemErrors((prev) => ({
      ...prev,
      [newId]: { product: '', quantity: '', unit_price: '', discount: '' },
    }))
    setTouchedItems((prev) => ({
      ...prev,
      [newId]: { product: false, quantity: false, unit_price: false, discount: false },
    }))
    setItemsRequiredError('')
  }

  const removeItem = (id) => {
    setItems(items.filter((i) => i.id !== id))
    const { [id]: _, ...restErrors } = itemErrors
    const { [id]: __, ...restTouched } = touchedItems
    setItemErrors(restErrors)
    setTouchedItems(restTouched)
    setItemsRequiredError('')
  }

  const selectProduct = (itemId, product) => {
    const price =
      saleType === 'wholesale'
        ? product.wholesale_price || product.selling_price
        : product.selling_price
    setItems(
      items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              product_id: product.id,
              product_name: product.name,
              unit_price: price,
              quantity: 1,
              discount: 0,
              discount_type: 'flat',
              stock_quantity: product.stock_quantity || 0,
            }
          : i
      )
    )
    setProductSearch('')
    setOpenProductIdx(null)
    setItemErrors((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), product: '' },
    }))
    setTouchedItems((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), product: true },
    }))
  }

  const validateItemField = (item, field, value) => {
    switch (field) {
      case 'quantity': {
        const qty = parseInt(value, 10)
        if (isNaN(qty) || qty < 1) return 'Quantity kam az kam 1 hona chahiye (Minimum 1)'
        if (qty > 9999) return 'Quantity 9999 se zyada nahi ho sakti (Max 9999)'
        if (item.stock_quantity && qty > item.stock_quantity) {
          return `Stock mein sirf ${item.stock_quantity} items hain (Only ${item.stock_quantity} items in stock)`
        }
        return ''
      }
      case 'unit_price': {
        const price = parseFloat(value)
        if (isNaN(price) || price < 1) return 'Price kam az kam 1 hona chahiye (Minimum 1)'
        return ''
      }
      case 'discount': {
        const itemTotal = (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity, 10) || 0)
        if (item.discount_type === 'percent') {
          const pct = parseFloat(value) || 0
          if (pct > 100) return 'Discount percentage 100% se zyada nahi ho sakta (Max 100%)'
          const flatAmount = itemTotal * pct / 100
          if (flatAmount > itemTotal) {
            return 'Discount total amount se zyada nahi ho sakta (Discount cannot exceed total amount)'
          }
          return ''
        }
        const flat = parseFloat(value) || 0
        if (flat > itemTotal) {
          return 'Discount total amount se zyada nahi ho sakta (Discount cannot exceed total amount)'
        }
        return ''
      }
      default:
        return ''
    }
  }

  const updateItem = (id, field, value) => {
    const updatedItems = items.map((i) => {
      if (i.id !== id) return i
      return { ...i, [field]: value }
    })
    setItems(updatedItems)

    const updatedItem = updatedItems.find((i) => i.id === id)
    const error = validateItemField(updatedItem, field, value)
    setItemErrors((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: error },
    }))
    setTouchedItems((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: true },
    }))
  }

  const toggleItemDiscountType = (id) => {
    setItems(
      items.map((i) => {
        if (i.id !== id) return i
        return { ...i, discount_type: i.discount_type === 'flat' ? 'percent' : 'flat', discount: 0 }
      })
    )
  }

  const getItemDiscountFlat = (item) => {
    const itemTotal = (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity, 10) || 0)
    if (item.discount_type === 'percent') {
      return itemTotal * (parseFloat(item.discount) || 0) / 100
    }
    return parseFloat(item.discount) || 0
  }

  const subtotal = items.reduce(
    (sum, i) => sum + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity, 10) || 0),
    0
  )
  const itemDiscount = items.reduce((sum, i) => sum + getItemDiscountFlat(i), 0)
  const totalDiscount = itemDiscount + (parseFloat(discount) || 0)
  const taxAmount = ((subtotal - itemDiscount) * (parseFloat(tax) || 0)) / 100
  const total = subtotal - itemDiscount + taxAmount
  const balanceDue = total - (parseFloat(amountPaid) || 0)
  const change = balanceDue < 0 ? Math.abs(balanceDue) : 0

  const resetForm = () => {
    setSelectedCustomer(null)
    setCustomerSearch('')
    setSaleDate(dayjs().format('YYYY-MM-DD'))
    setSaleType('retail')
    setItems([])
    setDiscount(0)
    setTax(0)
    setAmountPaid(0)
    setPaymentMethod('cash')
    setNotes('')
    setSubmitting(false)
    setDateError('')
    setDateTouched(false)
    setCustomerError('')
    setCustomerTouched(false)
    setItemErrors({})
    setTouchedItems({})
    setDiscountError('')
    setDiscountTouched(false)
    setItemsRequiredError('')
    setFormSubmitted(false)
    setAmountPaidWarning('')
  }

  const openAddModal = () => {
    resetForm()
    setModalOpen(true)
  }

  const validateForm = () => {
    let isValid = true

    if (!selectedCustomer) {
      setCustomerError('Customer select karein (Please select a customer)')
      setCustomerTouched(true)
      isValid = false
    } else {
      setCustomerError('')
      setCustomerTouched(true)
    }

    if (items.length === 0) {
      setItemsRequiredError('Kam az kam ek product add karein (Add at least one product)')
      isValid = false
    } else {
      setItemsRequiredError('')
      items.forEach((item) => {
        const errs = {}
        if (!item.product_id) {
          errs.product = 'Product select karein (Please select a product)'
          isValid = false
        }
        const qtyErr = validateItemField(item, 'quantity', item.quantity)
        if (qtyErr) {
          errs.quantity = qtyErr
          isValid = false
        }
        const priceErr = validateItemField(item, 'unit_price', item.unit_price)
        if (priceErr) {
          errs.unit_price = priceErr
          isValid = false
        }
        const discErr = validateItemField(item, 'discount', item.discount)
        if (discErr) {
          errs.discount = discErr
          isValid = false
        }
        setItemErrors((prev) => ({
          ...prev,
          [item.id]: { ...(prev[item.id] || {}), ...errs },
        }))
        setTouchedItems((prev) => ({
          ...prev,
          [item.id]: { product: true, quantity: true, unit_price: true, discount: true },
        }))
      })
    }

    const discVal = parseFloat(discount) || 0
    if (discVal > subtotal) {
      setDiscountError('Discount total amount se zyada nahi ho sakta (Discount cannot exceed total amount)')
      setDiscountTouched(true)
      isValid = false
    } else {
      setDiscountError('')
      setDiscountTouched(true)
    }

    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormSubmitted(true)

    if (!validateForm()) return

    setSubmitting(true)
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        sale_date: saleDate,
        sale_type: saleType,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: parseInt(i.quantity, 10) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
          discount: getItemDiscountFlat(i),
        })),
        discount: parseFloat(discount) || 0,
        tax: parseFloat(tax) || 0,
        amount_paid: parseFloat(amountPaid) || 0,
        payment_method: paymentMethod,
        notes,
      }
      await api.post('/sales', payload)
      toast.success('Sale created successfully')
      setModalOpen(false)
      fetchSales(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create sale')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const sale = deleteConfirm.sale
    if (!sale) return
    try {
      await api.delete(`/sales/${sale.id}`)
      toast.success('Sale deleted and stock reversed')
      setDeleteConfirm({ open: false, sale: null })
      fetchSales(page)
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete sale')
    }
  }

  const handleRowClick = (sale) => {
    navigate(`/sales/${sale.id}`)
  }

  const columns = [
    { key: 'invoice_no', label: 'Invoice #', render: (val) => <span className="font-medium text-gray-900">{val || '-'}</span> },
    { key: 'customer_name', label: 'Customer' },
    {
      key: 'sale_date',
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
      key: 'sale_type',
      label: 'Sale Type',
      render: (val) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 uppercase">
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
            onClick={(e) => { e.stopPropagation(); navigate(`/sales/${row.id}`) }}
            className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-150"
          >
            View
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/sales/${row.id}`) }}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-150"
          >
            Print Invoice
          </button>
          <PermissionGuard roles={['admin']}>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, sale: row }) }}
              className="px-3 py-1.5 text-xs font-medium text-danger-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
            >
              Delete
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  const getInputClass = (error, touched, warning) => {
    let cls = 'w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition'
    if (error && touched) {
      cls += ' border-red-500 focus:ring-red-500 focus:border-red-500'
    } else if (warning) {
      cls += ' border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500'
    } else if (touched && !error) {
      cls += ' border-green-500 focus:ring-green-500 focus:border-green-500'
    } else {
      cls += ' border-gray-300 focus:ring-primary-500 focus:border-primary-500'
    }
    return cls
  }

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
  const selectClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-white'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Sales</h1>
        <PermissionGuard roles={['admin', 'manager', 'staff']}>
          <button
            onClick={openAddModal}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150 shadow-sm"
          >
            + New Sale
          </button>
        </PermissionGuard>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:min-w-[200px] sm:max-w-xs" ref={customerRef}>
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value)
              setCustomerDropdownOpen(true)
            }}
            onFocus={() => setCustomerDropdownOpen(true)}
            placeholder="Search customer..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
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
        <select
          value={saleTypeFilter}
          onChange={(e) => setSaleTypeFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Sale Types</option>
          <option value="retail">Retail</option>
          <option value="wholesale">Wholesale</option>
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
          data={sales}
          loading={loading}
          emptyMessage="No sales found"
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={fetchSales}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Sale" size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative" ref={customerRef}>
              <label className={labelClass}>Customer *</label>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setCustomerDropdownOpen(true)
                  setSelectedCustomer(null)
                  if (e.target.value) setCustomerError('')
                }}
                onFocus={() => setCustomerDropdownOpen(true)}
                onBlur={() => {
                  setCustomerTouched(true)
                  if (!selectedCustomer) {
                    setCustomerError('Customer select karein (Please select a customer)')
                  }
                }}
                placeholder="Search customer..."
                className={getInputClass(!!customerError, customerTouched)}
              />
              {customerDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.length ? (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCustomerSelect(c)}
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
              {customerError && customerTouched && (
                <p className="text-red-500 text-xs mt-1">{customerError}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Sale Date</label>
              <input
                type="date"
                value={saleDate}
                min={dayjs().subtract(5, 'year').format('YYYY-MM-DD')}
                max={dayjs().format('YYYY-MM-DD')}
                onChange={(e) => {
                  setSaleDate(e.target.value)
                  setDateTouched(true)
                  validateDate(e.target.value)
                }}
                className={getInputClass(!!dateError, dateTouched)}
              />
              {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
            </div>
            <div>
              <label className={labelClass}>Sale Type</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setSaleType('retail')
                    setItems(items.map((i) => ({ ...i, unit_price: 0 })))
                  }}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    saleType === 'retail'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Retail
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaleType('wholesale')
                    setItems(items.map((i) => ({ ...i, unit_price: 0 })))
                  }}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    saleType === 'wholesale'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Wholesale
                </button>
              </div>
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
            {itemsRequiredError && formSubmitted && (
              <p className="text-red-500 text-xs mb-2">{itemsRequiredError}</p>
            )}
            {items.length === 0 && !itemsRequiredError && (
              <div className="text-center py-6 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
                No items added yet. Click &ldquo;Add Item&rdquo; to add products.
              </div>
            )}
            {items.map((item, idx) => {
              const errs = itemErrors[item.id] || {}
              const t = touchedItems[item.id] || {}
              const itemTotal = (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity, 10) || 0)
              const discountFlat = getItemDiscountFlat(item)
              const getItemFieldClass = (field) => {
                const hasErr = !!errs[field]
                const isTouched = !!t[field]
                if (hasErr && isTouched) return 'border-red-500 focus:ring-red-500 focus:border-red-500'
                if (!hasErr && isTouched) return 'border-green-500 focus:ring-green-500 focus:border-green-500'
                return 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
              }
              return (
                <div key={item.id} className="flex flex-wrap items-end gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-[200px] relative">
                    <label className="text-xs text-gray-500 mb-1 block">Product</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={openProductIdx === idx ? productSearch : item.product_name}
                        onChange={(e) => {
                          setOpenProductIdx(idx)
                          setProductSearch(e.target.value)
                        }}
                        onFocus={() => {
                          setOpenProductIdx(idx)
                          setProductSearch('')
                        }}
                        placeholder="Search product..."
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 outline-none transition ${getItemFieldClass('product')}`}
                      />
                      <button
                        type="button"
                        onClick={() => setScannerOpenFor(item.id)}
                        className="px-2 py-2 border border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Scan barcode / QR / IMEI"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      </button>
                    </div>
                    {errs.product && t.product && (
                      <p className="text-red-500 text-xs mt-1">{errs.product}</p>
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
                              {p.name} - {currencyFormat(p.selling_price)}
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
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 outline-none transition ${getItemFieldClass('quantity')}`}
                    />
                    {errs.quantity && t.quantity && (
                      <p className="text-red-500 text-xs mt-1">{errs.quantity}</p>
                    )}
                  </div>
                  <div className="w-28">
                    <label className="text-xs text-gray-500 mb-1 block">Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 outline-none transition ${getItemFieldClass('unit_price')}`}
                    />
                    {errs.unit_price && t.unit_price && (
                      <p className="text-red-500 text-xs mt-1">{errs.unit_price}</p>
                    )}
                  </div>
                  <div className="w-28">
                    <label className="text-xs text-gray-500 mb-1 block">Discount</label>
                    <div className="flex">
                      <input
                        type="number"
                        step={item.discount_type === 'percent' ? '1' : '0.01'}
                        min="0"
                        max={item.discount_type === 'percent' ? '100' : undefined}
                        value={item.discount}
                        onChange={(e) => updateItem(item.id, 'discount', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-l-lg text-sm focus:ring-2 outline-none transition ${getItemFieldClass('discount')}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleItemDiscountType(item.id)}
                        className={`px-2 py-2 text-xs font-medium border-t border-b border-r rounded-r-lg transition-colors duration-150 ${
                          item.discount_type === 'percent'
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        {item.discount_type === 'percent' ? '%' : 'Rs.'}
                      </button>
                    </div>
                    {item.discount_type === 'percent' && parseFloat(item.discount) > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Flat: {currencyFormat(discountFlat)}
                      </p>
                    )}
                    {errs.discount && t.discount && (
                      <p className="text-red-500 text-xs mt-1">{errs.discount}</p>
                    )}
                  </div>
                  <div className="text-right min-w-[80px] pb-1">
                    <label className="text-xs text-gray-500 mb-1 block">Total</label>
                    <p className="text-sm font-semibold text-gray-900">
                      {currencyFormat(itemTotal - discountFlat)}
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
                onChange={(e) => {
                  setDiscount(e.target.value)
                  setDiscountTouched(true)
                  const val = parseFloat(e.target.value) || 0
                  if (val > subtotal) {
                    setDiscountError('Discount total amount se zyada nahi ho sakta (Discount cannot exceed total amount)')
                  } else {
                    setDiscountError('')
                  }
                }}
                className={getInputClass(!!discountError, discountTouched)}
              />
              {discountError && <p className="text-red-500 text-xs mt-1">{discountError}</p>}
            </div>
            <div>
              <label className={labelClass}>Tax (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
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
                onChange={(e) => {
                  const val = e.target.value
                  setAmountPaid(val)
                  const paid = parseFloat(val) || 0
                  if (paid > total && total > 0) {
                    setAmountPaidWarning(
                      `Amount paid total se zyada hai — change dena hoga: ${currencyFormat(paid - total)} (Amount paid exceeds total — change to be given: ${currencyFormat(paid - total)})`
                    )
                  } else {
                    setAmountPaidWarning('')
                  }
                }}
                className={getInputClass(false, false, !!amountPaidWarning)}
              />
              {amountPaidWarning && (
                <p className="text-yellow-600 text-xs mt-1 flex items-center gap-1">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {amountPaidWarning}
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
              <label className={labelClass}>Notes</label>
              <textarea
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${notes.length > 400 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                  {notes.length}/500
                </span>
              </div>
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
              {submitting ? 'Creating...' : 'Create Sale'}
            </button>
          </div>
        </form>
      </Modal>

      <BarcodeScanner
        isOpen={scannerOpenFor !== null}
        onClose={() => setScannerOpenFor(null)}
        onScanSuccess={(value) => handleScan(value, scannerOpenFor)}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, sale: null })}
        onConfirm={handleDelete}
        title="Delete Sale"
        message={`Are you sure you want to delete sale invoice #${deleteConfirm.sale?.invoice_no || ''}? Stock will be reversed.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
