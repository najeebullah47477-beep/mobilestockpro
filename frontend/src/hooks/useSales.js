import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function useSales(filters = {}) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ total_pages: 1, total_items: 0, current_page: 1 })

  const fetchSales = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = { ...filters, page, per_page: 20 }
      const res = await api.get('/sales', { params })
      if (res.data.success) {
        setSales(res.data.data.sales)
        setPagination({
          total_pages: res.data.data.total_pages,
          total_items: res.data.data.total_items,
          current_page: res.data.data.current_page,
        })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch sales')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchSales(1)
  }, [fetchSales])

  return { sales, loading, pagination, refetch: fetchSales }
}
