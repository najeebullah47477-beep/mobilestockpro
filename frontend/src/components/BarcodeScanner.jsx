import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

const SCANNER_ID = 'barcode-scanner-element'

export default function BarcodeScanner({ isOpen, onClose, onScanSuccess }) {
  const scannerRef = useRef(null)
  const mountedRef = useRef(false)
  const startingRef = useRef(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [rawError, setRawError] = useState('')
  const [manualValue, setManualValue] = useState('')

  const stopScanner = useCallback(async () => {
    startingRef.current = false
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (err) {
        console.warn('[BarcodeScanner] stop error:', err)
      }
      scannerRef.current = null
    }
  }, [])

  const startScanner = useCallback(async () => {
    if (startingRef.current) return
    startingRef.current = true

    setStatus('requesting')
    setError('')
    setRawError('')

    try {
      const el = document.getElementById(SCANNER_ID)
      if (!el) {
        throw new Error(`Scanner element #${SCANNER_ID} not found in DOM`)
      }

      if (scannerRef.current) {
        await scannerRef.current.stop()
        scannerRef.current = null
      }

      const scanner = new Html5Qrcode(SCANNER_ID)
      scannerRef.current = scanner

      const facingModes = ['environment', 'user']
      let started = false
      let lastErr = null

      for (const facingMode of facingModes) {
        if (!startingRef.current) return
        try {
          await scanner.start(
            { facingMode },
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.777,
            },
            (decodedText) => {
              if (!mountedRef.current) return
              onScanSuccess(decodedText)
              stopScanner()
              onClose()
            },
            (errMessage) => {
              console.warn('[BarcodeScanner] scan error:', errMessage)
            }
          )
          started = true
          break
        } catch (err) {
          lastErr = err
          console.warn(`[BarcodeScanner] failed with facingMode "${facingMode}":`, err)
        }
      }

      if (!startingRef.current) return

      if (started) {
        setStatus('scanning')
      } else {
        throw lastErr || new Error('No camera could be started')
      }
    } catch (err) {
      console.error('[BarcodeScanner] start failed:', err)
      const errStr = err?.toString() || String(err)
      const errMsg = err?.message || errStr

      if (errStr.includes('NotAllowedError') || /permission/i.test(errStr)) {
        setError('Camera permission denied. You can enter the code manually below.')
      } else if (errStr.includes('NotFoundError')) {
        setError('No camera found on this device. Enter the code manually below.')
      } else if (errStr.includes('NotReadableError')) {
        setError('Camera is in use by another app. Close other apps using the camera and try again.')
      } else {
        setError(`Camera error: ${errMsg}. Enter the code manually below.`)
      }
      setRawError(errStr)
      setStatus('error')
    } finally {
      startingRef.current = false
    }
  }, [onScanSuccess, stopScanner, onClose])

  useEffect(() => {
    mountedRef.current = true
    let timerId

    if (isOpen) {
      const rafId = requestAnimationFrame(() => {
        timerId = setTimeout(() => startScanner(), 100)
      })
      return () => {
        cancelAnimationFrame(rafId)
        clearTimeout(timerId)
        stopScanner()
        mountedRef.current = false
      }
    } else {
      stopScanner()
      setStatus('idle')
      setError('')
      setRawError('')
      setManualValue('')
    }

    return () => {
      mountedRef.current = false
    }
  }, [isOpen, startScanner, stopScanner])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const trimmed = manualValue.trim()
    if (trimmed) {
      onScanSuccess(trimmed)
      setManualValue('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-200" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl transform transition-all duration-200 opacity-100 scale-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Scan Barcode / QR</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none transition-colors duration-150"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
            <div id={SCANNER_ID} className="w-full" style={{ minHeight: '300px' }} />
            {status === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-900">
                <svg className="animate-spin h-8 w-8 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Requesting camera access...</span>
              </div>
            )}
            {status === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-900">
                <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-sm text-gray-500">Camera unavailable</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <p className="font-medium mb-1">Camera Issue</p>
              <p>{error}</p>
              {rawError && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-yellow-600 hover:text-yellow-700">Technical details</summary>
                  <pre className="mt-1 text-xs text-yellow-700 bg-yellow-100 p-2 rounded overflow-auto max-h-20">{rawError}</pre>
                </details>
              )}
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Or enter code manually
              </label>
              <input
                type="text"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                placeholder="Type barcode, QR, or IMEI code..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!manualValue.trim()}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
              >
                Submit Code
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
