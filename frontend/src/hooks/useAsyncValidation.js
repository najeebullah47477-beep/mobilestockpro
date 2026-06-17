import { useState, useCallback, useRef } from 'react'
import api from '../api/axios'

export const useAsyncValidation = () => {
  const [loading, setLoading] = useState({})
  const [results, setResults] = useState({})
  const timers = useRef({})

  const cancelPending = (key) => {
    if (timers.current[key]) {
      clearTimeout(timers.current[key])
      delete timers.current[key]
    }
  }

  const checkAvailability = useCallback(async (endpoint, params, key) => {
    cancelPending(key)

    return new Promise((resolve) => {
      timers.current[key] = setTimeout(async () => {
        setLoading((prev) => ({ ...prev, [key]: true }))
        try {
          const res = await api.get(endpoint, { params })
          const available = res.data?.available ?? true
          setResults((prev) => ({ ...prev, [key]: { available, checked: true } }))
          resolve(available)
        } catch {
          setResults((prev) => ({ ...prev, [key]: { available: false, checked: true, error: true } }))
          resolve(false)
        } finally {
          setLoading((prev) => ({ ...prev, [key]: false }))
        }
      }, 500)
    })
  }, [])

  const resetResult = useCallback((key) => {
    cancelPending(key)
    setResults((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  return { loading, results, checkAvailability, resetResult }
}
