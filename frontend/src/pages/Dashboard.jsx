import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import api from '../api/axios'

const currencyFormat = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(value ?? 0)

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const [statsRes, lowStockRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/products/low-stock')
      ])
      const data = statsRes.data.data || {}
      data.low_stock_products = lowStockRes.data.data || []
      setStats(data)
    } catch {
      // silent error handling
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60000)
    return () => clearInterval(interval)
  }, [])

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

  const recentSales = stats?.recent_sales ?? []
  const lowStockProducts = stats?.low_stock_products ?? []

  const salesColumns = [
    { key: 'invoice_number', label: 'Invoice #' },
    { key: 'customer_name', label: 'Customer' },
    {
      key: 'total_amount',
      label: 'Amount',
      render: (val) => currencyFormat(val),
    },
    {
      key: 'payment_status',
      label: 'Status',
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
  ]

  const lowStockColumns = [
    { key: 'name', label: 'Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'stock_quantity', label: 'Stock' },
    { key: 'low_stock_threshold', label: 'Threshold' },
    {
      key: 'stock_quantity',
      label: 'Status',
      render: (val, row) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            val === 0
              ? 'bg-red-100 text-red-700'
              : val <= (row.low_stock_threshold || 0)
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {val === 0 ? 'Critical' : val <= (row.low_stock_threshold || 0) ? 'Low' : 'In Stock'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Today's Sales"
          value={currencyFormat(stats?.today_sales_revenue)}
          subtitle="Today's Revenue"
          icon="💰"
          color="green"
        />
        <StatCard
          title="Monthly Revenue"
          value={currencyFormat(stats?.monthly_revenue)}
          subtitle="This Month"
          icon="📈"
          color="blue"
        />
        <StatCard
          title="Monthly Profit"
          value={currencyFormat(stats?.monthly_profit)}
          subtitle="Net Profit"
          icon="📊"
          color="blue"
        />
        <StatCard
          title="Low Stock"
          value={stats?.low_stock_count ?? 0}
          subtitle="Products Need Attention"
          icon="⚠️"
          color="red"
        />
        <StatCard
          title="Total Products"
          value={stats?.total_products ?? 0}
          subtitle="Active Products"
          icon="📱"
          color="blue"
        />
        <StatCard
          title="Total Customers"
          value={stats?.total_customers ?? 0}
          subtitle="Registered Customers"
          icon="👥"
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Sales Last 7 Days</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={stats?.sales_last_7_days ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={(val) => dayjs(val).format('DD MMM')} stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                labelFormatter={(val) => dayjs(val).format('DD MMM YYYY')}
                formatter={(value) => [currencyFormat(value), 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Recent Sales</h2>
          <DataTable columns={salesColumns} data={recentSales.slice(0, 5)} emptyMessage="No recent sales" />
        </div>
      </div>

      <div>
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Low Stock Products</h2>
        <DataTable columns={lowStockColumns} data={lowStockProducts} emptyMessage="No low stock products" />
      </div>
    </div>
  )
}
