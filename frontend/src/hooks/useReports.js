import { useState } from 'react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function useReports() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  const fetchReport = async (endpoint, params = {}) => {
    setLoading(true)
    try {
      const res = await api.get(endpoint, { params })
      if (res.data.success) {
        setData(res.data.data)
        return res.data.data
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch report')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (endpoint, params = {}) => {
    try {
      const res = await api.get(endpoint, { params, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${endpoint.replace('/', '_')}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Export downloaded successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export report')
    }
  }

  return { data, loading, fetchReport, exportReport }
}
