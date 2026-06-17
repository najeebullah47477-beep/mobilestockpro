import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('msp_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('msp_token')
      localStorage.removeItem('msp_user')
      window.location.href = '/login'
    }
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.')
    }
    return Promise.reject(error)
  }
)

export default api
