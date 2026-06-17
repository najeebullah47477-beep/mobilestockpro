import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import DataTable from '../components/DataTable'
import api from '../api/axios'

const currencyFormat = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value ?? 0)

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/products/${id}`)
      if (res.data.success) {
        setProduct(res.data.data.product || res.data.data)
      } else {
        setProduct(res.data.data || res.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProduct()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Product not found</p>
        <button
          onClick={() => navigate('/products')}
          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm transition-colors duration-150"
        >
          Back to Products
        </button>
      </div>
    )
  }

  const isDevice = product.category?.category_type === 'device'

  const infoItems = [
    { label: 'Name', value: product.name },
    { label: 'SKU', value: product.sku },
    { label: 'IMEI', value: product.imei },
    { label: 'Barcode', value: product.barcode },
    { label: 'Category', value: product.category_name || product.category?.name },
    { label: 'Brand', value: product.brand_name || product.brand?.name },
    { label: 'Supplier', value: product.supplier_name || product.supplier?.name },
    { label: 'Color', value: product.color },
    { label: 'Condition', value: product.condition },
    {
      label: 'Stock',
      value: product.stock_quantity,
      render: (val) => {
        const threshold = product.low_stock_threshold || 5
        return (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              val === 0
                ? 'bg-red-100 text-red-700'
                : val <= threshold
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {val}
          </span>
        )
      },
    },
    { label: 'Purchase Price', value: currencyFormat(product.purchase_price) },
    { label: 'Selling Price', value: currencyFormat(product.selling_price) },
    { label: 'Wholesale Price', value: currencyFormat(product.wholesale_price) },
    { label: 'Low Stock Threshold', value: product.low_stock_threshold },
    { label: 'Location', value: product.location_in_store },
    { label: 'Warranty (Months)', value: product.warranty_months },
    { label: 'Description', value: product.description },
    {
      label: 'Status',
      value: product.is_active !== false ? 'Active' : 'Inactive',
      render: (val) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            val === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {val}
        </span>
      ),
    },
  ]

  const stockMovementColumns = [
    { key: 'type', label: 'Type' },
    { key: 'reference', label: 'Reference' },
    {
      key: 'quantity',
      label: 'Quantity',
      render: (val, row) => (
        <span className={row.type === 'sale' ? 'text-red-600' : 'text-green-600'}>
          {row.type === 'sale' ? `-${val}` : `+${val}`}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => val ? dayjs(val).format('DD MMM YYYY') : '-',
    },
  ]

  const warrantyColumns = [
    {
      key: 'start_date',
      label: 'Start Date',
      render: (val) => val ? dayjs(val).format('DD MMM YYYY') : '-',
    },
    {
      key: 'end_date',
      label: 'End Date',
      render: (val) => val ? dayjs(val).format('DD MMM YYYY') : '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            val === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {val || 'Active'}
        </span>
      ),
    },
  ]

  const purchases = product.purchases || []
  const sales = product.sales || []
  const stockMovements = [
    ...purchases.map((p) => ({ ...p, type: 'purchase' })),
    ...sales.map((s) => ({ ...s, type: 'sale' })),
  ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))

  const warranties = product.warranties || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/products')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m7-7l-7 7 7 7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
        </div>
        <button
          onClick={() => navigate('/products')}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
        >
          Edit Product
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h2>
        {product.image_url && (
          <div className="mb-4">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-24 h-24 object-cover rounded-lg border border-gray-200"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {infoItems.map((item) => (
            <div key={item.label} className="border-b border-gray-100 pb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wider">{item.label}</span>
              <div className="text-sm font-medium text-gray-900 mt-0.5">
                {item.render ? item.render(item.value) : item.value || '-'}
              </div>
            </div>
          ))}
        </div>
      </div>

        {isDevice && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Specifications</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">IMEI</span>
                <div className="text-sm font-medium text-gray-900 mt-0.5">{product.imei || 'Not provided'}</div>
              </div>
              <div className="border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">RAM</span>
                <div className="text-sm font-medium text-gray-900 mt-0.5">{product.ram || 'Not provided'}</div>
              </div>
              <div className="border-b border-gray-100 pb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Storage</span>
                <div className="text-sm font-medium text-gray-900 mt-0.5">{product.storage_capacity || 'Not provided'}</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Movement</h2>
        <DataTable
          columns={stockMovementColumns}
          data={stockMovements}
          emptyMessage="No stock movements recorded"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Warranties</h2>
        <DataTable
          columns={warrantyColumns}
          data={warranties}
          emptyMessage="No warranties found"
        />
      </div>
    </div>
  )
}
