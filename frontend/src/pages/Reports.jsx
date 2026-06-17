import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import dayjs from 'dayjs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import StatCard from '../components/StatCard'
import PermissionGuard from '../components/PermissionGuard'
import api from '../api/axios'
import useReports from '../hooks/useReports'

const currencyFormat = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value ?? 0)

const numberFormat = (value) =>
  new Intl.NumberFormat('en-PK').format(value ?? 0)

const tabs = [
  { key: 'sales', label: 'Sales Summary' },
  { key: 'purchases', label: 'Purchase Summary' },
  { key: 'pnl', label: 'Profit & Loss' },
  { key: 'top_products', label: 'Top Products' },
  { key: 'valuation', label: 'Stock Valuation' },
  { key: 'customer', label: 'Customer Report' },
]

const inputClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition'
const selectClass = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-white'

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales')
  const { loading, fetchReport, exportReport } = useReports()

  // Date range shared state
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'))

  // Tab data states
  const [salesSummary, setSalesSummary] = useState(null)
  const [purchaseSummary, setPurchaseSummary] = useState(null)
  const [profitLoss, setProfitLoss] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [stockValuation, setStockValuation] = useState([])
  const [customerReport, setCustomerReport] = useState(null)
  const [customers, setCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const customerRef = useRef(null)

  // Fetch customers for dropdown
  useEffect(() => {
    api.get('/customers', { params: { per_page: 500 } }).then((res) => {
      if (res.data.success) setCustomers(res.data.data.customers || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (customerRef.current && !customerRef.current.contains(e.target)) {
        setCustomerDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
  )

  const fetchSalesSummary = async () => {
    const data = await fetchReport('/reports/sales-summary', { start_date: startDate, end_date: endDate })
    if (data) setSalesSummary(data)
  }

  const fetchPurchaseSummary = async () => {
    const data = await fetchReport('/reports/purchase-summary', { start_date: startDate, end_date: endDate })
    if (data) setPurchaseSummary(data)
  }

  const fetchProfitLoss = async () => {
    const data = await fetchReport('/reports/profit-loss', { start_date: startDate, end_date: endDate })
    if (data) setProfitLoss(data)
  }

  const fetchTopProducts = async () => {
    const data = await fetchReport('/reports/top-products', { start_date: startDate, end_date: endDate, limit: 10 })
    if (data) setTopProducts(data)
  }

  const fetchStockValuation = async () => {
    const data = await fetchReport('/reports/stock-valuation')
    if (data) setStockValuation(data)
  }

  const fetchCustomerReport = async () => {
    if (!selectedCustomer) {
      toast.error('Please select a customer')
      return
    }
    const data = await fetchReport('/reports/customer-report', { customer_id: selectedCustomer.id })
    if (data) setCustomerReport(data)
  }

  const handleGenerateReport = () => {
    switch (activeTab) {
      case 'sales': fetchSalesSummary(); break
      case 'purchases': fetchPurchaseSummary(); break
      case 'pnl': fetchProfitLoss(); break
      case 'top_products': fetchTopProducts(); break
      case 'valuation': fetchStockValuation(); break
      case 'customer': fetchCustomerReport(); break
    }
  }

  const handleExport = async () => {
    const exportEndpoints = {
      sales: '/reports/sales-summary/export',
      purchases: '/reports/purchase-summary/export',
      pnl: '/reports/profit-loss/export',
      top_products: '/reports/top-products/export',
      valuation: '/reports/stock-valuation/export',
      customer: '/reports/customer-report/export',
    }
    const endpoint = exportEndpoints[activeTab]
    const params = { format: 'xlsx' }
    if (activeTab !== 'valuation') {
      params.start_date = startDate
      params.end_date = endDate
    }
    if (activeTab === 'customer' && selectedCustomer) {
      params.customer_id = selectedCustomer.id
    }
    await exportReport(endpoint, params)
  }

  const requiresDateRange = !['valuation', 'customer'].includes(activeTab)

  const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
          {payload.map((entry, idx) => (
            <p key={idx} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {currencyFormat(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-150 ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {requiresDateRange && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </>
        )}
        {activeTab === 'customer' && (
          <div className="relative min-w-[250px]" ref={customerRef}>
            <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value)
                setCustomerDropdownOpen(true)
              }}
              onFocus={() => setCustomerDropdownOpen(true)}
              placeholder="Search customer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            />
            {customerDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.length ? (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c)
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
        )}
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg text-sm transition-colors duration-150 shadow-sm"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
        <PermissionGuard roles={['admin', 'manager']}>
          <button
            onClick={handleExport}
            className="px-5 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg text-sm transition-colors duration-150 shadow-sm"
          >
            Export to Excel
          </button>
        </PermissionGuard>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {!loading && activeTab === 'sales' && salesSummary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard title="Total Sales" value={numberFormat(salesSummary.total_sales)} icon="📋" color="blue" />
            <StatCard title="Total Revenue" value={currencyFormat(salesSummary.total_revenue)} icon="💰" color="green" />
            <StatCard title="Total Discount" value={currencyFormat(salesSummary.total_discount)} icon="🏷️" color="yellow" />
            <StatCard title="Tax Collected" value={currencyFormat(salesSummary.tax_collected)} icon="🧾" color="blue" />
            <StatCard title="Profit" value={currencyFormat(salesSummary.profit)} icon="📈" color="green" />
            <StatCard title="Items Sold" value={numberFormat(salesSummary.items_sold)} icon="📦" color="blue" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Profit vs Discount</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={salesSummary.chart_data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="discount" name="Discount" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && activeTab === 'purchases' && purchaseSummary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard title="Total Purchases" value={numberFormat(purchaseSummary.total_purchases)} icon="📋" color="blue" />
            <StatCard title="Total Spent" value={currencyFormat(purchaseSummary.total_spent)} icon="💸" color="red" />
          </div>
        </div>
      )}

      {!loading && activeTab === 'pnl' && profitLoss && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard title="Revenue" value={currencyFormat(profitLoss.revenue)} icon="💰" color="green" />
            <StatCard title="COGS" value={currencyFormat(profitLoss.cogs)} icon="📦" color="red" />
            <StatCard title="Gross Profit" value={currencyFormat(profitLoss.gross_profit)} icon="📈" color={profitLoss.gross_profit >= 0 ? 'green' : 'red'} />
            <StatCard title="Expenses" value={currencyFormat(profitLoss.expenses)} icon="💸" color="yellow" />
            <StatCard title="Net Profit" value={currencyFormat(profitLoss.net_profit)} icon="📊" color={profitLoss.net_profit >= 0 ? 'green' : 'red'} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue, Expenses & Net Profit Trend</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={profitLoss.chart_data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#eab308" radius={[4, 4, 0, 0]} />
                <Bar dataKey="net_profit" name="Net Profit" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && activeTab === 'top_products' && topProducts.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Revenue</h2>
            <ResponsiveContainer width="100%" height={Math.max(300, topProducts.length * 50)}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 120, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis type="category" dataKey="product_name" stroke="#9ca3af" fontSize={12} width={110} />
                <Tooltip formatter={(value) => [currencyFormat(value), 'Revenue']} />
                <Legend />
                <Bar dataKey="total_revenue" name="Revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Sold</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topProducts.map((product, idx) => (
                  <tr key={product.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.product_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{product.sku || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{numberFormat(product.quantity_sold)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">{currencyFormat(product.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'valuation' && stockValuation.length > 0 && (
        <div className="space-y-6">
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stockValuation.map((item, idx) => (
                  <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.sku || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{numberFormat(item.stock_qty)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">{currencyFormat(item.purchase_price)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">{currencyFormat(item.total_value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">Total Stock Value:</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600 text-right">
                    {currencyFormat(stockValuation.reduce((sum, item) => sum + (parseFloat(item.total_value) || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!loading && activeTab === 'customer' && customerReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-gray-50 rounded-xl border border-gray-200">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">Name</span>
              <p className="text-sm font-medium text-gray-900">{customerReport.customer?.name || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">Phone</span>
              <p className="text-sm font-medium text-gray-900">{customerReport.customer?.phone || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">Email</span>
              <p className="text-sm font-medium text-gray-900">{customerReport.customer?.email || '-'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">City</span>
              <p className="text-sm font-medium text-gray-900">{customerReport.customer?.city || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total Spent" value={currencyFormat(customerReport.total_spent)} icon="💰" color="green" />
            <StatCard title="Loyalty Points" value={numberFormat(customerReport.loyalty_points)} icon="⭐" color="yellow" />
            <StatCard title="Total Purchases" value={numberFormat(customerReport.total_purchases)} icon="📋" color="blue" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Purchase History</h2>
            {(customerReport.purchases || []).length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500 bg-white rounded-xl border border-gray-200">No purchase history found</div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(customerReport.purchases || []).map((p, idx) => (
                      <tr key={p.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.invoice_no || p.invoice_number || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {p.sale_date ? dayjs(p.sale_date).format('DD MMM YYYY') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-right">{currencyFormat(p.total_amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            p.payment_status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : p.payment_status === 'partial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {p.payment_status || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Warranties</h2>
            {(customerReport.warranties || []).length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500 bg-white rounded-xl border border-gray-200">No warranties found</div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(customerReport.warranties || []).map((w, idx) => {
                      const isActive = dayjs().isBefore(dayjs(w.end_date))
                      return (
                        <tr key={w.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{w.product_name || w.product || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {isActive ? 'Active' : 'Expired'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {w.end_date ? dayjs(w.end_date).format('DD MMM YYYY') : '-'}
                          </td>
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

      {!loading && activeTab === 'top_products' && topProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          No top products data found for the selected date range.
        </div>
      )}

      {!loading && activeTab === 'valuation' && stockValuation.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          No stock valuation data available.
        </div>
      )}
    </div>
  )
}
