import { useState, useEffect } from 'react'
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
import FormField from '../components/FormField'
import { useInputMask } from '../hooks/useInputMask'
import { useAsyncValidation } from '../hooks/useAsyncValidation'
import api from '../api/axios'

const currencyFormat = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value ?? 0)

const generateSKU = () => `SKU-${Date.now()}`

const conditionOptions = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'refurbished', label: 'Refurbished' },
]

const warrantyOptions = [
  { value: 0, label: 'No Warranty' },
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
  { value: 12, label: '1 Year' },
  { value: 18, label: '18 Months' },
  { value: 24, label: '2 Years' },
  { value: 36, label: '3 Years' },
]

const extractList = (res) => {
  const raw = res.data?.data ?? res.data
  if (Array.isArray(raw)) return raw
  const arr = Object.values(raw).find(Array.isArray)
  return arr || []
}

const luhnCheck = (num) => {
  let sum = 0, alt = false
  for (let i = num.length - 1; i >= 0; i--) {
    let d = parseInt(num[i], 10)
    if (alt) { d *= 2; if (d > 9) d -= 9 }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

const isDeviceCategory = (categoryId, categories) => {
  const cat = categories.find(c => String(c.id) === String(categoryId))
  return cat?.category_type === 'device'
}

const inputBase = 'w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition'

export default function Products() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [conditionFilter, setConditionFilter] = useState('')
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, product: null })
  const [submitting, setSubmitting] = useState(false)
  const [imeiLuhnResult, setImeiLuhnResult] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm({ mode: 'onChange' })

  const { maskSKU, maskIMEI, maskPrice, maskPositiveInt } = useInputMask()
  const { loading: asyncLoading, results: asyncResults, checkAvailability, resetResult } = useAsyncValidation()

  const watchCondition = watch('condition')
  const watchDescription = watch('description')
  const watchPurchasePrice = watch('purchase_price')
  const watchSellingPrice = watch('selling_price')
  const watchStockQty = watch('stock_quantity')
  const watchLowThreshold = watch('low_stock_threshold')
  const watchImei = watch('imei')

  const showPriceWarning = watchPurchasePrice && watchSellingPrice &&
    parseFloat(watchSellingPrice) < parseFloat(watchPurchasePrice)

  const showLowStockWarning = watchLowThreshold && watchStockQty &&
    parseInt(watchLowThreshold) >= parseInt(watchStockQty)

  const watchCategoryId = watch('category_id')
  const showDeviceFields = isDeviceCategory(watchCategoryId, categories)

  const fetchProducts = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, per_page: 20 }
      if (search) params.search = search
      if (categoryFilter) params.category_id = categoryFilter
      if (brandFilter) params.brand_id = brandFilter
      if (conditionFilter) params.condition = conditionFilter
      const res = await api.get('/products', { params })
      if (res.data.success) {
        setProducts(res.data.data.products)
        setTotalPages(res.data.data.total_pages)
        setPage(res.data.data.current_page)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [catRes, brandRes, supRes] = await Promise.all([
          api.get('/categories'),
          api.get('/brands'),
          api.get('/suppliers'),
        ])
        setCategories(extractList(catRes))
        setBrands(extractList(brandRes))
        setSuppliers(extractList(supRes))
      } catch {
        // silent
      }
    }
    fetchFilters()
  }, [])

  useEffect(() => {
    fetchProducts(1)
  }, [search, categoryFilter, brandFilter, conditionFilter])

  useEffect(() => {
    if (!showDeviceFields && watchCategoryId) {
      setValue('imei', '')
      setValue('ram', '')
      setValue('storage_capacity', '')
    }
  }, [watchCategoryId])

  const openAddModal = () => {
    setEditingProduct(null)
    setImeiLuhnResult(null)
    reset({
      name: '',
      sku: generateSKU(),
      imei: '',
      barcode: '',
      category_id: '',
      brand_id: '',
      supplier_id: '',
      color: '',
      storage_capacity: '',
      ram: '',
      condition: '',
      reason: '',
      purchase_price: '',
      selling_price: '',
      wholesale_price: '',
      stock_quantity: '',
      low_stock_threshold: '',
      location_in_store: '',
      warranty_months: '',
      description: '',
      image_url: '',
    })
    setModalOpen(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setImeiLuhnResult(null)
    reset({
      name: product.name || '',
      sku: product.sku || '',
      imei: product.imei || '',
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      brand_id: product.brand_id || '',
      supplier_id: product.supplier_id || '',
      color: product.color || '',
      storage_capacity: product.storage_capacity || '',
      ram: product.ram || '',
      condition: product.condition || '',
      reason: product.reason || '',
      purchase_price: product.purchase_price ?? '',
      selling_price: product.selling_price ?? '',
      wholesale_price: product.wholesale_price ?? '',
      stock_quantity: product.stock_quantity ?? '',
      low_stock_threshold: product.low_stock_threshold ?? '',
      location_in_store: product.location_in_store || '',
      warranty_months: product.warranty_months ?? '',
      description: product.description || '',
      image_url: product.image_url || '',
    })
    setModalOpen(true)
  }

  const onFormSubmit = async (data) => {
    const condition = data.condition
    if ((condition === 'used' || condition === 'refurbished') && !data.reason?.trim()) {
      setError('reason', {
        type: 'manual',
        message: 'Reason zaroori hai (Reason is required) for used/refurbished items',
      })
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: data.name?.trim(),
        sku: data.sku?.trim() || '',
        barcode: data.barcode?.trim() || null,

        category_id: data.category_id ? parseInt(data.category_id) : null,
        brand_id: data.brand_id ? parseInt(data.brand_id) : null,
        supplier_id: data.supplier_id ? parseInt(data.supplier_id) : null,

        color: data.color?.trim() || null,
        condition: data.condition || 'new',

        purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : 0,
        selling_price: data.selling_price ? parseFloat(data.selling_price) : 0,
        wholesale_price: data.wholesale_price ? parseFloat(data.wholesale_price) : null,

        stock_quantity: data.stock_quantity ? parseInt(data.stock_quantity) : 0,
        low_stock_threshold: data.low_stock_threshold ? parseInt(data.low_stock_threshold) : 5,

        location_in_store: data.location_in_store?.trim() || null,
        warranty_months: data.warranty_months ? parseInt(data.warranty_months) : 12,
        description: data.description?.trim() || null,
        image_url: data.image_url?.trim() || null,
      }

      if (showDeviceFields) {
        payload.imei = data.imei?.trim() || null
        payload.ram = data.ram || null
        payload.storage_capacity = data.storage_capacity || null
      } else {
        payload.imei = null
        payload.ram = null
        payload.storage_capacity = null
      }

      console.log('Sending product payload:', payload)

      let response
      if (editingProduct) {
        response = await api.put(`/products/${editingProduct.id}`, payload)
      } else {
        response = await api.post('/products', payload)
      }

      if (response.data.success) {
        toast.success(editingProduct ? 'Product updated!' : 'Product added!')
        setModalOpen(false)
        reset()
        fetchProducts(page)
      } else {
        toast.error(response.data.error || 'Something went wrong')
      }
    } catch (error) {
      console.error('Product save error:', error)

      if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else if (error.response?.data?.details) {
        const firstError = Object.values(error.response.data.details)[0]
        toast.error(firstError)
      } else {
        toast.error('Failed to save product. Check console for details.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const product = deleteConfirm.product
    if (!product) return
    try {
      await api.delete(`/products/${product.id}`)
      toast.success('Product deleted successfully')
      setDeleteConfirm({ open: false, product: null })
      fetchProducts(page)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product')
    }
  }

  const handleExport = async () => {
    try {
      const response = await api.get('/reports/export-stock', {
        params: { format: 'xlsx' },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `products_export_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Export downloaded successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export products')
    }
  }

  const handleRowClick = (product) => {
    navigate(`/products/${product.id}`)
  }

  const columns = [
    {
      key: 'image',
      label: 'Image',
      render: (_, row) => (
        <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
          {row.name?.charAt(0).toUpperCase() || '?'}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (val, row) => (
        <span
          className="text-primary-600 hover:text-primary-800 cursor-pointer font-medium"
          onClick={(e) => { e.stopPropagation(); handleRowClick(row) }}
        >
          {val}
        </span>
      ),
    },
    { key: 'sku', label: 'SKU' },
    { key: 'brand_name', label: 'Brand' },
    { key: 'category_name', label: 'Category' },
    { key: 'condition', label: 'Condition' },
    {
      key: 'stock_quantity',
      label: 'Stock',
      render: (val, row) => {
        const threshold = row.low_stock_threshold || 5
        const isLow = val <= threshold
        return (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              val === 0
                ? 'bg-red-100 text-red-700'
                : isLow
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {val}
          </span>
        )
      },
    },
    {
      key: 'purchase_price',
      label: 'Purchase Price',
      render: (val) => currencyFormat(val),
    },
    {
      key: 'selling_price',
      label: 'Selling Price',
      render: (val) => currencyFormat(val),
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
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, product: row }) }}
              className="px-3 py-1.5 text-xs font-medium text-danger-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
            >
              Delete
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ]

  const nameReg = register('name', {
    required: 'Name zaroori hai (Name is required)',
    minLength: { value: 2, message: 'Name kam az kam 2 characters ka hona chahiye (Name must be at least 2 characters)' },
    maxLength: { value: 150 },
    pattern: { value: /^[a-zA-Z0-9\s\-'.]+$/, message: 'Name mein sirf letters, numbers, space, dash, dot aur apostrophe ho sakta hai' },
  })

  const skuReg = register('sku', {
    pattern: { value: /^[A-Za-z0-9\-]+$/, message: 'SKU sirf letters, numbers aur dash ho sakta hai (SKU can only contain letters, numbers, and dash)' },
    minLength: { value: 3, message: 'SKU kam az kam 3 characters ka hona chahiye' },
    maxLength: { value: 50 },
  })

  const imeiReg = register('imei', {
    pattern: showDeviceFields
      ? { value: /^[0-9]{15}$/, message: 'IMEI exactly 15 digits ka hona chahiye (IMEI must be exactly 15 digits)' }
      : undefined,
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex gap-3">
          <PermissionGuard roles={['admin', 'manager']}>
            <button
              onClick={handleExport}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
            >
              Export Excel
            </button>
          </PermissionGuard>
          <PermissionGuard roles={['admin', 'manager']}>
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
            >
              Add Product
            </button>
          </PermissionGuard>
        </div>
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search products..."
        filters={[
          {
            key: 'category_id',
            value: categoryFilter,
            onChange: setCategoryFilter,
            label: 'All Categories',
            options: categories.map((c) => ({ value: c.id, label: c.name })),
          },
          {
            key: 'brand_id',
            value: brandFilter,
            onChange: setBrandFilter,
            label: 'All Brands',
            options: brands.map((b) => ({ value: b.id, label: b.name })),
          },
          {
            key: 'condition',
            value: conditionFilter,
            onChange: setConditionFilter,
            label: 'All Conditions',
            options: conditionOptions,
          },
        ]}
      />

      <div>
        <DataTable
          columns={columns}
          data={products}
          loading={loading}
          emptyMessage="No products found"
        />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={fetchProducts}
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name"
              required
              error={errors.name?.message}
              touched={touchedFields.name || isSubmitted}
            >
              <input
                name={nameReg.name}
                ref={nameReg.ref}
                defaultValue=""
                onChange={nameReg.onChange}
                onBlur={(e) => {
                  const val = e.target.value
                  if (val) {
                    setValue('name', val.charAt(0).toUpperCase() + val.slice(1), { shouldValidate: true, shouldDirty: true })
                  }
                  nameReg.onBlur(e)
                }}
                className={`${inputBase} ${errors.name && (touchedFields.name || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
              />
            </FormField>

            <FormField
              label="SKU"
              hint="Auto-generated if empty"
              error={
                errors.sku?.message ||
                (asyncResults.sku && asyncResults.sku.available === false ? 'SKU already taken' : undefined)
              }
              success={asyncResults.sku?.available === true}
              loading={asyncLoading.sku}
              touched={touchedFields.sku || isSubmitted}
            >
              <input
                name={skuReg.name}
                ref={skuReg.ref}
                onBlur={skuReg.onBlur}
                onChange={(e) => {
                  const masked = maskSKU(e.target.value)
                  setValue('sku', masked, { shouldValidate: true, shouldDirty: true })
                  if (masked.length >= 3) {
                    checkAvailability('/products/check-sku', { sku: masked, exclude_id: editingProduct?.id || undefined }, 'sku')
                  } else {
                    resetResult('sku')
                  }
                }}
                className={`${inputBase} ${(errors.sku || asyncResults.sku?.available === false) && (touchedFields.sku || isSubmitted) ? 'border-red-400' : asyncResults.sku?.available === true && (touchedFields.sku || isSubmitted) ? 'border-green-400' : 'border-gray-300'}`}
              />
            </FormField>

            {showDeviceFields && (
              <FormField
                label="IMEI"
                error={errors.imei?.message}
                touched={touchedFields.imei || isSubmitted}
              >
                <div className="flex gap-2">
                  <input
                    name={imeiReg.name}
                    ref={imeiReg.ref}
                    maxLength={15}
                    placeholder="Enter 15-digit IMEI"
                    onBlur={(e) => {
                      const val = e.target.value
                      if (val && val.length === 15 && /^[0-9]{15}$/.test(val)) {
                        checkAvailability('/products/check-imei', { imei: val, exclude_id: editingProduct?.id }, 'imei')
                      }
                      imeiReg.onBlur(e)
                    }}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 15)
                      setValue('imei', val, { shouldValidate: true, shouldDirty: true })
                      setImeiLuhnResult(null)
                    }}
                    className={`flex-1 ${inputBase} ${errors.imei && (touchedFields.imei || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="px-2.5 py-2.5 border border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Scan IMEI barcode / QR"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const val = watchImei
                      if (val && val.length === 15 && /^[0-9]{15}$/.test(val)) {
                        setImeiLuhnResult(luhnCheck(val))
                      }
                    }}
                    className="px-3 py-2.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    disabled={!watchImei || watchImei.length !== 15}
                  >
                    Verify IMEI
                  </button>
                  {imeiLuhnResult !== null && (
                    <span className={`flex items-center text-lg font-bold ${imeiLuhnResult ? 'text-green-600' : 'text-red-600'}`}>
                      {imeiLuhnResult ? '✓' : '✗'}
                    </span>
                  )}
                </div>
              </FormField>
            )}

            <FormField
              label="Barcode"
              error={errors.barcode?.message}
              touched={touchedFields.barcode || isSubmitted}
            >
              <input
                type="text"
                {...register('barcode', {
                  minLength: { value: 4, message: 'Barcode 4 se 20 characters ka hona chahiye' },
                  maxLength: { value: 20, message: 'Barcode 4 se 20 characters ka hona chahiye' },
                  pattern: { value: /^[a-zA-Z0-9]+$/, message: 'Barcode sirf alphanumeric ho sakta hai' },
                })}
                className={`${inputBase} ${errors.barcode && (touchedFields.barcode || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
              />
            </FormField>

            <div>
              <FormField label="Category" required error={errors.category_id?.message} touched={touchedFields.category_id || isSubmitted}>
                <select
                  {...register('category_id', { required: 'Category is required' })}
                  className={`${inputBase} bg-white ${errors.category_id && (touchedFields.category_id || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
              {watchCategoryId && (
                <div className="mt-2">
                  {showDeviceFields ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      Device Category — IMEI, RAM, Storage fields shown
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Accessory Category — IMEI, RAM, Storage fields hidden
                    </span>
                  )}
                </div>
              )}
            </div>

            <FormField label="Brand" required error={errors.brand_id?.message} touched={touchedFields.brand_id || isSubmitted}>
              <select
                {...register('brand_id', { required: 'Brand is required' })}
                className={`${inputBase} bg-white ${errors.brand_id && (touchedFields.brand_id || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">Select Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </FormField>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                {...register('supplier_id')}
                className={`${inputBase} bg-white border-gray-300`}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                {...register('color')}
                className={`${inputBase} border-gray-300`}
              />
            </div>

            {showDeviceFields && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Capacity</label>
                <select
                  {...register('storage_capacity')}
                  className={`${inputBase} bg-white border-gray-300`}
                >
                  <option value="">Select Storage</option>
                  <option value="8GB">8GB</option>
                  <option value="16GB">16GB</option>
                  <option value="32GB">32GB</option>
                  <option value="64GB">64GB</option>
                  <option value="128GB">128GB</option>
                  <option value="256GB">256GB</option>
                  <option value="512GB">512GB</option>
                  <option value="1TB">1TB</option>
                </select>
              </div>
            )}

            {showDeviceFields && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RAM</label>
                <select
                  {...register('ram')}
                  className={`${inputBase} bg-white border-gray-300`}
                >
                  <option value="">Select RAM</option>
                  <option value="1GB">1GB</option>
                  <option value="2GB">2GB</option>
                  <option value="3GB">3GB</option>
                  <option value="4GB">4GB</option>
                  <option value="6GB">6GB</option>
                  <option value="8GB">8GB</option>
                  <option value="12GB">12GB</option>
                  <option value="16GB">16GB</option>
                </select>
              </div>
            )}

            <FormField label="Condition" required error={errors.condition?.message} touched={touchedFields.condition || isSubmitted}>
              <select
                {...register('condition', { required: 'Condition is required' })}
                onChange={(e) => {
                  const val = e.target.value
                  setValue('condition', val, { shouldValidate: true, shouldDirty: true })
                  if (val !== 'used' && val !== 'refurbished') {
                    setValue('reason', '', { shouldValidate: true, shouldDirty: true })
                  }
                }}
                className={`${inputBase} bg-white ${errors.condition && (touchedFields.condition || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">Select Condition</option>
                {conditionOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>

            {(watchCondition === 'used' || watchCondition === 'refurbished') && (
              <div className="md:col-span-2">
                <FormField label="Reason / Description" required error={errors.reason?.message} touched={touchedFields.reason || isSubmitted}>
                  <textarea
                    rows={3}
                    {...register('reason', {
                      required: watchCondition === 'used' || watchCondition === 'refurbished' ? 'Reason zaroori hai (Reason is required) for used/refurbished items' : false,
                      maxLength: { value: 500, message: 'Reason 500 characters se kam hona chahiye' },
                    })}
                    className={`${inputBase} resize-y ${errors.reason && (touchedFields.reason || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
                  />
                </FormField>
              </div>
            )}

            <FormField label="Purchase Price" required error={errors.purchase_price?.message} touched={touchedFields.purchase_price || isSubmitted}>
              <input
                type="text"
                inputMode="decimal"
                {...register('purchase_price', {
                  required: 'Purchase price is required',
                  min: { value: 1, message: 'Price 0 se zyada honi chahiye (Price must be greater than 0)' },
                  validate: (val) => !val || /^\d+(\.\d{1,2})?$/.test(val) || 'Sirf 2 decimal places allowed hain (Only 2 decimal places allowed)',
                })}
                onChange={(e) => {
                  const masked = maskPrice(e.target.value)
                  setValue('purchase_price', masked, { shouldValidate: true, shouldDirty: true })
                }}
                className={`${inputBase} ${errors.purchase_price && (touchedFields.purchase_price || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
              />
            </FormField>

            <FormField
              label="Selling Price"
              required
              error={errors.selling_price?.message}
              warning={showPriceWarning ? 'Selling price purchase price se kam hai — kya yeh sahi hai? (Selling price is less than purchase price — is this correct?)' : undefined}
              touched={touchedFields.selling_price || isSubmitted}
            >
              <input
                type="text"
                inputMode="decimal"
                {...register('selling_price', {
                  required: 'Selling price is required',
                  min: { value: 1, message: 'Price 0 se zyada honi chahiye (Price must be greater than 0)' },
                  validate: (val) => !val || /^\d+(\.\d{1,2})?$/.test(val) || 'Sirf 2 decimal places allowed hain (Only 2 decimal places allowed)',
                })}
                onChange={(e) => {
                  const masked = maskPrice(e.target.value)
                  setValue('selling_price', masked, { shouldValidate: true, shouldDirty: true })
                }}
                className={`${inputBase} ${errors.selling_price && (touchedFields.selling_price || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
              />
            </FormField>

            <FormField label="Wholesale Price" error={errors.wholesale_price?.message} touched={touchedFields.wholesale_price || isSubmitted}>
              <input
                type="text"
                inputMode="decimal"
                {...register('wholesale_price', {
                  min: { value: 1, message: 'Price 0 se zyada honi chahiye (Price must be greater than 0)' },
                  validate: (val) => !val || /^\d+(\.\d{1,2})?$/.test(val) || 'Sirf 2 decimal places allowed hain (Only 2 decimal places allowed)',
                })}
                onChange={(e) => {
                  const masked = maskPrice(e.target.value)
                  setValue('wholesale_price', masked, { shouldValidate: true, shouldDirty: true })
                }}
                className={`${inputBase} ${errors.wholesale_price && (touchedFields.wholesale_price || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
              />
            </FormField>

            <FormField label="Stock Quantity" required error={errors.stock_quantity?.message} touched={touchedFields.stock_quantity || isSubmitted}>
              <input
                type="text"
                inputMode="numeric"
                {...register('stock_quantity', {
                  required: 'Stock quantity zaroori hai',
                  min: { value: 0, message: 'Quantity 0 se kam nahi ho sakti' },
                  pattern: { value: /^[0-9]+$/, message: 'Quantity sirf positive number hona chahiye' },
                  max: { value: 9999, message: 'Quantity 9999 se zyada nahi ho sakti' },
                })}
                onChange={(e) => {
                  const masked = maskPositiveInt(e.target.value)
                  setValue('stock_quantity', masked, { shouldValidate: true, shouldDirty: true })
                }}
                className={`${inputBase} ${errors.stock_quantity && (touchedFields.stock_quantity || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
              />
            </FormField>

            <FormField
              label="Low Stock Threshold"
              error={errors.low_stock_threshold?.message}
              warning={showLowStockWarning ? 'Low stock threshold stock se zyada hai (Low stock threshold is greater than stock)' : undefined}
              touched={touchedFields.low_stock_threshold || isSubmitted}
            >
              <input
                type="text"
                inputMode="numeric"
                {...register('low_stock_threshold', {
                  min: { value: 0 },
                  validate: (val, formValues) => {
                    if (!val || !formValues.stock_quantity) return true
                    return parseInt(val) < parseInt(formValues.stock_quantity) || 'Low stock threshold stock se zyada hai (Low stock threshold is greater than stock)'
                  },
                })}
                className={`${inputBase} ${errors.low_stock_threshold && (touchedFields.low_stock_threshold || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
              />
            </FormField>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location in Store</label>
              <input
                {...register('location_in_store')}
                placeholder="e.g. Warehouse A, Shelf 3"
                className={`${inputBase} border-gray-300`}
              />
            </div>

            <FormField label="Warranty Months" touched={touchedFields.warranty_months || isSubmitted}>
              <select
                {...register('warranty_months')}
                className={`${inputBase} bg-white border-gray-300`}
              >
                {warrantyOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <input
                {...register('image_url')}
                placeholder="https://example.com/image.jpg"
                className={`${inputBase} border-gray-300`}
              />
            </div>

            <div className="md:col-span-2">
              <FormField
                label="Description"
                maxLength={500}
                currentLength={watchDescription?.length || 0}
                error={errors.description?.message}
                touched={touchedFields.description || isSubmitted}
              >
                <textarea
                  rows={3}
                  {...register('description', { maxLength: { value: 500, message: 'Description 500 characters se kam hona chahiye' } })}
                  className={`${inputBase} resize-y ${errors.description && (touchedFields.description || isSubmitted) ? 'border-red-400' : 'border-gray-300'}`}
                />
              </FormField>
            </div>
          </div>

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
              disabled={submitting || Object.keys(errors).length > 0}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
            >
              {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </Modal>

      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(value) => {
          const cleaned = value.replace(/[^0-9]/g, '').slice(0, 15)
          setValue('imei', cleaned, { shouldValidate: true, shouldDirty: true })
          setScannerOpen(false)
        }}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, product: null })}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteConfirm.product?.name}"? This action can be undone by an admin.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}
