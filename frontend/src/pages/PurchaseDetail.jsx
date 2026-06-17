import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import PrintButton from '../components/PrintButton'
import api from '../api/axios'

const currencyFormat = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value ?? 0)

export default function PurchaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [purchase, setPurchase] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchPurchase = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/purchases/${id}`)
      if (res.data.success) {
        setPurchase(res.data.data.purchase || res.data.data)
      } else {
        setPurchase(res.data.data || res.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load purchase')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchase()
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

  if (!purchase) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Purchase not found</p>
        <button
          onClick={() => navigate('/purchases')}
          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm transition-colors duration-150"
        >
          Back to Purchases
        </button>
      </div>
    )
  }

  const items = purchase.items || []
  const subtotal = purchase.subtotal ?? items.reduce((s, i) => s + (i.unit_cost || 0) * (i.quantity || 0), 0)
  const discount = purchase.discount ?? 0
  const taxAmount = purchase.tax_amount ?? purchase.tax ?? 0
  const totalAmount = purchase.total_amount ?? subtotal + taxAmount - discount
  const paidAmount = purchase.paid_amount ?? 0
  const balanceDue = purchase.balance ?? totalAmount - paidAmount
  const change = balanceDue < 0 ? Math.abs(balanceDue) : 0

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/purchases')}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex gap-3">
          <PrintButton label="Print" />
          <button
            onClick={() => navigate('/purchases')}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-150"
          >
            Back to Purchases
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 print:p-4 print:border-0 print:rounded-none print:shadow-none invoice-content">
        <div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6 print:pb-4 print:mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">MobileStock Pro</h1>
            <p className="text-sm text-gray-500">123 Main Street, Block A</p>
            <p className="text-sm text-gray-500">Lahore, Pakistan</p>
            <p className="text-sm text-gray-500">Phone: +92-300-1234567</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Purchase Invoice</h2>
            <p className="text-sm text-gray-500 mt-1">Invoice #: {purchase.invoice_no || purchase.invoice_number || '-'}</p>
            <p className="text-sm text-gray-500">
              Date: {purchase.purchase_date ? dayjs(purchase.purchase_date).format('DD MMM YYYY') : '-'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Supplier</h3>
            <p className="text-sm font-medium text-gray-900">{purchase.supplier_name || purchase.supplier?.name || '-'}</p>
            {purchase.supplier_phone && <p className="text-sm text-gray-600">{purchase.supplier_phone}</p>}
            {purchase.supplier_address && <p className="text-sm text-gray-600">{purchase.supplier_address}</p>}
          </div>
          <div className="text-right">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Purchase Details</h3>
            {purchase.purchase_person && <p className="text-sm text-gray-600">Purchased by: {purchase.purchase_person}</p>}
          </div>
        </div>

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="border-y border-gray-300">
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Name</th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Cost</th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-gray-400">No items</td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const lineTotal = (item.unit_cost || 0) * (item.quantity || 0)
                return (
                  <tr key={item.id || idx} className="border-b border-gray-200">
                    <td className="py-2.5 px-3 text-sm text-gray-700">{idx + 1}</td>
                    <td className="py-2.5 px-3 text-sm text-gray-900">{item.product_name || item.product?.name || '-'}</td>
                    <td className="py-2.5 px-3 text-sm text-gray-600">{item.sku || item.product?.sku || '-'}</td>
                    <td className="py-2.5 px-3 text-sm text-gray-700 text-right">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-sm text-gray-700 text-right">{currencyFormat(item.unit_cost)}</td>
                    <td className="py-2.5 px-3 text-sm text-gray-900 font-medium text-right">{currencyFormat(lineTotal)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal:</span>
              <span className="text-gray-900">{currencyFormat(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Discount:</span>
              <span className="text-danger-600">{currencyFormat(discount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax:</span>
              <span className="text-gray-900">{currencyFormat(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-2">
              <span className="text-gray-800">Total Amount:</span>
              <span className="text-primary-700">{currencyFormat(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm pt-1">
              <span className="text-gray-500">Amount Paid:</span>
              <span className="text-green-600 font-medium">{currencyFormat(paidAmount)}</span>
            </div>
            {change > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Change:</span>
                <span className="text-green-600">{currencyFormat(change)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-gray-500">Balance Due:</span>
              <span className={balanceDue > 0 ? 'text-danger-600' : 'text-gray-600'}>
                {currencyFormat(balanceDue > 0 ? balanceDue : 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-gray-200">
              <span className="text-gray-500">Payment Method:</span>
              <span className="text-gray-900 font-medium capitalize">{purchase.payment_method || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment Status:</span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  purchase.payment_status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : purchase.payment_status === 'partial'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {purchase.payment_status || 'unpaid'}
              </span>
            </div>
          </div>
        </div>

        {purchase.notes && (
          <div className="border-t border-gray-200 pt-4 mt-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</h3>
            <p className="text-sm text-gray-700">{purchase.notes}</p>
          </div>
        )}

        <div className="border-t border-gray-300 pt-4 mt-6 text-center text-xs text-gray-400">
          <p>This is a computer-generated invoice.</p>
        </div>
      </div>
    </div>
  )
}
